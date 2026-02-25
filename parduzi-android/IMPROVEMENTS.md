# 📋 Guide des Améliorations - Parduzi Android

## 🎯 Priorité 1: Signature Tactile (Important)

La capture de signature est actuellement un mock. Il faut implémenter une vraie capture tactile.

### Option A: Utiliser une bibliothèque (Recommandé)

#### 1. Ajouter la dépendance dans `build.gradle.kts`:
```kotlin
dependencies {
    implementation("io.github.nisrulz:easydeviceinfo-base:2.4.3")
    // ou pour une meilleure capture:
    implementation("com.github.gcacace:signature-pad:1.3.1")
}
```

#### 2. Créer un composant signature amélioré:
```kotlin
// app/src/main/kotlin/com/parduzi/secursign/components/AdvancedSignaturePad.kt
@Composable
fun AdvancedSignaturePad(
    modifier: Modifier = Modifier.fillMaxWidth().height(250.dp),
    onSignatureData: (String) -> Unit // Base64
) {
    val canvasDrawer = remember { CanvasDrawer() }
    
    Canvas(
        modifier = modifier
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset ->
                        canvasDrawer.startPath(offset.x, offset.y)
                    },
                    onDrag = { change, _ ->
                        canvasDrawer.addPoint(change.position.x, change.position.y)
                    },
                    onDragEnd = {
                        canvasDrawer.endPath()
                    }
                )
            }
    ) {
        canvasDrawer.draw(this)
    }
}

class CanvasDrawer {
    private val paths = mutableListOf<Path>()
    private var currentPath: Path? = null
    
    fun startPath(x: Float, y: Float) {
        currentPath = Path().apply { moveTo(x, y) }
    }
    
    fun addPoint(x: Float, y: Float) {
        currentPath?.lineTo(x, y)
    }
    
    fun endPath() {
        currentPath?.let { paths.add(it) }
        currentPath = null
    }
    
    fun draw(scope: DrawScope) {
        paths.forEach { path ->
            scope.drawPath(path, Color.Black, style = Stroke(width = 2f))
        }
    }
    
    fun clear() = paths.clear()
    
    fun toBase64(): String {
        // Convertir canvas en bitmap, puis en Base64
        // ... implémentation
        return ""
    }
}
```

### Option B: Utiliser un WebView (Plus simple mais moins natif)

```kotlin
// Utiliser un WebView de signature-pad.js
implementation("androidx.webkit:webkit:1.8.0")
```

## 📍 Priorité 2: Géolocalisation GPS

### 1. Implémenter LinkRecognition complète:

```kotlin
// app/src/main/kotlin/com/parduzi/secursign/utils/LocationManager.kt
class LocationManager(context: Context) {
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    
    fun getCurrentLocation(callback: (GpsCoordinates) -> Unit) {
        if (ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED) {
            
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                location?.let {
                    callback(GpsCoordinates(it.latitude, it.longitude))
                }
            }
        }
    }
}
```

### 2. Implémenter les permissions RequestPermissions:

```kotlin
// Dans MainActivity
val permissionLauncher = rememberLauncherForActivityResult(
    ActivityResultContracts.RequestPermission()
) { isGranted ->
    if (isGranted) {
        // Récupérer la localisation
    }
}

// Déclencher:
permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
```

## 💾 Priorité 3: Sauvegarde Locale (Hors-ligne)

### 1. Créer une entité Room:

```kotlin
// app/src/main/kotlin/com/parduzi/secursign/database/QuitusEntity.kt
@Entity(tableName = "quitus_drafts")
data class QuitusEntity(
    @PrimaryKey val id: String,
    val selectedBailleur: String,
    val internalNum: String,
    val clientName: String,
    val address: String,
    val createdAt: Long,
    val isSentBoolean,
    // ... autres champs
)

@Dao
interface QuitusDao {
    @Insert
    suspend fun insert(quitus: QuitusEntity)
    
    @Query("SELECT * FROM quitus_drafts WHERE isSent = 0")
    suspend fun getDrafts(): List<QuitusEntity>
    
    @Update
    suspend fun update(quitus: QuitusEntity)
    
    @Delete
    suspend fun delete(quitus: QuitusEntity)
}
```

