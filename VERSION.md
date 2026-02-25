# Version History - Parduzi SecureSign

## v1.0.0 - Initial Release (2025-02-23)

### Android App
- ✅ Application Kotlin complète avec Jetpack Compose
- ✅ Interface identique à la web app
- ✅ Formulaire complet (8 champs)
- ✅ Capture de signatures tactiles
- ✅ Intégration API avec Retrofit
- ✅ Géolocalisation GPS
- ✅ Gestion des permissions Android
- ✅ Messages d'état et validation
- ✅ Design Material 3 avec thème personnalisé

### Dépendances
- Jetpack Compose 1.5.4 (UI moderne)
- Retrofit 2.10.0 (API HTTP)
- Google Play Services Location 21.0.1 (GPS)
- Gson 2.10.1 (Sérialisation JSON)
- Coroutines 1.7.3 (Async)

### Documentation
- README.md - Documentation complète
- SETUP-RAPIDE.md - Guide de configuration
- IMPROVEMENTS.md - Améliorations futures
- EMULATOR-CONFIG.md - Configuration d'émulateur
- 00-RECAP-FINAL.md - Récapitulatif complet

---

## v1.1.0 (Planifié)

- [ ] Implémentation signature canvas avançée
- [ ] GPS test sur téléphone réel
- [ ] Room Database pour stockage local
- [ ] WorkManager pour synchro background
- [ ] Tests unitaires

---

## v2.0.0 (Futur)

- [ ] Dark mode
- [ ] Compression d'images
- [ ] Authentification utilisateur
- [ ] Historique de documents
- [ ] Export PDF natif

---

## Notes de Développement

### BuildConfig
```kotlin
buildTypes {
    debug {
        // http://10.0.2.2:3000 (émulateur)
    }
    release {
        // Modifier par l'URL de production
    }
}
```

### Versionning
- versionCode: 1 (incrémenter à chaque release Google Play)
- versionName: "1.0.0" (visible utilisateur)

Modifier dans: `app/build.gradle.kts`

---

## Changelog - Web App (Historique)

### v1.0 - OrigEmergencyal (Version JavaScript)
- Formulaire web avec HTML5
- Signatures avec signature_pad.js
- API Express Node.js
- Email avec Nodemailer
- Base PostgreSQL
- Export Excel XLS
