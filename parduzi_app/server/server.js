/**
 * PARDUZI SECURE SIGN - SERVEUR BACKEND
 * 
 * API REST Node.js/Express qui gère :
 * - L'authentification complète (register, login, email verification, forgot/reset password)
 * - La génération de quitus Excel avec logo et signatures
 * - L'envoi d'emails automatisés (verification, reset, quitus)
 * - Le stockage sécurisé en base PostgreSQL
 * 
 * Sécurité :
 * - Mots de passe hashés avec bcrypt (12 rounds = très sécurisé)
 * - Tokens JWT pour l'authentification
 * - Tokens de vérification/reset hashés en SHA256
 * - Requêtes SQL paramétrisées (protection injection SQL)
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

require('dotenv').config(); // Charge les variables d'environnement depuis .env

const app = express();
const PORT = 3000;

// Vérifie qu'une variable d'environnement existe, sinon crève avec une erreur claire
const requireEnv = (name) => {
    if (!process.env[name]) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return process.env[name];
};

// Configuration centralisée - toutes mes variables sensibles sont dans .env
const CONFIG = {
    appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${PORT}`,
    appDeepLinkBase: process.env.APP_DEEPLINK_BASE || 'secursign://reset', // Deep link Android
    jwtSecret: requireEnv('JWT_SECRET'),       // Clé secrète pour signer les JWT
    emailUser: requireEnv('EMAIL_USER'),       // Compte Gmail pour envoyer les emails
    emailPass: requireEnv('EMAIL_PASS'),       // Mot de passe d'application Gmail
    dbUser: requireEnv('DB_USER'),             // Utilisateur PostgreSQL
    dbPassword: requireEnv('DB_PASSWORD'),     // Mot de passe PostgreSQL
    dbHost: process.env.DB_HOST || 'localhost',
    dbName: process.env.DB_NAME || 'postgres',
    dbPort: Number(process.env.DB_PORT || 5432)
};

// --- CONFIGURATION EMAIL ---
// J'utilise nodemailer avec Gmail pour envoyer les emails automatiquement
// (vérification de compte, reset password, envoi de quitus)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: CONFIG.emailUser,
        pass: CONFIG.emailPass // Mot de passe d'application Gmail (pas le vrai mdp)
    }
});

// --- CONNEXION BASE DE DONNÉES POSTGRESQL ---
// Pool de connexions pour gérer plusieurs requêtes simultanées efficacement
const pool = new Pool({
    user: CONFIG.dbUser,
    host: CONFIG.dbHost,
    database: CONFIG.dbName,
    password: CONFIG.dbPassword,
    port: CONFIG.dbPort,
});

/**
 * Crée automatiquement la table users si elle n'existe pas
 * Structure de la table :
 * - id : Identifiant unique auto-incrémenté
 * - email : Email unique (login)
 * - password_hash : Mot de passe hashé avec bcrypt (JAMAIS en clair !)
 * - first_name, last_name : Nom/prénom de l'utilisateur
 * - is_verified : Boolean, true si l'email a été vérifié
 * - verification_token : Token pour valider l'email (hashé SHA256)
 * - reset_token : Token pour réinitialiser le mot de passe (hashé SHA256)
 * - Timestamps : verification_expires, reset_expires, created_at
 */
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

// Politique de mot de passe fort : 8+ caractères avec majuscule, minuscule, chiffre, spécial
// J'utilise une regex pour valider que le mot de passe est assez sécurisé
const isStrongPassword = (password) => {
    const policy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return policy.test(password);
};

// Hash un token avec SHA256 avant de le stocker en base
// Comme ça même si quelqu'un vole la BDD, il ne peut pas utiliser les tokens directement
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// --- ROUTES D'AUTHENTIFICATION ---

