@echo off
REM Script de lancement pour Windows - Parduzi SecureSign
REM Utilisation: Double-cliquer sur ce fichier ou lancer depuis cmd

echo.
echo =========================================
echo  Parduzi SecureSign - Launcher Windows
echo =========================================
echo.

REM Vérifier que Node.js est installé
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ ERREUR: Node.js n'est pas installé
    echo.
    echo Téléchargez-le depuis: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js trouvé: %NODE_VERSION%

REM Aller au dossier parduzi_app
cd /d "%~dp0parduzi_app" || (
    echo ❌ ERREUR: Dossier parduzi_app non trouvé
    pause
    exit /b 1
)

REM Vérifier node_modules
if not exist "node_modules" (
    echo.
    echo 📦 Installation des dépendances npm...
    call npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation
        pause
        exit /b 1
    )
)

REM Lancer le serveur
echo.
echo =====================================
echo ✅ Démarrage du serveur backend...
echo =====================================
echo.
echo 🌐 Serveur accessible sur: http://localhost:3000
echo 📍 IP Émulateur: http://10.0.2.2:3000
echo.
echo ℹ️  Pour lancer l'app Android:
echo    1. Ouvrir Android Studio
echo    2. Importer: parduzi-android
echo    3. Cliquer Run (Shift + F10)
echo.

call npm start

pause
