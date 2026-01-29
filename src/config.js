import fs from 'fs';
import path from 'path';

export const CONFIG_DEFAULTS = {
  // Ollama Settings
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'gemma2:9b',
  ollamaTimeout: 120000,
  
  // Analysis Settings
  useLlm: true,
  maxLlmIterations: 5,
  analyzeNetwork: true,
  maxProcesses: 400,
  
  // Output Settings
  verbose: false,
  colorOutput: true,
  autoOpen: true, // Apre automaticamente i file HTML nel browser
  
  // Cache Settings
  useCache: true,
  cacheDir: '.pc-analyzer-cache',
  cacheTtlHours: 24,
  
  // Categories to analyze
  enabledCategories: [
    'development', 'gaming', 'office', 'browsers', 'media',
    'communication', 'database', 'networking', 'security',
    'virtualization', 'cloudStorage', 'system', 'ai', 'streaming'
  ],
  
  // Custom keywords for categorization (merge with defaults)
  customKeywords: {
    // Add your custom keywords here
    // development: ['myide', 'mytool'],
    // gaming: ['mygame']
  },
  
  // Process exclusions (won't be analyzed by LLM)
  excludeProcesses: [
    'system idle process',
    'system',
    'registry'
  ],
  
  // Report Settings
  reportFormat: 'text', // text, json, html, markdown
  includeTimestamp: true,
  
  // Security Settings
  detectSuspiciousProcesses: true,
  alertOnSuspicious: true
};

let currentConfig = { ...CONFIG_DEFAULTS };

/**
 * Load configuration from file
 * @param {string} configPath - Path to config file (optional)
 * @returns {object} Merged configuration
 */
export async function loadConfig(configPath) {
  const defaultPath = path.join(process.cwd(), 'pc-analyzer.config.json');
  const targetPath = configPath || defaultPath;
  
  try {
    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, 'utf8');
      const userConfig = JSON.parse(content);
      
      // Deep merge user config with defaults
      currentConfig = deepMerge(CONFIG_DEFAULTS, userConfig);
      
      return currentConfig;
    }
  } catch (error) {
    console.warn(`⚠️  Errore caricamento config: ${error.message}`);
  }
  
  return CONFIG_DEFAULTS;
}

/**
 * Get current configuration
 * @returns {object} Current configuration
 */
export function getConfig() {
  return currentConfig;
}

/**
 * Update configuration at runtime
 * @param {object} updates - Configuration updates
 */
export function updateConfig(updates) {
  currentConfig = deepMerge(currentConfig, updates);
}

/**
 * Deep merge two objects
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      if (Array.isArray(source[key]) && Array.isArray(target[key])) {
        // Merge arrays (unique values)
        result[key] = [...new Set([...target[key], ...source[key]])];
      } else {
        result[key] = deepMerge(target[key], source[key]);
      }
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Save current configuration to file
 * @param {string} configPath - Path to save config
 */
export function saveConfig(configPath) {
  const targetPath = configPath || path.join(process.cwd(), 'pc-analyzer.config.json');
  fs.writeFileSync(targetPath, JSON.stringify(currentConfig, null, 2), 'utf8');
}
