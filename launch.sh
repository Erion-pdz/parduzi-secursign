#!/bin/bash

# Script pour lancer rapidement l'application Android + Serveur Backend
# Usage: ./launch.sh
# Ou sur Windows: essayer avec PowerShell ou utiliser Android Studio directement

echo "🚀 Lancement Parduzi SecureSign..."
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Vérifier que le serveur Node.js est installé
echo "${YELLOW}1️⃣  Vérification de Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "${RED}❌ Node.js n'est pas installé${NC}"
    echo "Télécharger depuis: https://nodejs.org/"
    exit 1
fi
echo "${GREEN}✅ Node.js trouvé$(node -v)${NC}"

# 2. Démarrer le serveur backend
echo ""
echo "${YELLOW}2️⃣  Démarrage du serveur Node.js...${NC}"
cd "./parduzi_app" || { echo "Dossier parduzi_app introuvable"; exit 1; }

if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances npm..."
    npm install
fi

echo "${GREEN}✅ Serveur backend lancé sur http://localhost:3000${NC}"
npm start &
SERVER_PID=$!

# 3. Informations pour Android Studio
echo ""
echo "${YELLOW}3️⃣  Instructions pour Android Studio:${NC}"
echo "   1. Ouvrir Android Studio"
echo "   2. Importer le dossier: parduzi-android"
echo "   3. Attendre que Gradle configure les dépendances"
echo "   4. Cliquer sur le bouton ▶️ Run (Shift + F10)"
echo ""

echo "${GREEN}✅ Prêt pour développement !${NC}"
echo ""
echo "Note: Le serveur backend tourne en background sur le port 3000"
echo "Pour l'arrêter: kill $SERVER_PID ou Ctrl+C"

# Garder le script actif
wait $SERVER_PID