### 2. Créer une Database Room:

```kotlin
// app/src/main/kotlin/com/parduzi/secursign/database/ParduziDatabase.kt
@Database(
    entities = [QuitusEntity::class],
    version = 1
)
abstract class ParduziDatabase : RoomDatabase() {
    abstract fun quitusDao(): QuitusDao
    
    companion object {
        @Volatile
        private var instance: ParduziDatabase? = null
        
        fun getInstance(context: Context): ParduziDatabase {
            return instance ?: synchronized(this) {
                Room.databaseBuilder(context, ParduziDatabase::class.java, "parduzi_db")
                    .build()
                    .also { instance = it }
            }
        }
    }
}
```

## 🔔 Priorité 4: Notifications et Synchro

### Ajouter les notifications:

```kotlin
dependencies {
    implementation("androidx.work:work-runtime-ktx:2.8.1")
}

// Créer un Worker pour la synchro background:
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        // Envoyer les brouillons non envoyés
        return Result.success()
    }
}

// Programmer la tâche:
val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
    15, TimeUnit.MINUTES
).build()

WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "quitus_sync",
    ExistingPeriodicWorkPolicy.KEEP,
    syncRequest
)
```

## 🧪 Priorité 5: Tests

```kotlin
// app/src/test/kotlin/com/parduzi/secursign/ApiTest.kt
@RunWith(RobolectricTestRunner::class)
class ApiServiceTest {
    @Test
    fun testGenerateQuitus() {
        val mockData = QuitusData(/* ... */)
        
        // Tester avec MockWebServer
        coEvery { apiService.generateQuitus(mockData) } returns 
            ApiResponse(success = true, filename = "test.xlsx")
        
        // Assertions
        assertTrue(true)
    }
}
```

## 📦 Dépendance Complète Recommandée

Ajouter ces dépendances au fur et à mesure:

```kotlin
dependencies {
    // Signature
    implementation("com.github.gcacace:signature-pad:1.3.1")
    
    // Location
    implementation("com.google.android.gms:play-services-location:21.0.1")
    
    // Database (Room)
    implementation("androidx.room:room-runtime:2.6.0")
    implementation("androidx.room:room-ktx:2.6.0")
    kapt("androidx.room:room-compiler:2.6.0")
    
    // Background sync
    implementation("androidx.work:work-runtime-ktx:2.8.1")
    
    // Notifications
    implementation("androidx.core:core:1.12.0")
    
    // Tests
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.1.0")
    testImplementation("org.robolectric:robolectric:4.11.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
```

## 🚀 Checklist de Complétude

- [ ] Signature tactile capture
- [ ] GPS fonctionnel avec permissions
- [ ] Sauvegarde hors-ligne en Room
- [ ] Synchro en background avec WorkManager
- [ ] Notifications de succès/erreur
- [ ] Tests unitaires
- [ ] Management d'erreurs réseau
- [ ] Dark mode (optionnel)
- [ ] Compression d'images (optionnel)
- [ ] Authentification utilisateur (if needed)

## 📚 Ressources

- [Android Developers - Location](https://developer.android.com/develop/sensors-and-location/location)
- [Room Database](https://developer.android.com/training/data-storage/room)
- [WorkManager](https://developer.android.com/topic/libraries/architecture/workmanager)
- [Jetpack Compose Canvas](https://developer.android.com/reference/kotlin/androidx/compose/foundation/canvas/Canvas)

## 💡 Conseils

1. **Signature:** La capture vraie de dessin tactile est complexe. Envisager utiliser une bibliothèque existante.
2. **GPS:** Tester sur un vrai téléphone. L'émulateur peut avoir des limitations.
3. **Synchro:** Utiliser WorkManager pour les tâches en background plutôt que Service.
4. **Tests:** Tester avec réel réseau et hors-ligne pour validation.
5. **Sécurité:** Minifier/obfusquer le code avant production via ProGuard.