/**
 * POST /api/auth/register - Inscription d'un nouvel utilisateur
 * 
 * Étapes :
 * 1. Validation des données (email valide, password fort)
 * 2. Vérification que l'email n'existe pas déjà
 * 3. Hashage du mot de passe avec bcrypt (12 rounds)
 * 4. Génération d'un token de vérification
 * 5. Insertion en base de données
 * 6. Envoi d'un email de vérification
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        // Je normalise les données (trim, lowercase pour l'email)
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

        // Validation de la force du mot de passe (sécurité importante !)
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Mot de passe non conforme (8 caracteres, majuscule, minuscule, chiffre, special)'
            });
        }

        // Vérification que l'email n'est pas déjà utilisé
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rowCount > 0) {
            return res.status(409).json({ success: false, error: 'Email deja utilise' });
        }

        // HASHAGE DU MOT DE PASSE - 12 rounds = très sécurisé (prend ~150ms)
        // Le mot de passe n'est JAMAIS stocké en clair dans la base !
        const passwordHash = await bcrypt.hash(password, 12);
        
        // Génération d'un token aléatoire pour la vérification d'email
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenHash = hashToken(verificationToken); // Je stocke le hash, pas le token brut
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expire dans 24h

        // Insertion du nouvel utilisateur dans PostgreSQL
        // Utilisation de requêtes paramétrisées ($1, $2...) pour éviter les injections SQL
        await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, verification_token, verification_expires)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [email, passwordHash, firstName, lastName, verificationTokenHash, verificationExpires]
        );

        // Envoi de l'email de vérification avec le lien cliquable
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

        // Je ne dis pas si c'est l'email ou le mot de passe qui est faux (sécurité)
        if (result.rowCount === 0) {
            return res.status(401).json({ success: false, error: 'Identifiants invalides' });
        }

        const user = result.rows[0];
        
        // Je bloque l'accès si l'email n'a pas été vérifié
        if (!user.is_verified) {
            return res.status(403).json({ success: false, error: 'Compte non verifie' });
        }

        // COMPARAISON SÉCURISÉE du mot de passe
        // bcrypt.compare() hash le password fourni et compare avec le hash en base
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Identifiants invalides' });
        }

        // Génération du token JWT signé avec ma clé secrète
        // Ce token sera envoyé dans les headers des requêtes suivantes pour prouver l'identité
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            CONFIG.jwtSecret,
            { expiresIn: '12h' } // Le token expire après 12h, il faudra se reconnecter
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

const OUTPUT_DIR = path.join(__dirname, 'output');     // Dossier où je sauvegarde les Excel générés
const TEMPLATE_DIR = path.join(__dirname, 'templates'); // Dossier contenant le template Excel et le logo
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

/**
 * Configuration du mapping Excel
 * 
 * Pour chaque type de bailleur, je définis :
 * - file : Nom du template Excel à utiliser
 * - mapping : Dictionnaire indiquant dans quelle cellule mettre chaque donnée
 * 
 * Exemple : 'interne': 'H2' signifie que le numéro interne va dans la cellule H2
 */
