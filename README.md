# PC Configuration Analyzer v2.0

A powerful Node.js tool that analyzes your PC configuration, detects potential misconfigurations, monitors network activity, and uses AI to determine your user profile based on running processes.

## ✨ Features

### Core Analysis
- **🖥️ Hardware Analysis**: CPU, RAM, GPU, and storage device detection
- **📊 Process Analysis**: Reads and categorizes all running processes
- **🌐 Network Monitoring**: Active connections, open ports, and security analysis
- **🔒 Security Assessment**: Identifies potentially dangerous open ports and suspicious connections

### AI-Powered Features
- **🤖 User Profiling**: Uses Ollama with Gemma2:9B to analyze your usage patterns
- **🔍 Smart Categorization**: LLM-powered process identification for unknown executables
- **💡 Recommendations**: Personalized suggestions based on your profile

### Output Options
- **📄 Multiple Formats**: Text, JSON, HTML, and Markdown reports
- **🎨 Color-coded**: Beautiful terminal output with severity indicators
- **📁 File Export**: Save reports to any location

### Advanced Features
- **⚙️ Configuration File**: Customize analysis with `pc-analyzer.config.json`
- **💾 LLM Cache**: Avoid redundant AI analysis for known processes
- **🚀 Fast Mode**: Skip LLM analysis for quick system overview
- **📦 Extensible**: Easy to add custom process categories and keywords

## 📋 Requirements

