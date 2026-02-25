# Script PowerShell pour lancer Parduzi SecureSign
# Usage: .\launch.ps1

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Parduzi SecureSign - Launcher PowerShell      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérifier les prŕequis
Write-Host "🔍 Vérification des prérequis..." -ForegroundColor Yellow

# Vérifier Node.js
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js trouvé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERREUR: Node.js n'est pas installé" -ForegroundColor Red
    Write-Host "Télécharger depuis: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# Vérifier Android Studio
$androidStudioPath = "C:\Program Files\Android\Android Studio\bin\studio.exe"
$androidStudioPathAlt = "C:\Program Files (x86)\Android\Android Studio\bin\studio.exe"

if ((Test-Path $androidStudioPath) -or (Test-Path $androidStudioPathAlt)) {
    Write-Host "✅ Android Studio trouvé" -ForegroundColor Green
} else {
    Write-Host "⚠️  Android Studio non trouvé (optionnel)" -ForegroundColor Yellow
}

# Aller au dossier parduzi_app
Write-Host ""
Write-Host "📁 Vérification des dossiers..." -ForegroundColor Yellow
Set-Location -Path $PSScriptRoot
if (-not (Test-Path "parduzi_app")) {
    Write-Host "❌ ERREUR: Dossier parduzi_app non trouvé" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Set-Location -Path "parduzi_app"
Write-Host "✅ Dossier parduzi_app trouvé" -ForegroundColor Green

# Installer les dépendances
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "📦 Installation des dépendances npm..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
}

# Lancer le serveur
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║ ✅ SERVEUR BACKEND EN DÉMARRAGE...              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "🌐 API disponible sur:" -ForegroundColor Cyan
Write-Host "   • Émulateur: http://10.0.2.2:3000" -ForegroundColor White
Write-Host "   • Localhost: http://localhost:3000" -ForegroundColor White
Write-Host ""

Write-Host "📱 Pour lancer l'app Android:" -ForegroundColor Cyan
Write-Host "   1. Ouvrir Android Studio" -ForegroundColor White
Write-Host "   2. Projet → Importer" -ForegroundColor White
Write-Host "   3. Sélectionner: parduzi-android" -ForegroundColor White
Write-Host "   4. Cliquer Run (Shift + F10)" -ForegroundColor White
Write-Host ""

Write-Host "Appuyez sur Ctrl+C pour arrêter le serveur" -ForegroundColor Yellow
Write-Host ""

# Lancer npm start
npm start

Write-Host ""
Write-Host "❌ Serveur arrêté" -ForegroundColor Red
