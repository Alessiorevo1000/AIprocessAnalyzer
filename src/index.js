#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { analyzeSystem } from './analyzer.js';
import { generateReport, generateJsonReport, generateHtmlReport, generateMarkdownReport } from './reporter.js';
import { getRunningProcesses, generateProcessSummary } from './processReader.js';
import { analyzeUserProfile, categorizeUnknownProcesses, generateCategorizationReport } from './ollamaAnalyzer.js';
import { loadConfig, getConfig, CONFIG_DEFAULTS } from './config.js';
import { NetworkAnalyzer } from './networkAnalyzer.js';
import { exec } from 'child_process';

const program = new Command();

program
  .name('pc-analyzer')
  .description('🖥️  PC Configuration Analyzer - Analizza il tuo sistema e profilo utente')
  .version('2.0.0')
  .option('-v, --verbose', 'Mostra output dettagliato durante l\'analisi')
  .option('-j, --json', 'Output in formato JSON')
  .option('--html', 'Genera report HTML')
  .option('--markdown', 'Genera report Markdown')
  .option('-o, --output <file>', 'Salva il report in un file specifico')
  .option('--console', 'Mostra il report anche in console (oltre al salvataggio)')
  .option('--no-llm', 'Salta l\'analisi LLM (più veloce)')
  .option('--no-network', 'Salta l\'analisi di rete')
  .option('--max-iterations <n>', 'Numero massimo iterazioni LLM', '5')
  .option('--model <name>', 'Modello Ollama da usare', 'gemma2:9b')
  .option('--ollama-url <url>', 'URL del server Ollama', 'http://localhost:11434')
  .option('-c, --config <file>', 'File di configurazione personalizzato')
  .option('--init-config', 'Crea file di configurazione di esempio')
  .option('--category <cat>', 'Analizza solo una categoria specifica (cpu, memory, graphics, storage, os, processes)')
  .option('--top <n>', 'Mostra solo i top N processi', '20')
  .option('--quiet', 'Output minimale')
  .option('--no-color', 'Disabilita output colorato');

program.parse();

const options = program.opts();

// Handle no-color option
if (options.color === false) {
  chalk.level = 0;
}

async function main() {
  try {
    // Handle init-config
    if (options.initConfig) {
      await createDefaultConfig();
      return;
    }

    // Load configuration
    if (options.config) {
      await loadConfig(options.config);
    } else {
      await loadConfig();
    }

    const config = getConfig();
    
    // Merge CLI options with config
    const settings = {
      verbose: options.verbose || config.verbose,
      json: options.json,
      html: options.html,
      markdown: options.markdown,
      output: options.output,
      console: options.console,
      useLlm: options.llm !== false && config.useLlm,
      useNetwork: options.network !== false && config.analyzeNetwork,
      maxIterations: parseInt(options.maxIterations) || config.maxLlmIterations,
      model: options.model || config.ollamaModel,
      ollamaUrl: options.ollamaUrl || config.ollamaUrl,
      category: options.category,
      top: parseInt(options.top) || 20,
      quiet: options.quiet,
      autoOpen: config.autoOpen !== false
    };

    if (!settings.quiet) {
      console.log(chalk.bold.cyan('\n🖥️  PC Configuration Analyzer v2.0.0'));
      console.log(chalk.cyan('━'.repeat(50)));
    }

    // Collect system info
    if (settings.verbose) console.log(chalk.dim('📊 Raccolta informazioni sistema...'));
    const systemInfo = await analyzeSystem();
    
    // Handle single category analysis
    if (settings.category) {
      await analyzeSingleCategory(settings.category, systemInfo, settings);
      return;
    }

    // Full analysis
    if (settings.verbose) console.log(chalk.dim('🔄 Lettura processi in esecuzione...'));
    const processes = await getRunningProcesses();
    
    // Process categorization
    let processSummary = generateProcessSummary(processes);
    let allLlmCategorizations = {};
    let allLlmDetails = {};
    
    // LLM Analysis
    if (settings.useLlm) {
      const result = await runLlmAnalysis(processes, processSummary, settings);
      allLlmCategorizations = result.categorizations;
      allLlmDetails = result.details;
      processSummary = generateProcessSummary(processes, allLlmCategorizations);
    }

    // Network Analysis
    let networkInfo = null;
    if (settings.useNetwork) {
      if (settings.verbose) console.log(chalk.dim('🌐 Analisi connessioni di rete...'));
      const networkAnalyzer = new NetworkAnalyzer();
      networkInfo = await networkAnalyzer.analyze();
    }

    // User Profile Analysis
    let userProfile = null;
    if (settings.useLlm) {
      if (!settings.quiet) console.log(chalk.dim('🤖 Analisi profilo utente con Ollama...'));
      userProfile = await analyzeUserProfile(processSummary, systemInfo);
    }

    // Store processes in summary for report
    processSummary.processes = processes.processes;

    // Generate and output report
    await generateOutput(systemInfo, processSummary, userProfile, networkInfo, allLlmDetails, settings);

  } catch (error) {
    console.error(chalk.red(`\n❌ Errore: ${error.message}`));
    if (options.verbose) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }
}

