import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * LLM Response Cache - Evita analisi ripetute degli stessi processi
 */
export class LlmCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || '.pc-analyzer-cache';
    this.ttlHours = options.ttlHours || 24;
    this.enabled = options.enabled !== false;
    
    if (this.enabled) {
      this.ensureCacheDir();
    }
  }

  /**
   * Crea directory cache se non esiste
   */
  ensureCacheDir() {
    const fullPath = path.join(process.cwd(), this.cacheDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  /**
   * Genera chiave hash per processo
   */
  generateKey(process) {
    const keyData = {
      name: process.name?.toLowerCase(),
      path: process.path?.toLowerCase(),
      command: process.command?.toLowerCase()?.substring(0, 100)
    };
    
    const hash = crypto.createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex');
    
    return hash;
  }

  /**
   * Ottieni categorizzazione dalla cache
   */
  get(process) {
    if (!this.enabled) return null;
    
    try {
      const key = this.generateKey(process);
      const cachePath = path.join(process.cwd(), this.cacheDir, `${key}.json`);
      
      if (!fs.existsSync(cachePath)) {
        return null;
      }
      
      const content = fs.readFileSync(cachePath, 'utf8');
      const cached = JSON.parse(content);
      
      // Verifica TTL
      const age = Date.now() - cached.timestamp;
      const maxAge = this.ttlHours * 60 * 60 * 1000;
      
      if (age > maxAge) {
        fs.unlinkSync(cachePath);
        return null;
      }
      
      return cached.data;
    } catch {
      return null;
    }
  }

  /**
   * Salva categorizzazione in cache
   */
  set(process, data) {
    if (!this.enabled) return;
    
    try {
      const key = this.generateKey(process);
      const cachePath = path.join(process.cwd(), this.cacheDir, `${key}.json`);
      
      const cacheEntry = {
        timestamp: Date.now(),
        processName: process.name,
        data
      };
      
      fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2), 'utf8');
    } catch (error) {
      // Silently fail - cache is optional
    }
  }

  /**
   * Ottieni multiple categorizzazioni dalla cache
   */
  getMultiple(processes) {
    const results = {
      cached: {},
      notCached: []
    };

    for (const process of processes) {
      const cached = this.get(process);
      if (cached) {
        results.cached[process.name.toLowerCase()] = cached;
      } else {
        results.notCached.push(process);
      }
    }

    return results;
  }

  /**
   * Salva multiple categorizzazioni
   */
  setMultiple(categorizations) {
    for (const [processName, data] of Object.entries(categorizations)) {
      this.set({ name: processName }, data);
    }
  }

  /**
   * Pulisci cache scaduta
   */
  cleanup() {
    if (!this.enabled) return;
    
    try {
      const fullPath = path.join(process.cwd(), this.cacheDir);
      const files = fs.readdirSync(fullPath);
      const maxAge = this.ttlHours * 60 * 60 * 1000;
      let cleaned = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(fullPath, file);
        const stat = fs.statSync(filePath);
        const age = Date.now() - stat.mtimeMs;
        
        if (age > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
      
      return cleaned;
    } catch {
      return 0;
    }
  }

  /**
   * Ottieni statistiche cache
   */
  getStats() {
    if (!this.enabled) {
      return { enabled: false };
    }
    
    try {
      const fullPath = path.join(process.cwd(), this.cacheDir);
      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.json'));
      
      let totalSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;
      
      for (const file of files) {
        const filePath = path.join(fullPath, file);
        const stat = fs.statSync(filePath);
        totalSize += stat.size;
        
        if (stat.mtimeMs < oldestTimestamp) oldestTimestamp = stat.mtimeMs;
        if (stat.mtimeMs > newestTimestamp) newestTimestamp = stat.mtimeMs;
      }
      
      return {
        enabled: true,
        entries: files.length,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        oldestEntry: files.length > 0 ? new Date(oldestTimestamp).toISOString() : null,
        newestEntry: files.length > 0 ? new Date(newestTimestamp).toISOString() : null
      };
    } catch {
      return { enabled: true, error: 'Unable to read cache stats' };
    }
  }

  /**
   * Svuota completamente la cache
   */
  clear() {
    if (!this.enabled) return;
    
    try {
      const fullPath = path.join(process.cwd(), this.cacheDir);
      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        fs.unlinkSync(path.join(fullPath, file));
      }
      
      return files.length;
    } catch {
      return 0;
    }
  }
}
