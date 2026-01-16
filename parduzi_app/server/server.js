/**
 * PARDUZI SECURE SIGN - SERVEUR COMPLET
 * Version : Finale avec Bailleur, N° Interne et Email Auto
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

// ============================================
// 1. CONFIGURATION EMAIL (GMAIL)
// ============================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'eriondu13@gmail.com',  // ⚠️ METS TON EMAIL
        pass: 'xpwn oarz yjah iqdw'       // ⚠️ METS TON MDP APP (16 lettres)
    }
});

// ============================================
// 2. CONFIGURATION BASE DE DONNÉES
// ============================================
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
const TEMPLATE_DIR = path.join(__dirname, 'templates');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// ============================================
// 3. MAPPING EXCEL (Les coordonnées)
// ============================================
const TEMPLATE_CONFIG = {
    // Configuration principale (utilise parduzi_standard.xlsx)
    'parduzi': {
        file: 'parduzi_standard.xlsx', 
        mapping: {
            interne: 'D1',     // N° Interne (En haut à droite)
            
            // -- DEBUT DU BLOC DÉCALÉ --
            nom_bailleur: 'B12', // Le choix de la liste déroulante

            cite: 'B13',       
            date: 'B15',       
            objet: 'B17',      
            client: 'B19',     
            
            batiment: 'B21',   
            logement: 'B22',   
            etage: 'B23',      
            
            bon: 'C27',        // Bon client
            
            remarques: 'D21',  // Zone de texte
            
            gps: 'B41',        
            hash: 'B42'        
        },
        sigClient: 'A33:C38',
        sigTech: 'E33:G38'
    }
};

// ============================================
// 4. ROUTE GÉNÉRATION
// ============================================
app.post('/api/generate', async (req, res) => {
    let clientDb; 
    try {
        const data = req.body;
        
        // Gestion Bon vide -> "SansBon"
        const numBonFinal = data.numeroBon ? data.numeroBon : "SansBon";

        console.log(`📥 Reçu : ${data.selectedBailleur} | Interne: ${data.internalNum}`);

        const now = new Date();
        const dateJour = now.toLocaleDateString('fr-FR'); 

        // On utilise toujours le fichier standard
        const config = TEMPLATE_CONFIG['parduzi'];
        const templatePath = path.join(TEMPLATE_DIR, config.file);
        
        if (!fs.existsSync(templatePath)) throw new Error(`Template introuvable`);

        // Hash de sécurité
        const rawString = `${data.internalNum}-${dateJour}-${data.clientName}`;
        const securityHash = crypto.createHash('sha256').update(rawString).digest('hex');

        // --- Remplissage Excel ---
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];
        const map = config.mapping;

        // Ecriture des champs
        if (map.interne) ws.getCell(map.interne).value = data.internalNum;
        if (map.nom_bailleur) ws.getCell(map.nom_bailleur).value = data.selectedBailleur;
        
        if (map.cite) ws.getCell(map.cite).value = data.address;
        if (map.date) ws.getCell(map.date).value = dateJour;
        if (map.objet) ws.getCell(map.objet).value = data.object;
        if (map.client) ws.getCell(map.client).value = data.clientName;
        
        if (map.batiment) ws.getCell(map.batiment).value = data.batiment; 
        if (map.logement) ws.getCell(map.logement).value = data.logement; 
        if (map.etage) ws.getCell(map.etage).value = data.etage; 
        
        if (map.bon) ws.getCell(map.bon).value = data.numeroBon;

        // Remarques (Fusion D21->F26 à cause du décalage)
        if (map.remarques && data.observations) {
            const range = `${map.remarques}:F26`; 
            try { ws.mergeCells(range); } catch (e) {}
            const cell = ws.getCell(map.remarques);
            cell.value = "OBSERVATION :\n" + data.observations;
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }

        // Preuves
        if (map.gps) ws.getCell(map.gps).value = `GPS: ${data.gps.lat}, ${data.gps.lng}`;
        if (map.hash) ws.getCell(map.hash).value = `ID: ${securityHash.substring(0, 15)}...`;

        // Signatures
        const addSig = (base64, range) => {
            if (!base64) return;
            const imgId = workbook.addImage({ base64: base64, extension: 'png' });
            ws.addImage(imgId, range);
        };
        addSig(data.signatureClient, config.sigClient);
        addSig(data.signatureTech, config.sigTech);

        // Sauvegarde
        const filename = `Quitus_${data.selectedBailleur}_${data.internalNum}_${Date.now()}.xlsx`;
        const filePath = path.join(OUTPUT_DIR, filename);
        await workbook.xlsx.writeFile(filePath);

        // --- Sauvegarde BDD ---
        clientDb = await pool.connect();
        const query = `
            INSERT INTO interventions 
            (numero_bon, bailleur, client_nom, adresse, batiment, logement, etage, objet, observations, gps_lat, gps_lng, chemin_excel, hash_securite)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `;
        const values = [
            numBonFinal, 
            data.selectedBailleur, // On stocke le nom du bailleur ici
            data.clientName, data.address,
            data.batiment, data.logement, data.etage,
            data.object + ` (Interne: ${data.internalNum})`, // On ajoute le n° interne dans l'objet BDD
            data.observations, data.gps.lat, data.gps.lng, 
            filePath, securityHash
        ];
        
        const resultDb = await clientDb.query(query, values);
        console.log(`✅ Sauvegardé BDD ID: ${resultDb.rows[0].id}`);

        // --- Envoi Email ---
        const destinatairePrincipal = 'contact@parduzi.fr';
        const destinataireCopie = data.clientEmail || '';

        const mailOptions = {
            from: '"Parduzi App" <ne-pas-repondre@parduzi.fr>',
            to: destinatairePrincipal,
            cc: destinataireCopie,
            subject: `[Quitus] ${data.selectedBailleur} - ${data.internalNum}`,
            text: `Nouvelle intervention validée.\n\nBailleur : ${data.selectedBailleur}\nN° Interne : ${data.internalNum}\nBon Client : ${numBonFinal}\nClient : ${data.clientName}\nAdresse : ${data.address}\n\nLe document signé est en pièce jointe.`,
            attachments: [{ filename: filename, path: filePath }]
        };

        await transporter.sendMail(mailOptions);
        console.log("📧 Email envoyé !");

        res.json({ success: true, filename: filename });

    } catch (error) {
        console.error("❌ Erreur:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (clientDb) clientDb.release();
    }
});

app.listen(PORT, () => console.log(`🚀 Serveur Parduzi prêt sur http://localhost:${PORT}`));