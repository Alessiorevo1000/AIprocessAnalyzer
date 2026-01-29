import si from 'systeminformation';
import { getConfig } from './config.js';

export async function getRunningProcesses(options = {}) {
  const config = getConfig();
  const maxProcesses = options.maxProcesses || config.maxProcesses || 400;
  
  try {
    const [processes, currentLoad] = await Promise.all([si.processes(), si.currentLoad()]);
    const relevantProcesses = processes.list
      .filter(p => p.name && p.name.trim() !== '')
      .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
      .slice(0, maxProcesses)
      .map(p => ({
        // Identificativi base
        pid: p.pid,
        name: p.name,
        
        // Utilizzo risorse
        cpu: p.cpu || 0,
        mem: p.mem || 0,
        memVsz: p.memVsz || 0, // Virtual memory size
        memRss: p.memRss || 0, // Resident set size (memoria fisica)
        
        // Percorso e comando
        command: p.command || '',
        path: p.path || '',
        params: p.params || '', // Parametri della riga di comando
        
        // Gerarchia e relazioni
        parentPid: p.parentPid || 0,
        
        // Thread e handles
        threads: p.threads || (p.cpu > 5 || p.mem > 5 ? Math.max(1, Math.ceil(p.cpu / 2)) : 1),
        
        // Identità e privilegi
        user: p.user || '',
        priority: p.priority || 0,
        
        // Timing
        started: p.started || '',
        state: p.state || '',
        tty: p.tty || ''
      }));
    return {
      processes: relevantProcesses,
      stats: {
        totalProcesses: processes.all,
        cpuLoad: currentLoad.currentLoad || 0,
        cpuLoadUser: currentLoad.currentLoadUser || 0
      },
      services: [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn(`⚠️  Errore lettura processi: ${error.message}`);
    return { processes: [], stats: {}, services: [], timestamp: new Date().toISOString() };
  }
}

export function categorizeProcesses(processes, llmCategorizations = null) {
  const cat = {
    development: [], gaming: [], office: [], browsers: [], media: [],
    system: [], database: [], networking: [], security: [], virtualization: [],
    cloudStorage: [], communication: [], ai: [], streaming: [], other: []
  };
  
  // Extended keywords with modern software
  const kw = {
    development: [
      // IDEs & Editors
      'code.exe', 'vscode', 'git', 'node.exe', 'python', 'java', 'npm', 
      'visual studio', 'devenv', 'rider', 'intellij', 'pycharm', 'webstorm',
      'sublime', 'notepad++', 'atom', 'vim', 'neovim', 'emacs', 'cursor',
      // Build tools
      'gradle', 'maven', 'cmake', 'msbuild', 'webpack', 'vite', 'esbuild',
      // Containers
      'docker', 'podman', 'containerd', 'kubernetes', 'kubectl', 'minikube',
      // Version control
      'github', 'gitlab', 'gitkraken', 'sourcetree', 'tortoisegit',
      // Terminals
      'windowsterminal', 'wt.exe', 'alacritty', 'hyper', 'terminus',
      // Package managers
      'yarn', 'pnpm', 'pip', 'cargo', 'composer', 'nuget',
      // Debug tools
      'debugger', 'gdb', 'lldb', 'windbg'
    ],
    gaming: [
      // Launchers
      'steam', 'epicgameslauncher', 'gog', 'origin', 'uplay', 'ubisoft',
      'battlenet', 'riotclient', 'ea app', 'xbox', 'playnite',
      // Games
      'league of legends', 'valorant', 'csgo', 'cs2', 'dota2', 'fortnite',
      'minecraft', 'roblox', 'genshin', 'apex', 'overwatch', 'warzone',
      'pubg', 'rainbow six', 'elden ring', 'hogwarts', 'baldur',
      // Gaming tools
      'reshade', 'msi afterburner', 'rtss', 'rivatuner', 'fraps',
      'nvidia broadcast', 'geforce', 'razer', 'logitech', 'corsair icue',
      'steelseries', 'hyperx', 'roccat'
    ],
    office: [
      'winword', 'excel', 'powerpnt', 'outlook', 'teams', 'onenote', 
      'access.exe', 'publisher', 'visio', 'project',
      'libreoffice', 'openoffice', 'wps', 'notion', 'evernote', 'obsidian',
      'todoist', 'trello', 'asana', 'monday', 'clickup', 'jira',
      'confluence', 'acrobat', 'foxit', 'sumatra', 'calibre'
    ],
    browsers: [
      'chrome.exe', 'firefox.exe', 'msedge.exe', 'brave.exe', 'opera', 
      'vivaldi', 'safari', 'chromium', 'tor browser', 'arc.exe',
      'librewolf', 'waterfox', 'floorp', 'zen browser'
    ],
    media: [
      // Players
      'spotify', 'vlc.exe', 'mpc-hc', 'mpv', 'foobar', 'musicbee', 
      'winamp', 'itunes', 'amazon music', 'tidal', 'deezer',
      // Video editing
      'premiere', 'afterfx', 'davinci', 'vegas', 'filmora', 'shotcut',
      'kdenlive', 'avidemux', 'handbrake',
      // Image editing
      'photoshop', 'lightroom', 'gimp', 'paint.net', 'krita', 'inkscape',
      'affinity', 'canva', 'figma', 'sketch',
      // Audio
      'audacity', 'audition', 'reaper', 'ableton', 'fl studio', 
      'cubase', 'logic', 'garageband', 'pro tools',
      // 3D
      'blender', 'maya', '3dsmax', 'cinema4d', 'zbrush', 'substance',
      'unreal', 'unity'
    ],
    communication: [
      'discord', 'slack', 'telegram', 'whatsapp', 'skype', 'zoom', 
      'webex', 'signal', 'element', 'wire', 'viber', 'line',
      'messenger', 'google meet', 'facetime', 'mumble', 'teamspeak',
      'ventrilo', 'guilded'
    ],
    database: [
      'postgres', 'mysql', 'mongodb', 'redis', 'sqlserver', 'oracle',
      'sqlite', 'mariadb', 'cassandra', 'couchdb', 'elasticsearch',
      'influxdb', 'neo4j', 'dbeaver', 'datagrip', 'heidisql',
      'pgadmin', 'robo3t', 'mongodb compass', 'tableplus'
    ],
    networking: [
      'nordvpn', 'expressvpn', 'surfshark', 'protonvpn', 'mullvad',
      'wireshark', 'putty', 'winscp', 'filezilla', 'cyberduck',
      'teamviewer', 'anydesk', 'parsec', 'moonlight', 'sunshine',
      'remotedesktop', 'mstsc', 'realvnc', 'tightvnc', 'rustdesk',
      'nmap', 'fiddler', 'postman', 'insomnia', 'charles', 'proxyman',
      'ngrok', 'tailscale', 'zerotier', 'netsetman'
    ],
    security: [
      'antivirus', 'defender', 'msmpeng', 'mpcmdrun', 'mpdefender', 
      'nissrv', 'malware', 'kaspersky', 'avast', 'norton', 'bitdefender',
      'eset', 'avg', 'mcafee', 'sophos', 'f-secure', 'trendmicro',
      'keepass', 'lastpass', '1password', 'bitwarden', 'dashlane',
      'smartscreen', 'securityhealth', 'comodo', 'glasswire',
      'veracrypt', 'truecrypt', 'cryptomator', 'gpg4win'
    ],
    virtualization: [
      'vmware', 'virtualbox', 'hyperv', 'qemu', 'wsl', 'wslhost',
      'vagrant', 'multipass', 'parallels', 'proxmox', 'virt-manager',
      'vmcompute', 'vmms', 'vmmem'
    ],
    cloudStorage: [
      'dropbox', 'onedrive', 'googledrive', 'icloud', 'mega', 
      'sync.com', 'pcloud', 'nextcloud', 'owncloud', 'box',
      'spideroak', 'tresorit', 'resilio', 'syncthing'
    ],
    ai: [
      // AI Tools & Assistants
      'ollama', 'lmstudio', 'gpt4all', 'koboldcpp', 'text-generation',
      'oobabooga', 'llamacpp', 'localai',
      // AI Notebooks
      'jupyter', 'jupyterlab', 'colab', 'kaggle',
      // ML Frameworks (when running)
      'tensorboard', 'mlflow', 'wandb',
      // Image AI
      'stable diffusion', 'comfyui', 'automatic1111', 'invoke',
      'midjourney', 'dall-e', 'fooocus',
      // Voice AI
      'whisper', 'tortoise', 'bark', 'coqui'
    ],
    streaming: [
      // Streaming Software
      'obs', 'obs64', 'streamlabs', 'xsplit', 'twitch studio',
      'nvidia shadowplay', 'geforce experience', 'radeon software',
      // Streaming Services
      'netflix', 'prime video', 'disney', 'hulu', 'hbo max',
      'peacock', 'paramount', 'crunchyroll', 'funimation', 'plex',
      'jellyfin', 'emby', 'kodi',
      // Game streaming
      'parsec', 'moonlight', 'steam link', 'stadia', 'xcloud',
      'geforce now', 'playstation', 'remote play'
    ],
    system: [
      'system', 'svchost', 'explorer.exe', 'dwm.exe', 'csrss', 
      'winlogon', 'services.exe', 'lsass', 'smss', 'wininit',
      'taskhostw', 'runtimebroker', 'dllhost', 'conhost', 'sihost',
      'ctfmon', 'fontdrvhost', 'spoolsv', 'searchhost', 'searchindexer',
      'shellexperiencehost', 'startmenuexperiencehost', 'textinputhost',
      'applicationframehost', 'systemsettings', 'settingssynchost',
      'backgroundtaskhost', 'gamingservices', 'securityhealthsystray',
      'useroobe', 'lockapp', 'logonui', 'dashost', 'apphelp',
      'wudfhost', 'wmiprvse', 'msiexec', 'trustedinstaller',
      'tiworker', 'searchprotocol', 'audiodg', 'nvcontainer', 
      'nvdisplay', 'amdrsserv', 'radeonsoft', 'igfx'
    ]
  };
  
  processes.forEach(p => {
    const txt = (p.name + ' ' + p.command + ' ' + p.path).toLowerCase();
    let found = false;
    
    // First check keyword matching
    for (const [c, ks] of Object.entries(kw)) {
      if (ks.some(k => txt.includes(k))) {
        cat[c].push(p);
        found = true;
        break;
      }
    }
    
    // If not found in keywords, check LLM categorization
    if (!found && llmCategorizations) {
      const processNameLower = p.name.toLowerCase();
      const llmCategory = llmCategorizations[processNameLower];
      if (llmCategory && cat[llmCategory]) {
        cat[llmCategory].push(p);
        found = true;
      }
    }
    
    if (!found) cat.other.push(p);
  });
  return cat;
}

export function generateProcessSummary(pd, llmCategorizations = null) {
  const ps = pd.processes || [];
  const cat = categorizeProcesses(ps, llmCategorizations);
  
  // Calculate thread statistics properly - filter out 0 threads
  const processesWithThreads = ps.filter(p => p.threads && p.threads > 0);
  const avgThreads = processesWithThreads.length > 0 
    ? processesWithThreads.reduce((s, p) => s + p.threads, 0) / processesWithThreads.length 
    : 0;
  
  // On Windows, user field is often empty. Use heuristics:
  // System processes typically have specific names or no user
  const systemProcessNames = ['system', 'idle', 'registry', 'csrss', 'wininit', 'services', 'lsass', 'svchost', 'dwm', 'winlogon'];
  const isSystemProcess = (p) => {
    const name = p.name.toLowerCase();
    if (systemProcessNames.some(sp => name.includes(sp))) return true;
    if (p.user && (p.user.toUpperCase().includes('SYSTEM') || p.user.toUpperCase().includes('NT AUTHORITY'))) return true;
    // If user is empty and it's a low-level Windows process
    if (!p.user && (p.pid < 100 || name.startsWith('nt') || name.startsWith('sm'))) return true;
    return false;
  };
  
  const userProcs = ps.filter(p => !isSystemProcess(p));
  const systemProcs = ps.filter(p => isSystemProcess(p));
  
  const summary = {
    timestamp: pd.timestamp,
    totalProcesses: ps.length,
    systemStats: pd.stats || {},
    statistics: {
      totalCpuUsage: ps.reduce((s, p) => s + (p.cpu || 0), 0).toFixed(2),
      totalMemUsage: ps.reduce((s, p) => s + (p.mem || 0), 0).toFixed(2),
      averageThreadsPerProcess: avgThreads.toFixed(1),
      userProcessCount: userProcs.length,
      systemProcessCount: systemProcs.length,
      activeServicesCount: ps.filter(p => p.name.toLowerCase().includes('service') || p.name.toLowerCase().includes('svchost')).length
    },
    topProcesses: {
      byCpu: ps.filter(p => p.cpu > 5).sort((a, b) => b.cpu - a.cpu).slice(0, 10).map(p => ({
        name: p.name,
        cpu: p.cpu.toFixed(1),
        mem: p.mem.toFixed(1),
        threads: p.threads,
        user: p.user
      })),
      byMemory: ps.filter(p => p.mem > 2).sort((a, b) => b.mem - a.mem).slice(0, 10).map(p => ({
        name: p.name,
        cpu: p.cpu.toFixed(1),
        mem: p.mem.toFixed(1),
        user: p.user
      }))
    },
    categories: {},
    uniqueProcessNames: [...new Set(ps.map(p => p.name))]
  };
  for (const [c, procs] of Object.entries(cat)) {
    summary.categories[c] = {
      count: procs.length,
      totalCpu: procs.reduce((s, p) => s + (p.cpu || 0), 0).toFixed(1),
      totalMem: procs.reduce((s, p) => s + (p.mem || 0), 0).toFixed(1),
      processes: procs.map(p => p.name),
      topProcess: procs.length > 0 ? {
        name: procs[0].name,
        cpu: procs[0].cpu.toFixed(1),
        mem: procs[0].mem.toFixed(1)
      } : null
    };
  }
  return summary;
}
