# Parduzi SecureSign - Application Android

Application Android pour la validation certifiée de fin de chantier avec captures de signatures digitales.

## 🎯 Fonctionnalités

- ✍️ Capture de deux signatures (client et technicien)
- 📍 Géolocalisation GPS automatique
- 📋 Formulaire complet pour les données de chantier
- 📨 Envoi des données vers le serveur backend
- 💾 Vue en temps réel avec Jetpack Compose
- 🎨 Design moderne avec thème personnalisé

## 📱 Configuration Requise

- **Android Studio** 2022.1 ou plus récent
- **Android SDK** 24 (API 24) minimum
- **Java 8** ou plus récent
- **Gradle** 8.0+
- Un **émulateur Android** configuré ou un téléphone avec USB debugging activé

## 🚀 Installation et Lancement

### 1. Préparation du projet

```bash
# Ouvrir Android Studio
# Importer le dossier parduzi-android
# Android Studio téléchargera automatiquement les dépendances
```

### 2. Configurer l'émulateur

```bash
# Via Android Studio:
# 1. Tools → AVD Manager
# 2. Créer un appareil virtuel (ex: Pixel 4, Android 13)
# 3. Lancer l'émulateur
```

### 3. Configurer la connexion au serveur

**Pour l'émulateur (par défaut):**
- Le code utilise `10.0.2.2:3000` qui est l'adresse localhost pour l'émulateur Android
- Assurez-vous que le serveur Node.js tourne sur `http://localhost:3000`

**Pour un téléphone réel:**
- Modifier `RetrofitClient.kt` ligne 10:
```kotlin
// Remplacer:
private const val BASE_URL = "http://10.0.2.2:3000"
// Par votre IP:
private const val BASE_URL = "http://192.168.1.100:3000" // Rempreza votre IP
```

### 4. Lancer l'application

```bash
# Via Android Studio:
# 1. Click Run > Run 'app'
# Ou appuyer sur Shift + F10

# Via terminal (Gradle):
./gradlew installDebug
```

## 🔧 Configuration du Serveur Backend

Assurez-vous que le serveur Node.js est en cours d'exécution:

```bash
cd parduzi_app
npm install
npm start
# Le serveur doit tourner sur http://localhost:3000
```

### Permissions Requises

L'application demande les permissions suivantes:
- `INTERNET` - Pour communiquer avec le serveur
- `ACCESS_FINE_LOCATION` - Pour la géolocalisation GPS
- `ACCESS_COARSE_LOCATION` - Géolocalisation approximative
- `WRITE_EXTERNAL_STORAGE` - Stockage des données
- `READ_EXTERNAL_STORAGE` - Lecture des données

## 📐 Structure du Projet

```
parduzi-android/
├── app/
│   ├── src/main/
│   │   ├── kotlin/com/parduzi/secursign/
│   │   │   ├── MainActivity.kt              # Point d'entrée
│   │   │   ├── screens/
│   │   │   │   └── MainScreen.kt           # Écran principal
│   │   │   ├── components/                  # Composants Compose réutilisables
│   │   │   ├── models/                      # Modèles de données
│   │   │   ├── api/                         # Clients API (Retrofit)
│   │   │   ├── ui/theme/                    # Thème Compose
│   │   │   └── utils/                       # Utilitaires (GPS, etc.)
│   │   ├── res/                             # Ressources (strings, colors)
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts                     # Configuration Gradle
├── build.gradle.kts                         # Build root
├── settings.gradle.kts
└── gradle.properties
```

## 🎨 Personnalisation

### Modifier les couleurs

Éditer `app/src/main/kotlin/com/parduzi/secursign/ui/theme/Colors.kt`:

```kotlin
object Colors {
    val primary = Color(0xFF07495a)
    val bg = Color(0xFF0a91a9)
    // ... etc
}
```

### Modifier le serveur API

Éditer `app/src/main/kotlin/com/parduzi/secursign/api/RetrofitClient.kt`:

```kotlin
private const val BASE_URL = "http://your-server:3000"
```

## 🐛 Dépannage

### "Application not installed"
- Nettoyer le build: `./gradlew clean`
- Reconstruire: `./gradlew build`

### "Cannot connect to server"
- Vérifier que le serveur Node.js tourne sur le port 3000
- Pour l'émulateur, utiliser `10.0.2.2:3000`
- Pour un téléphone réel, utiliser l'IP locale du serveur

### GPS ne fonctionne pas
- Vérifier les permissions dans les paramètres de l'app
- L'émulateur peut nécessiter une simulation GPS (Extended Controls > Location)

### Erreur de signature
- Implémenter la logique de capture de signature en utilisant une bibliothèque comme `PenPath` ou `canvas-drawing`

## 📦 Dépendances Principales

- **Jetpack Compose** - UI moderne déclarative
- **Retrofit 2** - Client HTTP
- **Google Play Services Location** - Géolocalisation GPS
- **Gson** - Sérialisation JSON
- **Room Database** - Stockage local
- **Coroutines** - Programmation asynchrone

## 🔐 Sécurité

- ✅ Les données sont envoyées en JSON via HTTPS (configurable)
- ✅ Les signatures sont encodées en Base64
- ✅ La géolocalisation est capturée et horodatée
- ⚠️ Les identifiants du serveur sont hard-codés - à modifier en production

## 📄 Licence

ISC

## 📞 Support

Pour toute question ou problème, consultez la documentation:
- [Android Developers](https://developer.android.com/)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Retrofit](https://square.github.io/retrofit/)

## 🚀 Prochaines Étapes

- [ ] Implémenter la capture de signature tactile complète
- [ ] Ajouter la sauvegarde locale en SQLite
- [ ] Gérer les erreurs de connexion avec cache offline
- [ ] Ajouter des tests unitaires
- [ ] Compiler en APK pour distribution P play Store
