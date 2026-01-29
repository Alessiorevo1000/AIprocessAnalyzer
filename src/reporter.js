import chalk from 'chalk';
import { table } from 'table';
import { MisconfigurationDetector } from './detector.js';
import { translateProfile, translateTechnicalLevel } from './ollamaAnalyzer.js';

const detector = new MisconfigurationDetector();

export function generateReport(systemInfo, processSummary = null, userProfile = null, networkInfo = null) {
  const issues = detector.detectIssues(systemInfo);
  const summary = generateSummary(issues);
  
  let report = '\n';
  
  report += chalk.bold.blue('System Summary\n');
  report += chalk.blue('===============\n');
  report += generateSystemSummary(systemInfo);
  
  // Aggiungi sezione profilo utente se disponibile
  if (userProfile && processSummary) {
    report += '\n' + chalk.bold.magenta('👤 User Profile Analysis\n');
    report += chalk.magenta('========================\n');
    report += generateUserProfileReport(userProfile, processSummary);
  }
  
  // Aggiungi sezione network se disponibile
  if (networkInfo) {
    report += '\n' + chalk.bold.cyan('🌐 Network Analysis\n');
    report += chalk.cyan('===================\n');
    report += generateNetworkReport(networkInfo);
  }
  
  report += '\n' + chalk.bold('Configuration Issues\n');
  report += chalk('======================\n');
  report += generateIssuesReport(issues);
  
  report += '\n' + chalk.bold.green('Overall Assessment\n');
  report += chalk.green('==================\n');
  report += summary;
  
  return report;
}

/**
 * Generate JSON report
 */
export function generateJsonReport(data) {
  const result = {
    version: '2.0.0',
    timestamp: data.timestamp || new Date().toISOString(),
    system: data.systemInfo,
    processes: data.processSummary,
    userProfile: data.userProfile,
    network: data.networkInfo,
    issues: data.systemInfo ? detector.detectIssues(data.systemInfo) : []
  };

  // Aggiungi informazioni dettagliate sui processi "other"
  if (data.processSummary?.categories?.other?.processes?.length > 0) {
    result.uncategorizedProcesses = {
      count: data.processSummary.categories.other.processes.length,
      reasons: [
        "Unknown or custom software not in our database",
        "System processes with generic names (svchost.exe, etc.)",
        "Insufficient information for AI categorization",
        "Rare or specialized software"
      ],
      processList: data.processSummary.categories.other.processes.map(pName => {
        const proc = (data.systemInfo?.processes || data.processSummary.processes || [])
          .find(p => p.name === pName);
        return {
          name: pName,
          cpu: proc?.cpu || 0,
          memory: proc?.memPercentage || proc?.mem || 0,
          pid: proc?.pid || null,
          path: proc?.path || null
        };
      })
    };
  }

  return JSON.stringify(result, null, 2);
}

/**
 * Generate HTML report
 */
