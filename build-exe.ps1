# Script per creare un eseguibile standalone
# Richiede: npm install -g pkg

Write-Host "🔨 Creazione eseguibile PC Config Analyzer..." -ForegroundColor Cyan

# 1. Installa pkg se non presente
Write-Host "`n[1/3] Controllo pkg..." -ForegroundColor Yellow
try {
    $pkgVersion = npm list -g pkg --depth=0 2>&1 | Out-String
    if ($pkgVersion -notmatch "pkg@") {
        Write-Host "  Installazione pkg..." -ForegroundColor Yellow
        npm install -g pkg
    }
    Write-Host "  ✓ pkg pronto" -ForegroundColor Green
} catch {
    Write-Host "  Installazione pkg..." -ForegroundColor Yellow
    npm install -g pkg
}

# 2. Crea wrapper script per l'exe
Write-Host "`n[2/3] Creazione wrapper..." -ForegroundColor Yellow

$wrapperContent = @"
#!/usr/bin/env node
// PC Config Analyzer - Standalone Wrapper

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🖥️  PC Configuration Analyzer v2.0.0\n');

// Controlla se node_modules esiste
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installazione dipendenze necessarie...\n');
    const npm = spawn('npm', ['install'], { 
        cwd: __dirname,
        stdio: 'inherit',
        shell: true 
    });
    
    npm.on('close', (code) => {
        if (code === 0) {
            console.log('\n✓ Dipendenze installate!\n');
            startApp();
        } else {
            console.error('\n✗ Errore durante l\'installazione delle dipendenze');
            process.exit(1);
        }
    });
} else {
    startApp();
}

function startApp() {
    // Passa tutti gli argomenti al programma principale
    const args = process.argv.slice(2);
    const mainScript = path.join(__dirname, 'src', 'index.js');
    
    const app = spawn('node', [mainScript, ...args], {
        stdio: 'inherit',
        shell: true
    });
    
    app.on('close', (code) => {
        process.exit(code);
    });
}
"@

$wrapperPath = Join-Path $PSScriptRoot "standalone.js"
$wrapperContent | Out-File -FilePath $wrapperPath -Encoding UTF8
Write-Host "  ✓ Wrapper creato" -ForegroundColor Green

# 3. Compila l'eseguibile
Write-Host "`n[3/3] Compilazione eseguibile..." -ForegroundColor Yellow
Write-Host "  (Questo può richiedere alcuni minuti)..." -ForegroundColor Gray

try {
    # Crea exe per Windows
    pkg $wrapperPath --targets node18-win-x64 --output "PC-Config-Analyzer.exe"
    
    if (Test-Path "PC-Config-Analyzer.exe") {
        Write-Host "`n✓ Eseguibile creato con successo!" -ForegroundColor Green
        Write-Host "`n📁 File: PC-Config-Analyzer.exe" -ForegroundColor Cyan
        Write-Host "`nPuoi ora distribuire questo file insieme a:" -ForegroundColor Yellow
        Write-Host "  - La cartella src/" -ForegroundColor White
        Write-Host "  - Il file package.json" -ForegroundColor White
        Write-Host "  - Il file launcher.ps1 (opzionale)" -ForegroundColor White
        
        # Cleanup
        Remove-Item $wrapperPath -Force
    } else {
        Write-Host "✗ Errore durante la creazione dell'eseguibile" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Errore: $_" -ForegroundColor Red
    Write-Host "`nAssicurati di avere pkg installato: npm install -g pkg" -ForegroundColor Yellow
}

Write-Host "`nPremi un tasto per continuare..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
