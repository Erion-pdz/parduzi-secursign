/**
 * PARDUZI SECURE SIGN - SERVEUR FINAL
 * Version : Avec Logo (A1:C5) + Gros Numéro Interne
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// --- EMAIL ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'parduzisecursign@gmail.com',  
        pass: 'jpki gxpq yahx dbeo'   
    }
});

// --- BDD ---
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'erion123',
    port: 5432,
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const OUTPUT_DIR = path.join(__dirname, 'output');
const TEMPLATE_DIR = path.join(__dirname, 'templates'); // L'image doit être ici !
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// --- MAPPING EXCEL (HMP 2026) ---
const TEMPLATE_CONFIG = {
    'parduzi': {
        file: 'Quitus VIDE HMP 2026.xlsx', 
        mapping: {
            interne: 'H2',      
            nom_bailleur: 'B7', 
            bon: 'B8',          
            cite: 'B9',         
            client: 'B10',      
            date: 'H7',         
            batiment: 'H8',     
            logement: 'H9',     
            etage: 'H10',       
            remarques_debut: 'A14', 
            remarques_fin: 'H18',   
            sigClient: 'A21:C25', 
            sigTech: 'F21:H25',
            hash: 'B41' 
        }
    }
};

app.post('/api/generate', async (req, res) => {
    let clientDb; 
    try {
        const data = req.body;
        const numBonFinal = data.numeroBon ? data.numeroBon : "SansBon";

        console.log(`📥 Reçu : ${data.selectedBailleur} | Interne: ${data.internalNum}`);

        const now = new Date();
        const dateJour = now.toLocaleDateString('fr-FR'); 

        const config = TEMPLATE_CONFIG['parduzi'];
        const templatePath = path.join(TEMPLATE_DIR, config.file);
        
        // Chemin vers le logo
        const logoPath = path.join(TEMPLATE_DIR, 'logo.png');
        
        if (!fs.existsSync(templatePath)) throw new Error(`Template introuvable: ${config.file}`);

        const rawString = `${data.internalNum}-${dateJour}-${data.clientName}`;
        const securityHash = crypto.createHash('sha256').update(rawString).digest('hex');

        // --- EXCEL ---
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];
        const map = config.mapping;

        // --- 1. AJOUT DU LOGO (A1 à C5) ---
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const logoId = workbook.addImage({
                buffer: logoBuffer,
                extension: 'png',
            });
            // On place l'image de A1 à C5
            ws.addImage(logoId, 'A1:C5');
        } else {
            console.warn("⚠️ Attention : logo.png introuvable dans le dossier templates");
        }

        const writeCell = (coord, value) => {
            if (!coord) return;
            const cell = ws.getCell(coord);
            cell.value = value;
            cell.alignment = { horizontal: 'left', vertical: 'middle' }; 
        };

        // --- 2. NUMÉRO INTERNE (GROS) ---
        if (map.interne) {
            const cell = ws.getCell(map.interne);
            cell.value = data.internalNum.toUpperCase();
            // Taille passée à 20 (Très grand)
            cell.font = { bold: true, size: 20, name: 'Arial' };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        
        // Champs simples
        writeCell(map.nom_bailleur, data.selectedBailleur);
        writeCell(map.cite, data.address.toUpperCase());
        writeCell(map.date, dateJour);
        writeCell(map.client, data.clientName);
        writeCell(map.batiment, data.batiment);
        writeCell(map.logement, data.logement);
        writeCell(map.etage, data.etage);
        writeCell(map.bon, data.numeroBon);

        // Détails
        if (map.remarques_debut && map.remarques_fin) {
            try { ws.mergeCells(`${map.remarques_debut}:${map.remarques_fin}`); } catch (e) {}
            const cell = ws.getCell(map.remarques_debut);
            cell.value = data.observations; 
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        }

        // Preuve Hash
        if (map.hash) ws.getCell(map.hash).value = `ID: ${securityHash.substring(0, 15)}...`;

        // Signatures
        const addSig = (base64, range) => {
            if (!base64 || !range) return;
            const imgId = workbook.addImage({ base64: base64, extension: 'png' });
            ws.addImage(imgId, range);
        };
        addSig(data.signatureClient, map.sigClient);
        addSig(data.signatureTech, map.sigTech);

        const filename = `Quitus_${data.selectedBailleur}_${data.internalNum}_${Date.now()}.xlsx`;
        const filePath = path.join(OUTPUT_DIR, filename);
        await workbook.xlsx.writeFile(filePath);

        // --- BDD ---
        clientDb = await pool.connect();
        
        // Requête SANS la colonne 'objet' (Puisque supprimée)
        // Si ta BDD plante, c'est qu'il faut enlever la colonne 'objet' dans PostgreSQL ou remettre une valeur vide
        try {
            const query = `
                INSERT INTO interventions 
                (numero_bon, bailleur, client_nom, adresse, batiment, logement, etage, observations, gps_lat, gps_lng, chemin_excel, hash_securite)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            const values = [
                numBonFinal, data.selectedBailleur, data.clientName, data.address.toUpperCase(),
                data.batiment, data.logement, data.etage,
                data.observations, data.gps.lat, data.gps.lng, 
                filePath, securityHash
            ];
            await clientDb.query(query, values);
        } catch (e) {
            // Fallback si la BDD a encore la colonne objet obligatoire
            const querySecours = `
                INSERT INTO interventions 
                (numero_bon, bailleur, client_nom, adresse, batiment, logement, etage, objet, observations, gps_lat, gps_lng, chemin_excel, hash_securite)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `;
            const valuesSecours = [
                numBonFinal, data.selectedBailleur, data.clientName, data.address.toUpperCase(),
                data.batiment, data.logement, data.etage,
                "Détails", 
                data.observations, data.gps.lat, data.gps.lng, 
                filePath, securityHash
            ];
            await clientDb.query(querySecours, valuesSecours);
        }

        // --- Email ---
        const mailOptions = {
            from: '"Parduzi App" <ne-pas-repondre@parduzi.fr>',
            to: 'contact@parduzi.fr',
            subject: `[Quitus] ${data.selectedBailleur} - ${data.internalNum}`,
            text: `Nouvelle intervention validée.\n\nBailleur : ${data.selectedBailleur}\nN° Interne : ${data.internalNum}\nClient : ${data.clientName}\nAdresse : ${data.address}\n\nDocument joint.`,
            attachments: [{ filename: filename, path: filePath }]
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, filename: filename });

    } catch (error) {
        console.error("❌ Erreur:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (clientDb) clientDb.release();
    }
});

app.listen(PORT, () => console.log(`🚀 Serveur Parduzi pret sur http://localhost:${PORT}`));