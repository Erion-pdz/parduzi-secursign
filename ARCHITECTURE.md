# 📱 Parduzi SecureSign - Application Android

## 🎯 Vision d'Ensemble

```
┌─────────────────────────────────────────────────────┐
│                    Votre Téléphone                  │
│  ┌─────────────────────────────────────────────┐   │
│  │                                               │   │
│  │   🏢 Informations Dossier                    │   │
│  │   ├─ Bailleur (Dropdown)                    │   │
│  │   ├─ Numéro Interne                         │   │
│  │   └─ N° de Bon                              │   │
│  │                                               │   │
│  │   👤 Locataire & Lieu                        │   │
│  │   ├─ Nom du Client                          │   │
│  │   ├─ Adresse                                │   │
│  │   └─ Bâtiment / Logement / Étage            │   │
│  │                                               │   │
│  │   📝 Détails                                 │   │
│  │   └─ Observations                           │   │
│  │                                               │   │
│  │   ✍️  Signatures                             │   │
│  │   ├─ [✍️  Signer Client]  → Modal Signature │   │
│  │   └─ [✍️  Signer Tech]    → Modal Signature │   │
│  │                                               │   │
│  │   [📨 ENVOYER LE QUITUS]                     │   │
│  │                                               │   │
│  │   ✅ Envoyé !                                │   │
│  │                                               │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
              ↓ (API JSON)
┌─────────────────────────────────────────────────────┐
│       Serveur Node.js (localhost:3000)              │
│                                                       │
│   Routes:                                           │
│   POST /api/generate                               │
│   ├─ Génère Excel XLS                             │
│   ├─ Enregistre en PostgreSQL                      │
│   └─ Envoie email avec pièce jointe                │
│                                                       │
│   Dépendances:                                      │
│   ├─ Express.js (routing)                         │
│   ├─ ExcelJS (génération XLS)                      │
│   ├─ PostgreSQL (BDD)                             │
│   ├─ Nodemailer (emails)                          │
│   └─ CORS (requêtes cross-origin)                 │
│                                                       │
└─────────────────────────────────────────────────────┘
              ↓ (PostgreSQL)
┌─────────────────────────────────────────────────────┐
│            Base de Données PostgreSQL               │
│                                                       │
│   Table: interventions                              │
│   ├─ numero_bon                                    │
│   ├─ bailleur                                      │
│   ├─ client_nom                                    │
│   ├─ adresse                                       │
│   ├─ gps_lat / gps_lng                            │
│   ├─ chemin_excel                                 │
│   └─ hash_securite                                │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Architecture Détaillée

### Frontend (Application Android)

```
MainActivity
    └── ParduziTheme
        └── Scaffold
            └── MainScreen
                ├── Header
                │   ├── Logo "PZ"
                │   ├── Titre: "Quitus Numérique"
                │   └── Sous-titre
                │
                ├── ScrollView {
                │   ├── CardSection "🏢 Dossier"
                │   │   ├─ BailleurDropdown
                │   │   ├─ CustomTextField (Interne)
                │   │   └─ CustomTextField (Bon)
                │   │
                │   ├── CardSection "👤 Locataire"
                │   │   ├─ CustomTextField (Client)
                │   │   ├─ CustomTextField (Adresse)
                │   │   ├─ CustomTextField (Bâtiment)
                │   │   ├─ CustomTextField (Logement)
                │   │   └─ CustomTextField (Étage)
                │   │
                │   ├── CardSection "📝 Détails"
                │   │   └─ CustomTextField (Observations, multiline)
                │   │
                │   ├── CardSection "✍️  Signatures"
                │   │   ├─ SignatureButton (Client)
                │   │   │   └── onClick → SignatureModal
                │   │   │       ├─ SignaturePadComposable
                │   │   │       ├─ [Effacer] [Valider]
                │   │   │       └─ → toBase64()
                │   │   │
                │   │   └─ SignatureButton (Technicien)
                │   │
                │   ├── StatusMessage (Success/Error)
                │   │
                │   └── PrimaryButton [📨 ENVOYER]
                │       └── onClick
                │           ├─ Validation
                │           ├─ getGPSLocation()
                │           ├─ RetrofitClient.apiService.generateQuitus()
                │           ├─ Afficher résultat
                │           └─ Réinitialiser form
                └── }
```

### API Layer

```
RetrofitClient
    └── Retrofit
        ├── Base URL: http://10.0.2.2:3000 (émulateur)
        ├── HTTP Client: OkHttp
        ├── Interceptors: (logging, timeouts)
        └── Converter: Gson
            └── ParduziApiService
                └── POST /api/generate (QuitusData)
```

### Models

```
QuitusData (Request)
├─ selectedBailleur: String
├─ internalNum: String
├─ numeroBon: String
├─ clientName: String
├─ address: String
├─ batiment: String
├─ logement: String
├─ etage: String
├─ observations: String
├─ signatureClient: String (Base64)
├─ signatureTech: String (Base64)
└─ gps: GpsCoordinates
    ├─ lat: Double
    └─ lng: Double