const TEMPLATE_CONFIG = {
    'parduzi': {
        file: 'Quitus VIDE HMP 2026.xlsx', 
        mapping: {
            interne: 'H2',          // Numéro interne en GROS (cellule H2)
            nom_bailleur: 'B7',     // Nom du bailleur
            bon: 'B8',              // Numéro de bon de commande
            cite: 'B9',             // Adresse/Cité
            client: 'B10',          // Nom du client/locataire
            date: 'H7',             // Date du jour
            batiment: 'H8',         // Bâtiment
            logement: 'H9',         // Numéro de logement
            etage: 'H10',           // Étage
            remarques_debut: 'A14', // Début de la zone de remarques (fusion de cellules)
            remarques_fin: 'H18',   // Fin de la zone de remarques
            sigClient: 'A21:C25',   // Zone pour la signature client (A21 à C25)
            sigTech: 'F21:H25',     // Zone pour la signature technicien (F21 à H25)
            hash: 'B41'             // Cellule pour le hash de sécurité
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
        const dateJour = now.toLocaleDateString('fr-FR'); // Format date français (JJ/MM/AAAA)

        const config = TEMPLATE_CONFIG['parduzi'];
        const templatePath = path.join(TEMPLATE_DIR, config.file);
        
        // Chemin vers le logo Parduzi (doit être dans le dossier templates/)
        const logoPath = path.join(TEMPLATE_DIR, 'logo.png');
        
        if (!fs.existsSync(templatePath)) throw new Error(`Template introuvable: ${config.file}`);

        // GÉNÉRATION DU HASH DE SÉCURITÉ
        // Ce hash unique prouve l'authenticité du document
        // Il est basé sur : numéro interne + date + nom client
        const rawString = `${data.internalNum}-${dateJour}-${data.clientName}`;
        const securityHash = crypto.createHash('sha256').update(rawString).digest('hex');

        // --- MANIPULATION DU FICHIER EXCEL AVEC EXCELJS ---
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath); // Je charge le template vierge
        const ws = workbook.worksheets[0];          // Première feuille du classeur
        const map = config.mapping;                 // Récupère le mapping des cellules

        // --- 1. INSERTION DU LOGO PARDUZI ---
        // Le logo est placé de A1 à C5 (coin supérieur gauche)
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const logoId = workbook.addImage({
                buffer: logoBuffer,
                extension: 'png',
            });
            ws.addImage(logoId, 'A1:C5'); // Place l'image dans cette zone
        } else {
            console.warn("⚠️ Attention : logo.png introuvable dans le dossier templates");
        }

        // Fonction utilitaire pour écrire dans une cellule
        const writeCell = (coord, value) => {
            if (!coord) return;
            const cell = ws.getCell(coord);
            cell.value = value;
            cell.alignment = { horizontal: 'left', vertical: 'middle' }; 
        };

        // --- 2. NUMÉRO INTERNE EN GROS (CELLULE H2) ---
        // Le numéro interne est affiché en très gros (taille 20) pour visibilité maximale
        if (map.interne) {
            const cell = ws.getCell(map.interne);
            cell.value = data.internalNum.toUpperCase();
            cell.font = { bold: true, size: 20, name: 'Arial' }; // TAILLE 20 = TRÈS GROS
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        
        // --- 3. REMPLISSAGE DES CHAMPS SIMPLES ---
        writeCell(map.nom_bailleur, data.selectedBailleur);
        writeCell(map.cite, data.address.toUpperCase());
        writeCell(map.date, dateJour);
        writeCell(map.client, data.clientName);
        writeCell(map.batiment, data.batiment);
        writeCell(map.logement, data.logement);
        writeCell(map.etage, data.etage);
        writeCell(map.bon, data.numeroBon);

        // --- 4. ZONE DE REMARQUES (FUSION DE CELLULES A14:H18) ---
        // Je fusionne plusieurs cellules pour avoir une grande zone de texte
        if (map.remarques_debut && map.remarques_fin) {
            try { ws.mergeCells(`${map.remarques_debut}:${map.remarques_fin}`); } catch (e) {}
            const cell = ws.getCell(map.remarques_debut);
            cell.value = data.observations; 
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }; // Retour à la ligne auto
        }

        // --- 5. HASH DE SÉCURITÉ ---
        // J'affiche les 15 premiers caractères du hash pour l'identifier rapidement
        if (map.hash) ws.getCell(map.hash).value = `ID: ${securityHash.substring(0, 15)}...`;

        // --- 6. INSERTION DES SIGNATURES (BASE64 → PNG) ---
        // Les signatures viennent de l'app Android en format Base64
        // Je les convertis en images et les insère dans les zones définies
        const addSig = (base64, range) => {
            if (!base64 || !range) return;
            const imgId = workbook.addImage({ base64: base64, extension: 'png' });
            ws.addImage(imgId, range);
        };
        addSig(data.signatureClient, map.sigClient); // Signature du client en A21:C25
        addSig(data.signatureTech, map.sigTech);     // Signature du technicien en F21:H25

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