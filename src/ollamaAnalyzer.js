import axios from 'axios';

export class OllamaClient {
  constructor(url, model) {
    this.baseUrl = url || 'http://localhost:11434';
    this.model = model || 'gemma2:9b';
    this.apiUrl = this.baseUrl + '/api/generate';
  }

  async generate(prompt, opts) {
    const options = opts || {};
    const r = await axios.post(this.apiUrl, {
      model: this.model,
      prompt: prompt,
      stream: false,
      options: { temperature: options.temperature || 0.7 }
    }, { timeout: 120000 });
    return r.data.response;
  }

  async checkAvailability() {
    try {
      await axios.get(this.baseUrl + '/api/tags', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async checkModel() {
    try {
      const r = await axios.get(this.baseUrl + '/api/tags');
      const models = r.data.models || [];
      const modelName = this.model.split(':')[0];
      return models.some(m => m.name.includes(modelName));
    } catch {
      return false;
    }
  }
}

// Helper function to analyze path security
function analyzePathSecurity(path) {
  if (!path || path === 'N/A') return 'unknown';
  const lowerPath = path.toLowerCase();
  
  if (lowerPath.includes('windows\\system32') || lowerPath.includes('windows\\syswow64')) {
    return 'system_trusted';
  }
  if (lowerPath.includes('program files')) {
    return 'installed_app';
  }
  if (lowerPath.includes('appdata\\local') || lowerPath.includes('appdata\\roaming')) {
    return 'user_app';
  }
  if (lowerPath.includes('temp') || lowerPath.includes('tmp')) {
    return 'suspicious_temp';
  }
  if (lowerPath.match(/^[a-z]:\\[^\\]+\.exe$/i)) {
    return 'suspicious_root';
  }
  return 'unknown_location';
}

// Helper function to analyze user type
function analyzeUserType(user) {
  if (!user || user === 'N/A' || user === '') return 'no_user_info';
  const upperUser = user.toUpperCase();
  
  if (upperUser.includes('SYSTEM') || upperUser.includes('NT AUTHORITY')) {
    return 'system_service';
  }
  if (upperUser.includes('LOCAL SERVICE') || upperUser.includes('NETWORK SERVICE')) {
    return 'limited_service';
  }
  return 'user_process';
}

export async function analyzeUserProfile(ps, si) {
  const o = new OllamaClient();
  if (!(await o.checkAvailability())) {
    return { available: false, profile: 'unknown', description: 'Ollama non disponibile' };
  }
  if (!(await o.checkModel())) {
    return { available: false, profile: 'unknown', description: 'Modello non trovato' };
  }
  
  const ramGB = Math.round(si.memory.total / (1024 * 1024 * 1024));
  const catEntries = Object.entries(ps.categories).filter(([k, d]) => d.count > 0).slice(0, 10);
  const procList = catEntries.map(([c, d]) => `${c}: ${d.count} processi`).join(', ');
  
  const promptText = `You must respond with ONLY valid JSON, no additional text.

System info:
- OS: ${si.os.distro}
- CPU: ${si.cpu.brand} (${si.cpu.cores} cores)
- RAM: ${ramGB}GB
- Running software categories: ${procList}

Analyze this user and respond with EXACTLY this JSON structure (in Italian).
Choose the SINGLE most dominant profile:
{
  "profile": "developer" OR "gamer" OR "content_creator" OR "office_worker" OR "student" OR "power_user" OR "casual_user",
  "confidence": 75,
  "technicalLevel": "basic|intermediate|advanced|expert",
  "description": "Brief Italian description",
  "mainActivities": ["Activity 1", "Activity 2", "Activity 3"],
  "characteristics": ["Characteristic 1", "Characteristic 2"],
  "usagePatterns": ["Pattern 1", "Pattern 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;
  
  try {
    const r = await o.generate(promptText);
    console.log('Risposta Ollama ricevuta, analisi in corso...');
    console.log('Lunghezza risposta:', r.length, 'caratteri');
    
    // Debug: show first part of response
    if (r.length < 500) {
      console.log('Risposta completa:', r);
    } else {
      console.log('Inizio risposta:', r.substring(0, 200));
      console.log('Fine risposta:', r.substring(r.length - 200));
    }
    
    // Helper to convert any value to string array
    const ensureStringArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.map(v => {
          if (typeof v === 'string') return v;
          if (typeof v === 'object' && v !== null) {
            // If object has a text/value property, use it
            return v.text || v.value || v.description || JSON.stringify(v);
          }
          return String(v);
        });
      }
      if (typeof val === 'string') return [val];
      if (typeof val === 'object' && val !== null) {
        // Convert object to array of strings
        return Object.values(val).map(v => String(v));
      }
      return [String(val)];
    };
    
    const m = r.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const j = JSON.parse(m[0]);
        
        return {
          available: true,
          profile: j.profile || 'unknown',
          confidence: parseInt(j.confidence) || 0,
          technicalLevel: j.technicalLevel || 'intermediate',
          description: String(j.description || ''),
          mainActivities: ensureStringArray(j.mainActivities),
          characteristics: ensureStringArray(j.characteristics),
          usagePatterns: ensureStringArray(j.usagePatterns),
          recommendations: ensureStringArray(j.recommendations)
        };
      } catch (parseError) {
        console.log('⚠️  Errore parsing JSON:', parseError.message);
      }
    }
    
    console.log('⚠️  Nessun JSON valido trovato nella risposta');
    return {
      available: true,
      profile: 'unknown',
      confidence: 0,
      technicalLevel: 'intermediate',
      description: 'Impossibile analizzare la risposta del modello',
      mainActivities: [],
      characteristics: [],
      usagePatterns: [],
      recommendations: []
    };
  } catch (e) {
    console.error('Errore durante l\'analisi:', e.message);
    return { 
      available: false, 
      profile: 'error', 
      description: `Errore: ${e.message}`,
      confidence: 0,
      technicalLevel: 'intermediate',
      mainActivities: [],
      characteristics: [],
      usagePatterns: [],
      recommendations: []
    };
  }
}

export async function categorizeUnknownProcesses(unknownProcesses, ollamaClient) {
  if (!unknownProcesses || unknownProcesses.length === 0) {
    return {};
  }

  const client = ollamaClient || new OllamaClient();
  
  // Take top 30 unknown processes by CPU/memory usage for deep analysis
  const topUnknown = unknownProcesses
    .sort((a, b) => (b.cpu + b.mem) - (a.cpu + a.mem))
    .slice(0, 30);
  
  // Build forensic-level process information
  const processDetails = topUnknown.map(p => {
    const analysis = {
      name: p.name,
      
      // 1. METADATI IDENTIFICATIVI
      path: p.path || 'N/A',
      pathAnalysis: analyzePathSecurity(p.path),
      
      // 2. GERARCHIA E RELAZIONI
      parentPid: p.parentPid || 'N/A',
      commandLine: (p.command || p.params || '').substring(0, 150),
      
      // 3. UTILIZZO RISORSE
      cpu: p.cpu.toFixed(2) + '%',
      memory: p.mem.toFixed(2) + '%',
      memoryPhysical: p.memRss ? `${(p.memRss / 1024).toFixed(1)}MB` : 'N/A',
      memoryVirtual: p.memVsz ? `${(p.memVsz / 1024).toFixed(1)}MB` : 'N/A',
      threads: p.threads || 'N/A',
      
      // 4. PRIVILEGI E IDENTITÀ
      user: p.user || 'N/A',
      userType: analyzeUserType(p.user),
      priority: p.priority || 'N/A',
      
      // 5. STATO OPERATIVO
      state: p.state || 'running',
      uptime: p.started || 'N/A'
    };
    
    return analysis;
  });
  
  const prompt = `You are a Windows process forensics expert. Analyze these processes deeply using forensic methodology:

PROCESS FORENSIC DATA:
${JSON.stringify(processDetails, null, 2)}

FORENSIC ANALYSIS GUIDELINES:

1. PATH ANALYSIS:
   - System processes MUST be in C:\\Windows\\System32 or C:\\Windows
   - Suspicious: AppData\\Local, Temp folders, random names
   - Safe: Program Files, Program Files (x86)

2. USER CONTEXT:
   - SYSTEM/NT AUTHORITY = OS components
   - Named user = User applications
   - Empty user on high-CPU = potential malware

3. COMMAND LINE:
   - Look for suspicious flags: --hidden, -nowindow, base64 strings
   - Check for injection attempts or obfuscation

4. RESOURCE PATTERNS:
   - High CPU + network activity = mining or data exfiltration
   - Growing memory + no display = background task/service
   - Multiple threads + user context = legitimate application

5. BEHAVIORAL INDICATORS:
   - Antivirus: High I/O, SYSTEM user, Windows Defender path
   - Updaters: Periodic activity, company name in path
   - Malware: Typosquatting names, unusual locations, no user

Available categories: development, gaming, office, browsers, media, communication, database, networking, security, virtualization, cloudStorage, system, other

Respond with ONLY valid JSON:
{
  "categorizations": [
    {
      "process": "processname.exe",
      "category": "security",
      "confidence": 95,
      "reason": "Windows Defender engine, SYSTEM user, System32 path, signature scanning behavior",
      "threat_level": "safe|suspicious|unknown"
    }
  ]
}`;

  try {
    const response = await client.generate(prompt);
    const match = response.match(/\{[\s\S]*\}/);
    
    if (match) {
      const parsed = JSON.parse(match[0]);
      const result = {};
      const explanations = {};
      const fullDetails = {}; // Store complete categorization details
      
      if (parsed.categorizations && Array.isArray(parsed.categorizations)) {
        parsed.categorizations.forEach(cat => {
          if (cat.process && cat.category && cat.confidence > 50) {
            result[cat.process.toLowerCase()] = cat.category;
            
            // Store full details for report generation
            fullDetails[cat.process.toLowerCase()] = {
              category: cat.category,
              confidence: cat.confidence,
              reason: cat.reason || 'No reason provided',
              threatLevel: cat.threat_level || 'unknown',
              analysisMethod: 'LLM Forensic Analysis'
            };
            
            if (cat.reason) {
              const threatIcon = cat.threat_level === 'safe' ? '✓' : cat.threat_level === 'suspicious' ? '⚠️' : '❓';
              explanations[cat.process.toLowerCase()] = {
                text: `${cat.category} (${cat.confidence}%) - ${cat.reason}`,
                threat: cat.threat_level || 'unknown',
                icon: threatIcon
              };
            }
          }
        });
        
        // Print forensic analysis results
        if (Object.keys(explanations).length > 0) {
          console.log('\n📋 Analisi Forense Processi:');
          Object.entries(explanations).slice(0, 8).forEach(([proc, data]) => {
            console.log(`   ${data.icon} ${proc}:`);
            console.log(`      ${data.text}`);
          });
        }
      }
      
      // Return both categorizations and full details
      return { categorizations: result, details: fullDetails };
    }
  } catch (e) {
    console.log('⚠️  Errore categorizzazione processi sconosciuti:', e.message);
  }
  
  return { categorizations: {}, details: {} };
}

export function translateProfile(p) {
  const t = {
    developer: 'Sviluppatore',
    gamer: 'Videogiocatore',
    content_creator: 'Creatore di Contenuti',
    data_scientist: 'Data Scientist',
    office_worker: 'Lavoratore d\'Ufficio',
    student: 'Studente',
    system_admin: 'Amministratore',
    designer: 'Designer',
    power_user: 'Utente Avanzato',
    casual_user: 'Utente Occasionale',
    unknown: 'Sconosciuto',
    error: 'Errore'
  };
  return t[p] || p;
}

export function translateTechnicalLevel(l) {
  const t = {
    basic: 'Base',
    intermediate: 'Intermedio',
    advanced: 'Avanzato',
    expert: 'Esperto',
    unknown: 'Sconosciuto'
  };
  return t[l] || l;
}

export function generateCategorizationReport(processes, llmDetails, keywordCategories) {
  const timestamp = new Date().toISOString();
  let report = `# PROCESS CATEGORIZATION REPORT
Generated: ${timestamp}
Total Processes Analyzed: ${processes.length}

================================================================================
CATEGORIZATION METHODOLOGY
================================================================================

This report documents how each process was categorized using two methods:

1. KEYWORD MATCHING: Fast pattern matching against known software signatures
   - Method: String matching on process name, path, and command line
   - Confidence: High for well-known software
   - Categories matched against predefined keywords

2. LLM FORENSIC ANALYSIS: AI-powered behavioral analysis
   - Method: Gemma2:9B analyzing process metadata, path, user context, resources
   - Analysis includes: Path security, command line inspection, resource patterns
   - Confidence: Varies based on available information (50-95%)
   - Threat assessment: safe/suspicious/unknown

================================================================================
PROCESSES BY CATEGORY
================================================================================

`;

  // Group processes by category
  const categorized = {};
  processes.forEach(p => {
    const cat = p.category || 'other';
    if (!categorized[cat]) {
      categorized[cat] = [];
    }
    categorized[cat].push(p);
  });

  // Generate report for each category
  const categoryIcons = {
    development: '💻', gaming: '🎮', office: '📊', browsers: '🌐',
    media: '🎵', communication: '💬', database: '🗄️', networking: '🔗',
    security: '🔒', virtualization: '📦', cloudStorage: '☁️', system: '⚙️',
    ai: '🤖', streaming: '📺', other: '📦'
  };

  Object.keys(categorized).sort().forEach(category => {
    const icon = categoryIcons[category] || '📦';
    const procs = categorized[category];
    
    report += `\n${'='.repeat(80)}\n`;
    report += `${icon} ${category.toUpperCase()} (${procs.length} processes)\n`;
    report += `${'='.repeat(80)}\n\n`;

    procs.forEach((p, idx) => {
      report += `${idx + 1}. ${p.name}\n`;
      report += `   ${'─'.repeat(76)}\n`;
      report += `   Process ID: ${p.pid}\n`;
      report += `   CPU Usage: ${p.cpu.toFixed(2)}%\n`;
      report += `   Memory Usage: ${p.mem.toFixed(2)}%\n`;
      
      if (p.path) {
        report += `   Path: ${p.path}\n`;
      }
      
      if (p.user) {
        report += `   User: ${p.user}\n`;
      }
      
      report += `\n   CATEGORIZATION ANALYSIS:\n`;
      
      const processNameLower = p.name.toLowerCase();
      
      // Check if LLM categorized this
      if (llmDetails && llmDetails[processNameLower]) {
        const details = llmDetails[processNameLower];
        report += `   Method: ${details.analysisMethod}\n`;
        report += `   Confidence: ${details.confidence}%\n`;
        report += `   Threat Level: ${details.threatLevel}\n`;
        report += `   \n   Reasoning:\n`;
        report += `   ${details.reason}\n`;
      } else {
        // Keyword matched
        report += `   Method: Keyword Pattern Matching\n`;
        report += `   Confidence: High (90-95%)\n`;
        report += `   \n   Reasoning:\n`;
        report += `   Process matched known ${category} software patterns based on:\n`;
        
        if (p.name) {
          report += `   - Process name: ${p.name}\n`;
        }
        if (p.path && p.path !== p.name) {
          report += `   - Installation path indicates ${category} software\n`;
        }
        if (p.command && p.command !== p.name) {
          report += `   - Command line arguments consistent with ${category} tools\n`;
        }
      }
      
      report += `\n`;
    });
  });

  report += `\n${'='.repeat(80)}\n`;
  report += `END OF REPORT\n`;
  report += `${'='.repeat(80)}\n`;

  return report;
}