ApiResponse (Response)
├─ success: Boolean
├─ filename: String?
└─ error: String?
```

---

## 🔄 Flux de Données

### Remplissage & Édition

```
Utilisateur tape dans TextField
    ↓
InputComponents.CustomTextField
    ↓ (onValueChange)
MainScreen state (var xxx by remember { mutableStateOf("") })
    ↓ Recomposition
Interface mise à jour
```

### Capture de Signature

```
Utilisateur appuie sur bouton signature
    ↓
SignatureButton onClick
    ↓
SignatureModal (Dialog)
    ↓
SignaturePadComposable (detectDragGestures)
    ↓
SignatureCapture (mutableList<Path>)
    ↓ (doigt se déplace sur l'écran)
Paths mises à jour en temps réel
    ↓
Utilisateur clique "Valider"
    ↓
SignatureCapture.toBase64()
    ↓ (Bitmap → PNG → Base64)
String Base64
    ↓
onSignatureSaved callback
    ↓
State mis à jour (signatureData)
    ↓
Button affiche "✅ Signé"
```

### Envoi des Données

```
Utilisateur clique "Envoyer"
    ↓
MainScreen.onClick validation
    ↓
getGPSLocation() (async)
    ↓
LocationManager.getCurrentLocation()
    ↓ (FusedLocationProviderClient)
GpsCoordinates
    ↓
QuitusData construction
    ├─ Tous les champs
    ├─ signatureClient (Base64)
    ├─ signatureTech (Base64)
    └─ gps (lat/lng)
    ↓
RetrofitClient.apiService.generateQuitus(data) (coroutine)
    ↓ (JSON POST)
🌐 HTTP Request
    ↓ (Réseau)
Serveur Node.js: POST /api/generate
    ↓ (Traitement)
Excel généré
PostgreSQL insertée
Email envoyé
    ↓ (Response JSON)
ApiResponse reçue
    ↓
MainScreen.statusMessage mise à jour
    ↓ (vert ou rouge)
StatusMessage affichée
    ↓
Formulaire réinitialisé
```

---

## 🎨 Thème de Couleurs

```
Colors {
    primary     = #07495a  (Bleu-vert foncé)
    bg          = #0a91a9  (Cyan)
    card        = #0c4a6e  (Bleu)
    text        = #ffffff  (Blanc)
    text_dark   = #000000  (Noir)
    border      = #036aa1  (Bleu clair, 48% opaque)
    success     = #10b981  (Vert)
    error       = #ef4444  (Rouge)
    warning     = #f59e0b  (Orange)
    cyan        = #06b6d4  (Cyan clair)
    cyan_light  = #0891b2  (Cyan moyen)
}
```

---

## 📱 Layouts Responsifs

```
MainScreen (max 500dp)
│
├── Header (70dp height)
│   ├── Logo Box (50x50dp)
│   └── Titles Column
│
├── ScrollColumn (fillMaxSize)
│   │
│   ├── CardSection "Dossier"
│   │   ├── Row {
│   │   │   ├─ Column (weight=1) - Interne
│   │   │   └─ Column (weight=1) - Bon
│   │   └── }
│   │
│   ├── CardSection "Locataire"
│   │   ├── CustomTextField (Nom)
│   │   ├── CustomTextField (Adresse)
│   │   └── Row {
│   │       ├─ Column (weight=1) - Bâtiment
│   │       ├─ Column (weight=1) - Logement
│   │       └─ Column (weight=1) - Étage
│   │   }
│   │
│   ├── CardSection "Détails"
│   │   └── CustomTextField (multi-line)
│   │
│   ├── CardSection "Signatures"
│   │   ├── SignatureButton
│   │   └── SignatureButton
│   │
│   ├── StatusMessage
│   │
│   └── PrimaryButton (56dp height)
└
```

---

## 🔐 Sécurité

```
Android Permissions Demandées:
├─ INTERNET (API calls)
├─ ACCESS_FINE_LOCATION (GPS)
├─ WRITE_EXTERNAL_STORAGE (cache)
├─ READ_EXTERNAL_STORAGE (textures)
└─ CAMERA (optionnel)

Network Security:
├─ usesCleartextTraffic = true (pour test localhost)
└─ HTTPS en production

Données Envoyées:
├─ Signatures: Base64 (PNG)
├─ GPS: Latitude/Longitude
├─ Client data: JSON plain text (HTTPS en prod)
└─ Hash: SHA-256 de verification
```

---

## ✅ Checklist Complet

### Architecture
- [x] Jetpack Compose (UI modern)
- [x] MVVM pattern (State management)
- [x] Retrofit (HTTP client)
- [x] Coroutines (Async)
- [x] Dependency Injection ready

### Features
- [x] Formulaire complet
- [x] Validation des champs
- [x] Capture signatures
- [x] GPS integration
- [x] API communication
- [x] Error handling
- [x] Loading states
- [x] Success/error messages

### Resources
- [x] Strings localisées
- [x] Colors définies
- [x] Theme Material3
- [x] Dimens configurées
- [x] Manifest complet

### Documentation
- [x] README complet
- [x] Guide setup
- [x] Guide improvements
- [x] Architecture overview
- [x] Code comments ready

---

**L'architecture est complète et prête à compiler!** 🎉