async function runLlmAnalysis(processes, initialSummary, settings) {
  let allLlmCategorizations = {};
  let allLlmDetails = {};
  let processSummary = initialSummary;
  let iteration = 1;

  while (iteration <= settings.maxIterations) {
    const otherProcesses = processSummary.categories.other?.processes || [];
    const otherCount = otherProcesses.length;
    
    if (!settings.quiet) {
      console.log(chalk.dim(`\n🔍 Iterazione ${iteration}: ${otherCount} processi in "other"`));
    }
    
    if (otherCount <= 10) {
      if (!settings.quiet) {
        console.log(chalk.green(`✓ Obiettivo raggiunto: ${otherCount} processi rimanenti in "other"`));
      }
      break;
    }
    
    if (settings.verbose) {
      console.log(chalk.dim(`   Analisi di ${Math.min(30, otherCount)} processi con LLM...`));
    }
    
    const allProcesses = processes.processes || [];
    const unknownProcessObjs = allProcesses.filter(p => otherProcesses.includes(p.name));
    const llmResult = await categorizeUnknownProcesses(unknownProcessObjs);
    
    const newCategorizations = llmResult.categorizations || {};
    const newDetails = llmResult.details || {};
    
    const categorizedCount = Object.keys(newCategorizations).length;
    
    if (categorizedCount === 0) {
      if (!settings.quiet) {
        console.log(chalk.yellow(`⚠️  Nessun nuovo processo categorizzato`));
      }
      break;
    }
    
    if (!settings.quiet) {
      console.log(chalk.green(`   ✓ Categorizzati ${categorizedCount} processi`));
    }
    
    allLlmCategorizations = { ...allLlmCategorizations, ...newCategorizations };
    allLlmDetails = { ...allLlmDetails, ...newDetails };
    processSummary = generateProcessSummary(processes, allLlmCategorizations);
    
    iteration++;
  }

  return { categorizations: allLlmCategorizations, details: allLlmDetails };
}

async function analyzeSingleCategory(category, systemInfo, settings) {
  const validCategories = ['cpu', 'memory', 'graphics', 'storage', 'os', 'processes'];
  
  if (!validCategories.includes(category.toLowerCase())) {
    console.error(chalk.red(`❌ Categoria non valida: ${category}`));
    console.log(chalk.dim(`Categorie disponibili: ${validCategories.join(', ')}`));
    process.exit(1);
  }

  let categoryData = {};
  
  switch (category.toLowerCase()) {
    case 'cpu':
      categoryData = { cpu: systemInfo.cpu };
      break;
    case 'memory':
      categoryData = { memory: systemInfo.memory };
      break;
    case 'graphics':
      categoryData = { graphics: systemInfo.graphics };
      break;
    case 'storage':
      categoryData = { storage: systemInfo.storage };
      break;
    case 'os':
      categoryData = { os: systemInfo.os };
      break;
    case 'processes':
      const processes = await getRunningProcesses();
      categoryData = { 
        processes: processes.processes.slice(0, settings.top),
        stats: processes.stats 
      };
      break;
  }

  // Crea un report data per questo specifico elemento
  const reportData = {
    systemInfo: categoryData,
    category: category,
    timestamp: new Date().toISOString()
  };

  // Genera timestamp per nomi file univoci
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  let output;
  let extension = '.txt';

  if (settings.json) {
    output = JSON.stringify(categoryData, null, 2);
    extension = '.json';
  } else if (settings.html) {
    output = generateCategoryHtmlReport(category, categoryData);
    extension = '.html';
  } else if (settings.markdown) {
    output = generateCategoryMarkdownReport(category, categoryData);
    extension = '.md';
  } else {
    // Default: JSON output anche per il testo
    output = JSON.stringify(categoryData, null, 2);
    extension = '.json';
  }

  // Salva automaticamente il file
  const filename = settings.output 
    ? (settings.output.endsWith(extension) ? settings.output : settings.output + extension)
    : `${category}-analysis-${timestamp}${extension}`;

  fs.writeFileSync(filename, output, 'utf8');
  console.log(chalk.green(`✓ Report ${category} salvato in: ${filename}`));

  // Apri automaticamente se è HTML
  if (extension === '.html' && settings.autoOpen) {
    exec(`start "" "${filename}"`, (error) => {
      if (!error) {
        console.log(chalk.cyan(`🌐 Apertura del report HTML nel browser...`));
      }
    });
  }

  // Mostra anche su console se richiesto
  if (settings.console || (!settings.json && !settings.html && !settings.markdown)) {
    console.log(chalk.bold.cyan(`\n📊 ${category.toUpperCase()} Info:\n`));
    if (settings.json || extension === '.json') {
      console.log(output);
    } else {
      console.log(JSON.stringify(categoryData, null, 2));
    }
  }
}

