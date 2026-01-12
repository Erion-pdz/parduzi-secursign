const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // Pour la sécurité (Hash)

const app = express();
const PORT = 3000;

// Configuration
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Augmenté pour les images HD
app.use(express.static(path.join(__dirname, '../public'))); // Servir le frontend

// Chemins
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'template.xlsx');
const OUTPUT_DIR = path.join(__dirname, 'output');
const DATA_DIR = path.join(__dirname, 'data');

// Vérification des dossiers
[OUTPUT_DIR, DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// --- ROUTE PRINCIPALE : GÉNÉRATION DU QUITUS ---
app.post('/api/generate', async (req, res) => {
    try {
        console.log("📥 Réception d'une demande de quitus...");
        const data = req.body;
        
        // 1. CRÉATION DE LA PREUVE DE SÉCURITÉ (HASH SHA-256)
        // C'est ce qui fait "Master 1" : on scelle numériquement les données
        const rawString = `${data.numeroBon}-${data.clientName}-${data.timestamp}-${data.gps.lat}`;
        const securityHash = crypto.createHash('sha256').update(rawString).digest('hex');

        // 2. CHARGEMENT DU TEMPLATE EXCEL
        const workbook = new ExcelJS.Workbook();
        if (!fs.existsSync(TEMPLATE_PATH)) {
            throw new Error("Le fichier template.xlsx est introuvable dans server/templates/");
        }
        await workbook.xlsx.readFile(TEMPLATE_PATH);
        const worksheet = workbook.worksheets[0];

        // 3. REMPLISSAGE DES DONNÉES TEXTE
        // Note: Dans ton Excel, tu devras repérer les cellules (ex: B5, C10...)
        // Adapte les cellules ci-dessous selon ton vrai fichier Excel !
        worksheet.getCell('C5').value = data.numeroBon;        // N° Bon
        worksheet.getCell('C7').value = data.clientName;       // Nom Client
        worksheet.getCell('C8').value = data.address;          // Adresse
        worksheet.getCell('C10').value = data.object;          // Objet travaux
        worksheet.getCell('B15').value = data.observations;    // Remarques

        // Insertion des métadonnées techniques (Preuves)
        worksheet.getCell('B30').value = `Horodatage : ${data.timestamp}`;
        worksheet.getCell('B31').value = `Position GPS : ${data.gps.lat}, ${data.gps.lng}`;
        worksheet.getCell('B32').value = `ID Sécurité (Hash) : ${securityHash}`;

        // 4. INSERTION DES SIGNATURES (IMAGES)
        const addImageToSheet = (base64Data, range) => {
            if (!base64Data) return;
            const imageId = workbook.addImage({
                base64: base64Data,
                extension: 'png',
            });
            worksheet.addImage(imageId, range); // ex: 'A35:D40'
        };

        addImageToSheet(data.signatureClient, 'A35:C40'); // Zone Signature Client
        addImageToSheet(data.signatureTech, 'E35:G40');   // Zone Signature Parduzi

        // 5. SAUVEGARDE
        const filename = `Quitus_${data.numeroBon}_${Date.now()}.xlsx`;
        const filePath = path.join(OUTPUT_DIR, filename);
        
        // Sauvegarde aussi le JSON brut pour l'audit
        fs.writeFileSync(path.join(DATA_DIR, filename.replace('.xlsx', '.json')), JSON.stringify({...data, securityHash}, null, 2));
        
        await workbook.xlsx.writeFile(filePath);
        console.log(`✅ Fichier généré : ${filename}`);

        res.json({ success: true, filename: filename, hash: securityHash });

    } catch (error) {
        console.error("❌ Erreur:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur Parduzi lancé sur http://localhost:${PORT}`);
});