export function generateHtmlReport(data) {
  const { systemInfo, processSummary, userProfile, networkInfo } = data;
  
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PC Configuration Report</title>
  <style>
    :root {
      --primary: #3b82f6;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --dark: #1e293b;
      --light: #f8fafc;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--light);
      color: var(--dark);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: var(--primary); margin-bottom: 1rem; }
    h2 { color: var(--dark); margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--primary); }
    .card {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
    .stat { text-align: center; padding: 1rem; }
    .stat-value { font-size: 2rem; font-weight: bold; color: var(--primary); }
    .stat-label { color: #64748b; font-size: 0.875rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: var(--dark); color: white; }
    tr:hover { background: #f1f5f9; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .progress-bar {
      background: #e2e8f0;
      border-radius: 9999px;
      height: 8px;
      overflow: hidden;
    }
    .progress-fill {
      background: var(--primary);
      height: 100%;
      transition: width 0.3s;
    }
    .timestamp { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🖥️ PC Configuration Report</h1>
    <p class="timestamp">Generated: ${data.timestamp || new Date().toISOString()}</p>
    
    <h2>💻 System Information</h2>
    <div class="grid">
      <div class="card">
        <div class="stat">
          <div class="stat-value">${systemInfo?.cpu?.cores || 'N/A'}</div>
          <div class="stat-label">CPU Cores</div>
        </div>
        <p><strong>CPU:</strong> ${systemInfo?.cpu?.manufacturer || ''} ${systemInfo?.cpu?.brand || 'N/A'}</p>
        <p><strong>Speed:</strong> ${systemInfo?.cpu?.speed || 'N/A'} GHz</p>
      </div>
      <div class="card">
        <div class="stat">
          <div class="stat-value">${systemInfo?.memory?.total ? Math.round(systemInfo.memory.total / (1024**3)) : 'N/A'}</div>
          <div class="stat-label">GB RAM</div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${systemInfo?.memory ? ((systemInfo.memory.used / systemInfo.memory.total) * 100).toFixed(0) : 0}%"></div>
        </div>
        <p>Used: ${systemInfo?.memory ? ((systemInfo.memory.used / systemInfo.memory.total) * 100).toFixed(1) : 0}%</p>
      </div>
      <div class="card">
        <div class="stat">
          <div class="stat-value">${systemInfo?.graphics?.controllers?.[0]?.model || 'N/A'}</div>
          <div class="stat-label">GPU</div>
        </div>
        <p><strong>VRAM:</strong> ${systemInfo?.graphics?.controllers?.[0]?.vram || 'N/A'} MB</p>
      </div>
    </div>
    
    ${userProfile ? `
    <h2>👤 User Profile</h2>
    <div class="card">
      <h3>${translateProfile(userProfile.profile)}</h3>
      <p><strong>Technical Level:</strong> ${translateTechnicalLevel(userProfile.technicalLevel || 'intermediate')}</p>
      <p><strong>Confidence:</strong> ${userProfile.confidence || 0}%</p>
      <div class="progress-bar" style="margin: 0.5rem 0;">
        <div class="progress-fill" style="width: ${userProfile.confidence || 0}%; background: ${(userProfile.confidence || 0) >= 80 ? 'var(--success)' : (userProfile.confidence || 0) >= 60 ? 'var(--warning)' : 'var(--danger)'}"></div>
      </div>
      <p>${userProfile.description || ''}</p>
    </div>
    ` : ''}
    
    ${processSummary ? `
    <h2>📊 Process Categories</h2>
    <div class="card">
      <table>
        <thead>
          <tr><th>Category</th><th>Count</th><th>CPU %</th><th>Memory %</th></tr>
        </thead>
        <tbody>
          ${Object.entries(processSummary.categories || {})
            .filter(([_, data]) => data.count > 0)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([cat, data]) => `
              <tr>
                <td>${getCategoryIcon(cat)} ${cat}</td>
                <td>${data.count}</td>
                <td>${data.totalCpu || 0}</td>
                <td>${data.totalMem || 0}</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    ${networkInfo ? `
    <h2>🌐 Network</h2>
    <div class="card">
      <div class="grid">
        <div class="stat">
          <div class="stat-value">${networkInfo.summary?.totalConnections || 0}</div>
          <div class="stat-label">Total Connections</div>
        </div>
        <div class="stat">
          <div class="stat-value">${networkInfo.summary?.listeningPorts || 0}</div>
          <div class="stat-label">Listening Ports</div>
        </div>
        <div class="stat">
          <div class="stat-value">${networkInfo.summary?.establishedConnections || 0}</div>
          <div class="stat-label">Established</div>
        </div>
      </div>
      ${networkInfo.securityAnalysis?.riskLevel === 'elevated' ? 
        `<div class="badge badge-warning">⚠️ Elevated Risk Level</div>` : 
        `<div class="badge badge-success">✓ Normal Risk Level</div>`}
    </div>
    ` : ''}
    
    ${processSummary?.categories?.other?.processes?.length > 0 ? `
    <h2>❓ Uncategorized Processes (Other)</h2>
    <div class="card">
      <p><strong>${processSummary.categories.other.processes.length} processes</strong> could not be automatically categorized. Possible reasons:</p>
      <ul style="margin: 1rem 0;">
        <li>Unknown or custom software not in our database</li>
        <li>System processes with generic names (svchost.exe, etc.)</li>
        <li>Insufficient information for AI categorization</li>
        <li>Rare or specialized software</li>
      </ul>
      <details style="margin-top: 1rem;">
        <summary style="cursor: pointer; font-weight: bold; padding: 0.5rem; background: #f1f5f9; border-radius: 4px;">
          📋 Show Uncategorized Process List (${processSummary.categories.other.processes.length})
        </summary>
        <div style="margin-top: 1rem; max-height: 400px; overflow-y: auto;">
          <table>
            <thead>
              <tr><th>Process Name</th><th>CPU %</th><th>Memory %</th></tr>
            </thead>
            <tbody>
              ${processSummary.categories.other.processes.map(pName => {
                const proc = (data.systemInfo?.processes || processSummary.processes || [])
                  .find(p => p.name === pName);
                return `
                  <tr>
                    <td>${pName}</td>
                    <td>${proc?.cpu || 0}</td>
                    <td>${proc?.memPercentage || proc?.mem || 0}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </details>
    </div>
    ` : ''}
    
  </div>
</body>
</html>`;
}

/**
 * Generate Markdown report
 */
export function generateMarkdownReport(data) {
  const { systemInfo, processSummary, userProfile, networkInfo } = data;
  
  let md = `# 🖥️ PC Configuration Report

**Generated:** ${data.timestamp || new Date().toISOString()}

---

## 💻 System Information

| Component | Details |
|-----------|---------|
| CPU | ${systemInfo?.cpu?.manufacturer || ''} ${systemInfo?.cpu?.brand || 'N/A'} |
| Cores | ${systemInfo?.cpu?.physicalCores || 'N/A'} physical / ${systemInfo?.cpu?.cores || 'N/A'} logical |
| Speed | ${systemInfo?.cpu?.speed || 'N/A'} GHz |
| Memory | ${systemInfo?.memory?.total ? Math.round(systemInfo.memory.total / (1024**3)) : 'N/A'} GB |
| Memory Used | ${systemInfo?.memory ? ((systemInfo.memory.used / systemInfo.memory.total) * 100).toFixed(1) : 0}% |
| GPU | ${systemInfo?.graphics?.controllers?.map(g => `${g.vendor} ${g.model}`).join(', ') || 'N/A'} |
| OS | ${systemInfo?.os?.platform || ''} ${systemInfo?.os?.release || 'N/A'} |

`;

  if (userProfile) {
    md += `## 👤 User Profile

- **Profile:** ${translateProfile(userProfile.profile)}
- **Technical Level:** ${translateTechnicalLevel(userProfile.technicalLevel || 'intermediate')}
- **Confidence:** ${userProfile.confidence || 0}%

${userProfile.description || ''}

`;

    if (userProfile.mainActivities?.length > 0) {
      md += `### Main Activities\n${userProfile.mainActivities.map(a => `- ${a}`).join('\n')}\n\n`;
    }
    
    if (userProfile.recommendations?.length > 0) {
      md += `### Recommendations\n${userProfile.recommendations.map(r => `- ${r}`).join('\n')}\n\n`;
    }
  }

  if (processSummary?.categories) {
    md += `## 📊 Process Categories

| Category | Count | CPU % | Memory % |
|----------|-------|-------|----------|
${Object.entries(processSummary.categories)
  .filter(([_, data]) => data.count > 0)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([cat, data]) => `| ${getCategoryIcon(cat)} ${cat} | ${data.count} | ${data.totalCpu || 0} | ${data.totalMem || 0} |`)
  .join('\n')}

`;
  }

  if (networkInfo) {
    md += `## 🌐 Network Analysis

- **Total Connections:** ${networkInfo.summary?.totalConnections || 0}
- **Listening Ports:** ${networkInfo.summary?.listeningPorts || 0}
- **Established:** ${networkInfo.summary?.establishedConnections || 0}
- **Risk Level:** ${networkInfo.securityAnalysis?.riskLevel || 'unknown'}

`;

    if (networkInfo.securityAnalysis?.risks?.length > 0) {
      md += `### Security Risks\n${networkInfo.securityAnalysis.risks.map(r => `- ⚠️ Port ${r.port} (${r.service}): ${r.recommendation}`).join('\n')}\n\n`;
    }
  }

  // Aggiungi sezione processi "other" non categorizzati
  if (processSummary?.categories?.other?.processes?.length > 0) {
    const otherProcesses = processSummary.categories.other.processes;
    md += `## ❓ Uncategorized Processes (Other)

**${otherProcesses.length} processes** could not be automatically categorized.

### Possible Reasons:
- Unknown or custom software not in our database
- System processes with generic names (svchost.exe, etc.)
- Insufficient information for AI categorization
- Rare or specialized software

### Process List:

| Process Name | CPU % | Memory % |
|--------------|-------|----------|
${otherProcesses.map(pName => {
  const proc = (data.systemInfo?.processes || processSummary.processes || [])
    .find(p => p.name === pName);
  return `| ${pName} | ${proc?.cpu || 0} | ${proc?.memPercentage || proc?.mem || 0} |`;
}).join('\n')}

`;
  }

  return md;
}

/**
 * Generate Network Report section
 */
function generateNetworkReport(networkInfo) {
  let report = '';
  
  const summary = networkInfo.summary || {};
  
  const networkData = [
    ['Metric', 'Value'],
    ['Total Connections', summary.totalConnections || 0],
    ['Active Interfaces', summary.activeInterfaces || 0],
    ['Listening Ports', summary.listeningPorts || 0],
    ['Established Connections', summary.establishedConnections || 0],
    ['Primary Interface', summary.primaryInterface || 'N/A'],
    ['Primary IP', summary.primaryIp || 'N/A']
  ];
  
  report += table(networkData, {
    border: {
      topBody: '─', topJoin: '┬', topLeft: '┌', topRight: '┐',
      bottomBody: '─', bottomJoin: '┴', bottomLeft: '└', bottomRight: '┘',
      bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
      joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼'
    }
  });
  
  // Security Analysis
  const security = networkInfo.securityAnalysis;
  if (security) {
    const riskColor = security.riskLevel === 'elevated' ? chalk.yellow : chalk.green;
    report += `\n${riskColor(`Risk Level: ${security.riskLevel?.toUpperCase() || 'UNKNOWN'}`)}\n`;
    
    if (security.risks?.length > 0) {
      report += chalk.yellow('\n⚠️  Security Risks:\n');
      security.risks.forEach(risk => {
        report += `   • Port ${risk.port} (${risk.service}): ${risk.recommendation}\n`;
      });
    }
    
    if (security.recommendations?.length > 0) {
      report += chalk.blue('\n💡 Recommendations:\n');
      security.recommendations.forEach(rec => {
        report += `   → ${rec}\n`;
      });
    }
  }
  
  // Listening Ports
  const connections = networkInfo.connections;
  if (connections?.listeningPorts?.length > 0) {
    report += chalk.bold('\n📡 Listening Ports:\n');
    const portData = [['Port', 'Service', 'Process']];
    connections.listeningPorts.slice(0, 15).forEach(port => {
      portData.push([
        port.port.toString(),
        port.service || 'Unknown',
        (port.process || 'N/A').substring(0, 30)
      ]);
    });
    
    report += table(portData, {
      border: {
        topBody: '─', topJoin: '┬', topLeft: '┌', topRight: '┐',
        bottomBody: '─', bottomJoin: '┴', bottomLeft: '└', bottomRight: '┘',
        bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
        joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼'
      }
    });
  }
  
  return report;
}

function generateSystemSummary(systemInfo) {
  const data = [
    ['Component', 'Details'],
    ['CPU', `${systemInfo.cpu.manufacturer} ${systemInfo.cpu.brand}`],
    ['Cores', `${systemInfo.cpu.physicalCores} physical / ${systemInfo.cpu.cores} logical`],
    ['Speed', `${systemInfo.cpu.speed}GHz`],
    ['Memory', `${Math.round(systemInfo.memory.total / (1024**3))}GB total`],
    ['Used Memory', `${((systemInfo.memory.used / systemInfo.memory.total) * 100).toFixed(1)}%`],
    ['GPU', systemInfo.graphics.controllers.map(g => `${g.vendor} ${g.model}`).join(', ')],
    ['Storage', `${systemInfo.storage.disks.length} disk(s)`],
    ['OS', `${systemInfo.os.platform} ${systemInfo.os.release}`]
  ];
  
  return table(data, {
    border: {
      topBody: '─',
      topJoin: '┬',
      topLeft: '┌',
      topRight: '┐',
      bottomBody: '─',
      bottomJoin: '┴',
      bottomLeft: '└',
      bottomRight: '┘',
      bodyLeft: '│',
      bodyRight: '│',
      bodyJoin: '│',
      joinBody: '─',
      joinLeft: '├',
      joinRight: '┤',
      joinJoin: '┼'
    }
  });
}

function generateIssuesReport(issues) {
  if (issues.length === 0) {
    return chalk.green('✓ No configuration issues detected!\n');
  }

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const infoIssues = issues.filter(i => i.severity === 'info');

  let report = '';

  if (criticalIssues.length > 0) {
    report += chalk.red.bold(`\n🔴 Critical Issues (${criticalIssues.length})\n`);
    criticalIssues.forEach((issue, index) => {
      report += `${index + 1}. ${chalk.bold(issue.issue)} (${issue.category})\n`;
      report += `   ${issue.description}\n`;
      report += `   ${chalk.yellow('→')} ${issue.recommendation}\n\n`;
    });
  }

  if (warningIssues.length > 0) {
    report += chalk.yellow.bold(`\n⚠️  Warnings (${warningIssues.length})\n`);
    warningIssues.forEach((issue, index) => {
      report += `${index + 1}. ${chalk.bold(issue.issue)} (${issue.category})\n`;
      report += `   ${issue.description}\n`;
      report += `   ${chalk.blue('→')} ${issue.recommendation}\n\n`;
    });
  }

  if (infoIssues.length > 0) {
    report += chalk.blue.bold(`\nℹ️  Information (${infoIssues.length})\n`);
    infoIssues.forEach((issue, index) => {
      report += `${index + 1}. ${chalk.bold(issue.issue)} (${issue.category})\n`;
      report += `   ${issue.description}\n`;
      report += `   ${chalk.cyan('→')} ${issue.recommendation}\n\n`;
    });
  }

  return report;
}

function generateUserProfileReport(userProfile, processSummary) {
  let report = '';
  
  if (!userProfile.available) {
    report += chalk.yellow(`⚠️  ${userProfile.description}\n`);
    report += chalk.dim('   Assicurati che Ollama sia in esecuzione e che il modello gemma2:9b sia installato.\n');
    return report;
  }
  
  const profileName = translateProfile(userProfile.profile);
  const technicalLevel = translateTechnicalLevel(userProfile.technicalLevel || 'intermediate');
  const confidence = userProfile.confidence;
  
  // Box del profilo principale
  report += '╔═════════════════════════════════════════════════════════════════════╗\n';
  report += chalk.bold.cyan(`║  PROFILO: ${profileName.toUpperCase().padEnd(56)} ║\n`);
  report += chalk.cyan(`║  Livello Tecnico: ${technicalLevel.padEnd(50)} ║\n`);
  report += `╚═════════════════════════════════════════════════════════════════════╝\n\n`;
  
  // Barra di confidenza migliorata
  const barLength = 50;
  const filledLength = Math.round((confidence / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  let confidenceColor = confidence >= 80 ? chalk.green : confidence >= 60 ? chalk.yellow : chalk.red;
  report += confidenceColor(`Confidenza dell'analisi: ${confidence}%\n`);
  report += confidenceColor(`[${bar}]\n\n`);
  
  // Descrizione
  if (userProfile.description) {
    report += chalk.bold('📋 DESCRIZIONE\n');
    report += chalk.white(`${userProfile.description}\n\n`);
  }
  
  // Attività principali
  if (userProfile.mainActivities && userProfile.mainActivities.length > 0) {
    report += chalk.bold('🎯 ATTIVITÀ PRINCIPALI\n');
    userProfile.mainActivities.forEach((activity, i) => {
      report += chalk.cyan(`   ${i + 1}. ${activity}\n`);
    });
    report += '\n';
  }
  
  // Caratteristiche rilevate
  if (userProfile.characteristics && userProfile.characteristics.length > 0) {
    report += chalk.bold('✨ CARATTERISTICHE RILEVATE\n');
    userProfile.characteristics.forEach(char => {
      report += chalk.green(`   ✓ ${char}\n`);
    });
    report += '\n';
  }
  
  // Pattern di utilizzo
  if (userProfile.usagePatterns && userProfile.usagePatterns.length > 0) {
    report += chalk.bold('📊 PATTERN DI UTILIZZO\n');
    userProfile.usagePatterns.forEach(pattern => {
      report += chalk.blue(`   • ${pattern}\n`);
    });
    report += '\n';
  }
  
  // Raccomandazioni
  if (userProfile.recommendations && userProfile.recommendations.length > 0) {
    report += chalk.bold('💡 RACCOMANDAZIONI\n');
    userProfile.recommendations.forEach(rec => {
      report += chalk.yellow(`   → ${rec}\n`);
    });
    report += '\n';
  }
  
  // Statistiche dettagliate dei processi
  report += chalk.bold('📈 STATISTICHE PROCESSI\n');
  const stats = processSummary.statistics || {};
  const systemStats = processSummary.systemStats || {};
  
  const statsData = [
    ['Metrica', 'Valore'],
    ['Processi totali', processSummary.totalProcesses || 0],
    ['Processi utente', typeof stats.userProcessCount === 'number' ? stats.userProcessCount : 'N/A'],
    ['Processi di sistema', typeof stats.systemProcessCount === 'number' ? stats.systemProcessCount : 'N/A'],
    ['Carico CPU', systemStats.cpuLoad ? `${systemStats.cpuLoad.toFixed(1)}%` : 'N/A'],
    ['Uso memoria processi', `${stats.totalMemUsage || 0}%`],
    ['Thread medi', stats.averageThreadsPerProcess || '0.0'],
    ['Servizi attivi', typeof stats.activeServicesCount === 'number' ? stats.activeServicesCount : 'N/A']
  ];
  
  report += table(statsData, {
    border: {
      topBody: '─', topJoin: '┬', topLeft: '┌', topRight: '┐',
      bottomBody: '─', bottomJoin: '┴', bottomLeft: '└', bottomRight: '┘',
      bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
      joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼'
    }
  });
  
  // Categorie di applicazioni
  report += chalk.bold('\n🗂️  CATEGORIE DI APPLICAZIONI\n');
  const categories = processSummary.categories || {};
  const sortedCategories = Object.entries(categories)
    .filter(([cat, data]) => data.count > 0)
    .sort((a, b) => b[1].count - a[1].count);
  
  const categoryData = [['Categoria', 'Processi', 'CPU %', 'RAM %', 'App Principale']];
  
  sortedCategories.slice(0, 10).forEach(([category, data]) => {
    const icon = getCategoryIcon(category);
    const topApp = data.topProcess ? data.topProcess.name : 'N/A';
    categoryData.push([
      `${icon} ${category}`,
      data.count.toString(),
      data.totalCpu || '0',
      data.totalMem || '0',
      topApp.length > 25 ? topApp.substring(0, 22) + '...' : topApp
    ]);
  });
  
  report += table(categoryData, {
    border: {
      topBody: '─', topJoin: '┬', topLeft: '┌', topRight: '┐',
      bottomBody: '─', bottomJoin: '┴', bottomLeft: '└', bottomRight: '┘',
      bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
      joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼'
    }
  });
  
  return report + '\n';
}

function getCategoryIcon(category) {
  const icons = {
    'development': '💻',
    'gaming': '🎮',
    'office': '📊',
    'browsers': '🌐',
    'media': '🎵',
    'system': '⚙️',
    'database': '🗄️',
    'networking': '🔗',
    'security': '🔒',
    'virtualization': '📦',
    'cloudStorage': '☁️',
    'communication': '💬',
    'ai': '🤖',
    'streaming': '📺',
    'other': '📦'
  };
  return icons[category] || '📦';
}

function generateSummary(issues) {
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  if (criticalCount > 0) {
    return chalk.red.bold(`System has ${criticalCount} critical issues requiring immediate attention.`);
  } else if (warningCount > 0) {
    return chalk.yellow(`System is functional but has ${warningCount} issues that could impact performance.`);
  } else if (infoCount > 0) {
    return chalk.blue(`System is well-configured with ${infoCount} optimization suggestions.`);
  } else {
    return chalk.green.bold('✓ System configuration is optimal!');
  }
}