- Node.js 18+ (for ES modules support)
- [Ollama](https://ollama.ai) installed and running (optional, for AI features)
- Gemma2:9B model downloaded (`ollama pull gemma2:9b`)

## 🚀 Quick Start

### Option 1: Auto-Installer (Windows) ⭐ **RECOMMENDED**

**Easiest method** - Double-click `PC-Config-Analyzer.bat` and it will:
1. ✅ Check and install Node.js if missing
2. ✅ Check and install Ollama if missing
3. ✅ Install all npm dependencies automatically
4. ✅ Download the AI model (gemma2:9b)
5. ✅ Create configuration file
6. ✅ Launch the application with a menu

**No manual installation required!** Just download the project and run the `.bat` file.

### Option 2: Manual Installation

```bash
# Clone the repository
git clone <repository-url>
cd pc-config-analyzer

# Install dependencies
npm install

# (Optional) Install globally
npm link

# (Optional) Install and start Ollama
# Visit https://ollama.ai for installation instructions
ollama pull gemma2:9b
ollama serve
```

## 🎯 Usage

### Quick Launch (Windows)
Double-click `PC-Config-Analyzer.bat` for interactive menu:
1. Full analysis (with AI and network)
2. Quick analysis (without AI)
3. CPU only
4. Memory only
5. Full HTML report
6. Exit

### Command Line
ollama serve
```

## 📖 Usage

### Basic Commands

```bash
# Full analysis with AI
npm start

# Quick analysis without AI
npm run analyze:fast

# JSON output
npm run analyze:json

# Generate HTML report
npm run analyze:html

# Generate Markdown report
npm run analyze:md

# Create configuration file
npm run init-config
```

### CLI Options

```bash
pc-analyzer [options]

Options:
  -V, --version              Output version number
  -v, --verbose              Show detailed output during analysis
  -j, --json                 Output in JSON format
  --html                     Generate HTML report (saved automatically)
  --markdown                 Generate Markdown report (saved automatically)
  -o, --output <file>        Save report to specific file
  --console                  Show report in console (in addition to file save)
  --no-llm                   Skip LLM analysis (faster)
  --no-network               Skip network analysis
  --max-iterations <n>       Max LLM iterations (default: 5)
  --model <name>             Ollama model to use (default: gemma2:9b)
  --ollama-url <url>         Ollama server URL (default: http://localhost:11434)
  -c, --config <file>        Custom configuration file
  --init-config              Create example configuration file
  --category <cat>           Analyze single category (cpu, memory, graphics, storage, os, processes)
  --top <n>                  Show only top N processes (default: 20)
  --quiet                    Minimal output
  --no-color                 Disable colored output
  -h, --help                 Display help
```

### Examples

```bash
# Analyze only CPU information - saves and opens HTML report
node src/index.js --category cpu --html

# Quick system overview without AI - auto-saved
node src/index.js --no-llm --no-network --html

# Generate detailed HTML report (opens automatically in browser)
node src/index.js --html

# Generate and save without opening browser
node src/index.js --html -o system-report.html

# Use different Ollama model
node src/index.js --model llama2:13b

# Verbose analysis with custom output
node src/index.js -v -o my-report.json --json

# Show report in console AND save to file
node src/index.js --json --console
```

### 💾 Automatic File Saving

Starting from v2.0.0, all reports are **automatically saved** with timestamps:
- HTML reports: `pc-analysis-<timestamp>.html` (opens in browser automatically)
- JSON reports: `pc-analysis-<timestamp>.json`
- Markdown reports: `pc-analysis-<timestamp>.md`
- Text reports: `pc-analysis-<timestamp>.txt`

Category-specific reports use the format: `<category>-analysis-<timestamp>.<ext>`

Use `--console` flag to display the report in the terminal in addition to saving it.

## ⚙️ Configuration

Create a configuration file with:

```bash
npm run init-config
```

This creates `pc-analyzer.config.json`:

```json
{
  "ollamaUrl": "http://localhost:11434",
  "ollamaModel": "gemma2:9b",
  "ollamaTimeout": 120000,
  "useLlm": true,
  "maxLlmIterations": 5,
  "analyzeNetwork": true,
  "maxProcesses": 400,
  "verbose": false,
  "colorOutput": true,
  "autoOpen": true,
  "useCache": true,
  "cacheDir": ".pc-analyzer-cache",
  "cacheTtlHours": 24
}
  "maxProcesses": 400,
  "verbose": false,
  "colorOutput": true,
  "useCache": true,
  "cacheDir": ".pc-analyzer-cache",
  "cacheTtlHours": 24,
  "enabledCategories": [
    "development", "gaming", "office", "browsers", "media",
    "communication", "database", "networking", "security",
    "virtualization", "cloudStorage", "system", "ai", "streaming"
  ],
  "customKeywords": {},
  "excludeProcesses": ["system idle process", "system", "registry"],
  "reportFormat": "text",
  "detectSuspiciousProcesses": true,
  "alertOnSuspicious": true
}
```

## 📊 What It Analyzes

### System Hardware
- CPU specifications (cores, speed, virtualization)
- Memory (total, usage, availability)
- GPU details (vendor, model, VRAM)
- Storage devices (type, size, interface)
- Operating system information

### Network Analysis
- Active network connections
- Listening ports with service identification
- External connections
- Security risk assessment
- Interface statistics

### Running Processes (15+ categories)
| Category | Examples |
|----------|----------|
| 💻 Development | VS Code, Git, Node.js, Docker, Python |
| 🎮 Gaming | Steam, Epic Games, game executables |
| 📊 Office | Microsoft Office, Notion, Obsidian |
| 🌐 Browsers | Chrome, Firefox, Edge, Brave |
| 🎵 Media | Spotify, VLC, Photoshop, Blender |
| 💬 Communication | Discord, Slack, Zoom, Teams |
| 🗄️ Database | PostgreSQL, MySQL, MongoDB, Redis |
| 🔗 Networking | VPNs, Wireshark, TeamViewer |
| 🔒 Security | Windows Defender, Password Managers |
| 📦 Virtualization | VMware, VirtualBox, WSL, Hyper-V |
| ☁️ Cloud Storage | Dropbox, OneDrive, Google Drive |
| 🤖 AI | Ollama, LM Studio, Stable Diffusion |
| 📺 Streaming | OBS, Netflix, Plex, Jellyfin |
| ⚙️ System | Windows services and core processes |

### AI User Profiling
Using Ollama, the tool determines:
- **User Profile Type**: Developer, Gamer, Content Creator, etc.
- **Technical Level**: Basic, Intermediate, Advanced, Expert
- **Main Activities**: Based on running software
- **Usage Patterns**: Work habits and preferences
- **Recommendations**: Personalized optimization suggestions
- **Main Activities**: Primary tasks and workflows
- **Usage Patterns**: How you use your comput──────────┐
│ Component   │ Details                                │
├─────────────┼────────────────────────────────────────┤
│ CPU         │ Intel Core i7-10700K                   │
│ Cores       │ 8 physical / 16 logical                │
│ Speed       │ 3.8GHz                                 │
│ Memory      │ 32GB total                             │
│ Used Memory │ 45.2%                                  │
│ GPU         │ NVIDIA GeForce RTX 3070                │
│ Storage     │ 2 disk(s)                              │
│ OS          │ Windows 11 Pro                         │
└─────────────┴────────────────────────────────────────┘

👤 User Profile Analysis
========================
╔═════════════════════════════════════════════════════════════════════╗
║  PROFILO: SVILUPPATORE                                              ║
║  Livello Tecnico: Avanzato                                          ║
╚═════════════════════════════════════════════════════════════════════╝

Confidenza dell'analisi: 92%
[██████████████████████████████████████████████░░░]

📋 DESCRIZIONE
Sviluppatore full-stack che lavora principalmente con Node.js e Python,
con forte utilizzo di Docker e strumenti di virtualizzazione. Uso intenso
di VS Code e gestione multipla di browser per testing.

🎯 ATTIVITÀ PRINCIPALI
   1. Sviluppo software con Node.js e Python
   2. Containerizzazione con Docker
   3. Testing multi-browser
   4. Gestione database e API

✨ CARATTERISTICHE RILEVATE
   ✓ Uso intensivo di IDE professionali (VS Code)
   ✓ Ambiente di sviluppo completo con Docker e WSL
   ✓ Gestione di database multipli (PostgreSQL, MongoDB)
   ✓ Utilizzo di strumenti DevOps

📊 PATTERN DI UTILIZZO
   • Multitasking intenso tra editor, terminali e browser
   • Uso frequente di virtualizzazione per ambienti isolati

💡 RACCOMANDAZIONI
   → Considera l'upgrade a 64GB RAM per container multipli
   → SSD NVMe aggiuntivo per migliorare i tempi di build
   → Secondo monitor per aumentare la produttività

📈 STATISTICHE PROCESSI
┌──────────────────────┬────────┐
│ Metrica              │ Valore │
├──────────────────────┼────────┤
│ Processi totali      │ 247    │
│ Processi utente      │ 89     │
│ Processi di sistema  │ 158    │
│ Carico CPU           │ 18.3%  │
│ Uso memoria processi │ 67.8%  │
│ Thread medi          │ 12.4   │
│ Servizi attivi       │ 42     │
└──────────────────────┴────────┘

🗂️  CATEGORIE DI APPLICAZIONI
┌──────────────────┬──────────┬────────┬────────┬──────────────────┐
│ Categoria        │ Processi │ CPU %  │ RAM %  │ App Principale   │
├──────────────────┼──────────┼and process information gathering
- `axios` - HTTP client for Ollama API communication
- `chalk` - Terminal colors and formatting
- `commander` - Command line interface
- `table` - Console table formatting

## How It Works

1. **System Analysis**: Collects hardware information using `systeminformation`
2. **Process Reading**: Scans all running processes (top 100 by CPU usage)
3. **Categorization**: Automatically categorizes processes into 12+ categories
4. **AI Analysis**: Sends detailed data to Ollama (local LLM)
5. **Profile Generation**: Gemma2:9B analyzes patterns and generates user profile
6. **Reporting**: Displays comprehensive report with recommendations

## Privacy

- **100% Local**: All analysis happens on your machine
- **No Cloud**: Data never leaves your computer
- **Ollama Required**: Uses local Ollama instance only
- **Open Source**: Full transparency of data collection

## Troubleshooting

**"Ollama is not available"**
- Ensure Ollama is installed: https://ollama.ai
- Start Ollama server: `ollama serve`
- Check it's running on port 11434

**"Model gemma2:9b not found"**
- Download the model: `ollama pull gemma2:9b`
- Wait for download to complete (several GB)

**"High memory usage during analysis"**
- Normal behavior: LLM analysis requires memory
- Close other applications if needed
- Gemma2:9B requires ~8GB RAM minimum   │ 15.2   │ svchost.exe      │
│ 📦 virtualization│ 8        │ 12.3   │ 18.7   │ docker.exe       │
│ 🗄️  database     │ 3        │ 3.2    │ 2.1    │ postgres.exe     │
└──────────────────┴──────────┴────────┴────────┴──────────────────┘

Configuration Issues
======================

ℹ️  Information (1)
1. Virtualization disabled (CPU)
   CPU virtualization is enabled and working properly
   → Continue using virtualization for Docker and WSL

Overall Assessment
==================
✓ System configuration is optimal!

### OS Issues
- Outdated Windows versions
- 32-bit architecture limitations

## Example Output

```
PC Configuration Analyzer
========================

System Summary
===============
┌─────────────┬──────────────────────────────┐
│ Component   │ Details                       │
├─────────────┼──────────────────────────────┤
│ CPU         │ Intel Core i7-10700K           │
│ Cores       │ 8 physical / 16 logical        │
│ Speed       │ 3.8GHz                        │
│ Memory      │ 16GB total                    │
│ Used Memory │ 65.2%                         │
│ GPU         │ NVIDIA GeForce RTX 3070        │
│ Storage     │ 2 disk(s)                     │
│ OS          │ win32 10.0.19045              │
└─────────────┴──────────────────────────────┘

Configuration Issues
======================

⚠️  Warnings (1)
1. Virtualization disabled (CPU)
   CPU virtualization is not enabled in BIOS/UEFI
   → Enable virtualization in BIOS settings for virtual machines and containers

Overall Assessment
==================
System is functional but has 1 issues that could impact performance.
```

## Dependencies

- `systeminformation` - System information gathering
- `chalk` - Terminal colors and formatting
- `commander` - Command line interface
- `table` - Console table formatting

## License

MIT