#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeSystem } from './analyzer.js';
import { generateReport } from './reporter.js';
import { MisconfigurationDetector } from './detector.js';

const program = new Command();

program
  .name('pc-config-analyzer')
  .description('Analyzes PC configuration and detects misconfigurations')
  .version('1.0.0');

program
  .option('-v, --verbose', 'show detailed system information')
  .option('-j, --json', 'output results in JSON format')
  .option('-c, --category <category>', 'check only specific category (cpu,memory,graphics,storage,os)')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('PC Configuration Analyzer'));
      console.log(chalk.blue('========================'));
      console.log();
      
      console.log('Collecting system information...');
      const systemInfo = await analyzeSystem();
      
      if (options.json) {
        console.log(JSON.stringify(systemInfo, null, 2));
        return;
      }
      
      if (options.category) {
        const detector = new MisconfigurationDetector();
        const categorySystemInfo = { [options.category]: systemInfo[options.category] };
        const issues = detector.detectIssues(categorySystemInfo);
        console.log(generateReport(systemInfo));
      } else {
        const report = generateReport(systemInfo);
        console.log(report);
      }
      
      if (options.verbose) {
        console.log(chalk.bold('\nDetailed System Information:'));
        console.log(JSON.stringify(systemInfo, null, 2));
      }
      
    } catch (error) {
      console.error(chalk.red('Error analyzing system:'), error.message);
      process.exit(1);
    }
  });

program.parse();