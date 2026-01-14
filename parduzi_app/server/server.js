const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const OUTPUT_DIR = path.join(__dirname, 'output');
const DATA_DIR = path.join(__dirname, 'data');
const TEMPLATE_DIR = path.join(__dirname, 'templates');

// --- C'EST ICI QUE LA MAGIE OPÈRE (CONFIGURATION) ---
// Pour chaque bailleur, on définit le nom du fichier et les coordonnées des cellules
const TEMPLATE_CONFIG = {
    'parduzi': {
        file: 'parduzi_standard.xlsx',
        mapping: {
            bon: 'C5', client: 'C7', adresse: 'C8', objet: 'C10', 
            remarques: 'B15', gps: 'B31', hash: 'B32', date: 'B30'
        },
        sigClient: 'A35:C40', // Zone signature client
        sigTech: 'E35:G40'    // Zone signature technicien
    },
    'hmp': {
        file: 'hmp.xlsx',
        mapping: {
            // Chez HMP, les cases sont peut-être différentes (exemple)
            bon: 'E2', client: 'B10', adresse: 'B12', objet: 'B15', 
            remarques: 'A20', gps: 'A40', hash: 'A41', date: 'E4'
        },
        sigClient: 'B45:D50',
        sigTech: 'F45:H50'
    },
    'erilia': {
        file: 'erilia.xlsx',
        mapping: {
            bon: 'H1', client: 'C5', adresse: 'C6', objet: 'C8', 
            remarques: 'B20', gps: 'B50', hash: 'B51', date: 'H2'
        },
        sigClient: 'A55:C60',
        sigTech: 'E55:G60'
    },
    'famille_provence': {
        file: 'famille_provence.xlsx',
        mapping: {
            bon: 'D4', client: 'B8', adresse: 'B9', objet: 'B11', 
            remarques: 'B25', gps: 'B60', hash: 'B61', date: 'D5'
        },
        sigClient: 'B65:D70',
        sigTech: 'F65:H70'
    }
};

app.post('/api/generate', async (req, res) => {
    try {
        const data = req.body;
        
        // 1. Récupérer la config du bailleur choisi
        const bailleurId = data.templateId; // ex: 'hmp'
        const config = TEMPLATE_CONFIG[bailleurId];

        if (!config) throw new Error("Bailleur inconnu ou template non configuré");

        const templatePath = path.join(TEMPLATE_DIR, config.file);
        if (!fs.existsSync(templatePath)) throw new Error(`Fichier Excel introuvable : ${config.file}`);

        // 2. Hash de sécurité
        const rawString = `${data.numeroBon}-${data.clientName}-${data.timestamp}`;
        const securityHash = crypto.createHash('sha256').update(rawString).digest('hex');

        // 3. Charger l'Excel
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.worksheets[0];

        // 4. Remplissage DYNAMIQUE grâce au mapping
        const map = config.mapping;
        
        worksheet.getCell(map.bon).value = data.numeroBon;
        worksheet.getCell(map.client).value = data.clientName;
        worksheet.getCell(map.adresse).value = data.address;
        worksheet.getCell(map.objet).value = data.object;
        worksheet.getCell(map.remarques).value = data.observations;
        worksheet.getCell(map.date).value = data.timestamp;
        
        // Métadonnées techniques
        worksheet.getCell(map.gps).value = `GPS: ${data.gps.lat}, ${data.gps.lng}`;
        worksheet.getCell(map.hash).value = `ID: ${securityHash}`;

        // 5. Signatures (positions dynamiques aussi)
        const addImage = (base64, range) => {
            if (!base64) return;
            const imgId = workbook.addImage({ base64: base64, extension: 'png' });
            worksheet.addImage(imgId, range);
        };

        addImage(data.signatureClient, config.sigClient);
        addImage(data.signatureTech, config.sigTech);

        // 6. Sauvegarde
        const filename = `Quitus_${bailleurId.toUpperCase()}_${data.numeroBon}.xlsx`;
        await workbook.xlsx.writeFile(path.join(OUTPUT_DIR, filename));

        res.json({ success: true, filename: filename, hash: securityHash });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ... (Le reste du code server.js pour le port listen reste pareil)
app.listen(PORT, () => console.log(`Serveur prêt sur http://localhost:${PORT}`));