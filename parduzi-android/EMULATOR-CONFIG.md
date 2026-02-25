# Configuration pour émulateur

## Pour tester sur l'émulateur Android:

1. **Connecter à l'API locale:**
   - Le code utilise automatiquement http://10.0.2.2:3000 (localhost pour émulateur)
   - S'assurer que le serveur Node.js tourne sur http://localhost:3000

2. **Si vous utilisez une IP réelle:**
   - Modifier dans `RetrofitClient.kt`: 
   ```kotlin
   private const val BASE_URL = "http://192.168.1.XXX:3000"
   ```

3. **Pour tester le GPS sur l'émulateur:**
   - Ouvrir Extended Controls (CLI ou Interface)
   - Aller à "Location"
   - Entrer des coordonnées
   - Cliquer "Send"

L'application est prête pour être compilée et lancée !
