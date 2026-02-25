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
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

require('dotenv').config();

const app = express();
const PORT = 3000;

const requireEnv = (name) => {
    if (!process.env[name]) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return process.env[name];
};

const CONFIG = {
    appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${PORT}`,
    appDeepLinkBase: process.env.APP_DEEPLINK_BASE || 'secursign://reset',
    jwtSecret: requireEnv('JWT_SECRET'),
    emailUser: requireEnv('EMAIL_USER'),
    emailPass: requireEnv('EMAIL_PASS'),
    dbUser: requireEnv('DB_USER'),
    dbPassword: requireEnv('DB_PASSWORD'),
    dbHost: process.env.DB_HOST || 'localhost',
    dbName: process.env.DB_NAME || 'postgres',
    dbPort: Number(process.env.DB_PORT || 5432)
};

// --- EMAIL ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: CONFIG.emailUser,
        pass: CONFIG.emailPass
    }
});

// --- BDD ---
const pool = new Pool({
    user: CONFIG.dbUser,
    host: CONFIG.dbHost,
    database: CONFIG.dbName,
    password: CONFIG.dbPassword,
    port: CONFIG.dbPort,
});

const ensureUsersTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            is_verified BOOLEAN NOT NULL DEFAULT FALSE,
            verification_token TEXT,
            verification_expires TIMESTAMP,
            reset_token TEXT,
            reset_expires TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `;
    await pool.query(createTableQuery);

    // Ensure reset columns exist for older databases
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP');
};

// Password policy: 8+ with upper, lower, number, special
const isStrongPassword = (password) => {
    const policy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return policy.test(password);
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// --- AUTH ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');
        const firstName = String(req.body.firstName || '').trim();
        const lastName = String(req.body.lastName || '').trim();

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ success: false, error: 'Champs manquants' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, error: 'Email invalide' });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Mot de passe non conforme (8 caracteres, majuscule, minuscule, chiffre, special)'
            });
        }

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rowCount > 0) {
            return res.status(409).json({ success: false, error: 'Email deja utilise' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenHash = hashToken(verificationToken);
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, verification_token, verification_expires)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [email, passwordHash, firstName, lastName, verificationTokenHash, verificationExpires]
        );

        // Email de verification
        const verifyLink = `${CONFIG.appBaseUrl}/api/auth/verify?token=${verificationToken}`;
        await transporter.sendMail({
            from: `"Parduzi App" <${CONFIG.emailUser}>`,
            to: email,
            subject: 'Verification de compte - Parduzi SecureSign',
            text: `Bonjour ${firstName},\n\nMerci de verifier votre compte: ${verifyLink}\n\nCe lien expire dans 24h.`
        });

        return res.json({
            success: true,
            message: 'Compte cree. Verifiez votre email pour activer le compte.'
        });
    } catch (error) {
        console.error('❌ Erreur register:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.get('/api/auth/verify', async (req, res) => {
    try {
        const token = String(req.query.token || '');
        if (!token) {
            return res.status(400).send('Token manquant');
        }

        const tokenHash = hashToken(token);
        const result = await pool.query(
            `SELECT id, verification_expires FROM users WHERE verification_token = $1 OR verification_token = $2`,
            [tokenHash, token]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Token invalide');
        }

        const user = result.rows[0];
        if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
            return res.status(410).send('Token expire');
        }

        await pool.query(
            `UPDATE users
             SET is_verified = TRUE, verification_token = NULL, verification_expires = NULL
             WHERE id = $1`,
            [user.id]
        );

        return res.send('Compte verifie. Vous pouvez vous connecter.');
    } catch (error) {
        console.error('❌ Erreur verify:', error);
        return res.status(500).send('Erreur serveur');
    }
});

// Forgot password: send reset link by email
app.post('/api/auth/forgot', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ success: false, error: 'Email invalide' });
        }

        const result = await pool.query(
            'SELECT id, first_name FROM users WHERE email = $1',
            [email]
        );

        // Always return success to avoid user enumeration
        if (result.rowCount === 0) {
            return res.json({ success: true, message: 'Si le compte existe, un email a ete envoye.' });
        }

        const user = result.rows[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = hashToken(resetToken);
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

        await pool.query(
            'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
            [resetTokenHash, resetExpires, user.id]
        );

        const resetLink = `${CONFIG.appDeepLinkBase}?token=${resetToken}`;
        await transporter.sendMail({
            from: `"Parduzi App" <${CONFIG.emailUser}>`,
            to: email,
            subject: 'Reinitialisation du mot de passe - Parduzi SecureSign',
            text: `Bonjour ${user.first_name},\n\nReinitialisez votre mot de passe: ${resetLink}\n\nCe lien expire dans 1h.`
        });

        return res.json({ success: true, message: 'Email de reinitialisation envoye.' });
    } catch (error) {
        console.error('❌ Erreur forgot:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Reset password: validate token + update password
app.post('/api/auth/reset', async (req, res) => {
    try {
        const token = String(req.body.token || '');
        const newPassword = String(req.body.newPassword || '');

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, error: 'Champs manquants' });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                error: 'Mot de passe non conforme (8 caracteres, majuscule, minuscule, chiffre, special)'
            });
        }

        const tokenHash = hashToken(token);
        const result = await pool.query(
            `SELECT id, reset_expires
             FROM users
             WHERE reset_token = $1 OR reset_token = $2`,
            [tokenHash, token]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Token invalide' });
        }

        const user = result.rows[0];
        if (user.reset_expires && new Date(user.reset_expires) < new Date()) {
            return res.status(410).json({ success: false, error: 'Token expire' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await pool.query(
            `UPDATE users
             SET password_hash = $1, reset_token = NULL, reset_expires = NULL
             WHERE id = $2`,
            [passwordHash, user.id]
        );

        return res.json({ success: true, message: 'Mot de passe mis a jour.' });
    } catch (error) {
        console.error('❌ Erreur reset:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Champs manquants' });
        }

        const result = await pool.query(
            `SELECT id, email, password_hash, first_name, last_name, is_verified
             FROM users WHERE email = $1`,
            [email]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({ success: false, error: 'Identifiants invalides' });
        }

        const user = result.rows[0];
        if (!user.is_verified) {
            return res.status(403).json({ success: false, error: 'Compte non verifie' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Identifiants invalides' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            CONFIG.jwtSecret,
            { expiresIn: '12h' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
    } catch (error) {
        console.error('❌ Erreur login:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

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

ensureUsersTable()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Serveur Parduzi pret sur http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Erreur init BDD:', error);
        process.exit(1);
    });