function generateCategoryHtmlReport(category, data) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PC Analyzer - ${category.toUpperCase()} Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; margin-bottom: 20px; }
        .category-section { margin: 20px 0; }
        .json-output { background: #f8f8f8; padding: 15px; border-radius: 5px; border-left: 4px solid #007acc; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 13px; overflow-x: auto; }
        .timestamp { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖥️ PC Configuration Analyzer</h1>
            <h2>📊 ${category.toUpperCase()} Report</h2>
        </div>
        
        <div class="category-section">
            <div class="json-output">${JSON.stringify(data, null, 2)}</div>
        </div>
        
        <div class="timestamp">
            Report generato il ${new Date().toLocaleString('it-IT')}
        </div>
    </div>
</body>
</html>`;
}

function generateCategoryMarkdownReport(category, data) {
  return `# PC Configuration Analyzer - ${category.toUpperCase()} Report

## 📊 ${category.toUpperCase()} Information

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

---
*Report generato il ${new Date().toLocaleString('it-IT')}*
`;
}

async function generateOutput(systemInfo, processSummary, userProfile, networkInfo, llmDetails, settings) {
  const reportData = {
    systemInfo,
    processSummary,
    userProfile,
    networkInfo,
    timestamp: new Date().toISOString()
  };

  let output;
  let extension = '.txt';

  if (settings.json) {
    output = generateJsonReport(reportData);
    extension = '.json';
  } else if (settings.html) {
    output = generateHtmlReport(reportData);
    extension = '.html';
  } else if (settings.markdown) {
    output = generateMarkdownReport(reportData);
    extension = '.md';
  } else {
    // Default text report
    output = generateReport(systemInfo, processSummary, userProfile, networkInfo);
    
    // Also generate detailed categorization report
    if (processSummary?.categories) {
      const processesWithCategories = (processSummary.processes || []).map(p => {
        let category = 'other';
        for (const [cat, data] of Object.entries(processSummary.categories)) {
          if (data.processes?.includes(p.name)) {
            category = cat;
            break;
          }
        }
        return { ...p, category };
      });
      
      const detailedReport = generateCategorizationReport(
        processesWithCategories,
        llmDetails,
        processSummary.categories
      );
      
      const detailedReportPath = path.join(process.cwd(), `process-categorization-${timestamp}.txt`);
      fs.writeFileSync(detailedReportPath, detailedReport, 'utf8');
      if (!settings.quiet) {
        console.log(chalk.green(`\n✓ Report dettagliato salvato in: ${detailedReportPath}`));
        console.log(chalk.dim(`   Apri il file per visualizzare l'analisi completa dei processi`));
      }
    }
  }

  // Genera timestamp per nomi file univoci
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  // Output to file or console
  if (settings.output) {
    const outputPath = settings.output.endsWith(extension) 
      ? settings.output 
      : settings.output + extension;
    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(chalk.green(`✓ Report salvato in: ${outputPath}`));
    
    // Apri automaticamente il file se è HTML
    if (extension === '.html') {
      exec(`start "" "${outputPath}"`, (error) => {
        if (!error && settings.autoOpen) {
          console.log(chalk.cyan(`🌐 Apertura del report HTML nel browser...`));
        }
      });
    }
  } else {
    // Salva automaticamente con timestamp se nessun output specificato
    const autoFilename = `pc-analysis-${timestamp}${extension}`;
    
    if (settings.json || settings.html || settings.markdown) {
      fs.writeFileSync(autoFilename, output, 'utf8');
      console.log(chalk.green(`✓ Report salvato automaticamente in: ${autoFilename}`));
      
      // Apri automaticamente se è HTML
      if (extension === '.html') {
        exec(`start "" "${autoFilename}"`, (error) => {
          if (!error && settings.autoOpen) {
            console.log(chalk.cyan(`🌐 Apertura del report HTML nel browser...`));
          }
        });
      }
      
      // Mostra anche su console se richiesto
      if (settings.console) {
        console.log('\n' + output);
      }
    } else {
      // Report di testo: salva e mostra
      fs.writeFileSync(autoFilename, output, 'utf8');
      console.log(chalk.green(`✓ Report salvato automaticamente in: ${autoFilename}`));
      console.log(output);
    }
  }
}

async function createDefaultConfig() {
  const configPath = path.join(process.cwd(), 'pc-analyzer.config.json');
  
  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow(`⚠️  Il file ${configPath} esiste già`));
    return;
  }

  fs.writeFileSync(configPath, JSON.stringify(CONFIG_DEFAULTS, null, 2), 'utf8');
  console.log(chalk.green(`✓ File di configurazione creato: ${configPath}`));
  console.log(chalk.dim('Modifica il file per personalizzare l\'analisi'));
}

main();