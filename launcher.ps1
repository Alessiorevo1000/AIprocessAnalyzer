$ErrorActionPreference = "Stop"
Write-Host "PC Configuration Analyzer - Auto Launcher v2.0.0" -ForegroundColor Cyan

function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) { return $true }
    } catch { return $false }
    return $false
}

Write-Host "`n[1/4] Controllo Node.js..." -ForegroundColor Cyan
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "  Node.js gia installato: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  Node.js non trovato. Installa da https://nodejs.org" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "`n[2/4] Controllo dipendenze..." -ForegroundColor Cyan
$nodeModulesPath = Join-Path $PSScriptRoot "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "  Installazione dipendenze npm..." -ForegroundColor Yellow
    Push-Location $PSScriptRoot
    npm install
    Pop-Location
    Write-Host "  Dipendenze installate!" -ForegroundColor Green
} else {
    Write-Host "  Dipendenze gia installate" -ForegroundColor Green
}

Write-Host "`n[3/4] Controllo Ollama..." -ForegroundColor Cyan
if (Test-Command "ollama") {
    Write-Host "  Ollama gia installato" -ForegroundColor Green
    
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        Write-Host "  Ollama e in esecuzione" -ForegroundColor Green
    } catch {
        Write-Host "  Avvio Ollama..." -ForegroundColor Yellow
        Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "  Ollama non trovato. Installa da https://ollama.com" -ForegroundColor Yellow
}

Write-Host "`n[4/4] Controllo configurazione..." -ForegroundColor Cyan
$configPath = Join-Path $PSScriptRoot "pc-analyzer.config.json"
if (-not (Test-Path $configPath)) {
    Write-Host "  Creazione configurazione..." -ForegroundColor Yellow
    Push-Location $PSScriptRoot
    node src/index.js --init-config 2>&1 | Out-Null
    Pop-Location
    Write-Host "  Configurazione creata!" -ForegroundColor Green
} else {
    Write-Host "  Configurazione gia presente" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Avvio PC Config Analyzer" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Scegli un opzione:" -ForegroundColor Cyan
Write-Host "  1) Analisi completa (con AI e network)" -ForegroundColor White
Write-Host "  2) Analisi rapida (senza AI)" -ForegroundColor White
Write-Host "  3) Solo CPU" -ForegroundColor White
Write-Host "  4) Solo memoria" -ForegroundColor White
Write-Host "  5) Report HTML completo" -ForegroundColor White
Write-Host "  6) Uscita`n" -ForegroundColor White

$choice = Read-Host "Inserisci il numero (1-6)"

Push-Location $PSScriptRoot

switch ($choice) {
    "1" {
        Write-Host "`nAvvio analisi completa..." -ForegroundColor Cyan
        node src/index.js --html
    }
    "2" {
        Write-Host "`nAvvio analisi rapida..." -ForegroundColor Cyan
        node src/index.js --html --no-llm --no-network
    }
    "3" {
        Write-Host "`nAnalisi CPU..." -ForegroundColor Cyan
        node src/index.js --category cpu --html
    }
    "4" {
        Write-Host "`nAnalisi memoria..." -ForegroundColor Cyan
        node src/index.js --category memory --html
    }
    "5" {
        Write-Host "`nGenerazione report HTML..." -ForegroundColor Cyan
        node src/index.js --html --verbose
    }
    "6" {
        Write-Host "`nArrivederci!" -ForegroundColor Cyan
        Pop-Location
        exit 0
    }
    default {
        Write-Host "`nScelta non valida, avvio analisi completa..." -ForegroundColor Yellow
        node src/index.js --html
    }
}

Pop-Location
Write-Host "`nAnalisi completata!" -ForegroundColor Green
