package com.parduzi.secursign.api

import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * RetrofitClient - Configuration du client HTTP pour communiquer avec le backend
 * 
 * Retrofit transforme les interfaces Kotlin en vraies requêtes HTTP.
 * J'ai configuré :
 * - Les timeouts (60s) pour les requêtes longues (génération Excel + envoi email)
 * - Le logging pour déboguer les requêtes/réponses en développement
 * - La conversion JSON automatique avec Gson
 */
object RetrofitClient {
    // URL du serveur backend Node.js
    // 10.0.2.2 est l'alias pour localhost depuis l'émulateur Android
    private const val BASE_URL = "http://10.0.2.2:3000" 
    // Pour un vrai appareil : remplacer par http://192.168.X.X:3000 (IP locale du PC)
    
    /**
     * Configuration du client HTTP OkHttp
     * - Logging : j'enregistre toutes les requêtes/réponses pour déboguer
     * - Timeouts : 60 secondes car la génération de quitus + email peut être longue
     */
    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY // Log complet (headers + body)
            })
            .connectTimeout(60, TimeUnit.SECONDS)  // Timeout de connexion
            .readTimeout(60, TimeUnit.SECONDS)     // Timeout de lecture de la réponse
            .writeTimeout(60, TimeUnit.SECONDS)    // Timeout d'envoi des données
            .build()
    }

    /**
     * Configuration Gson en mode lenient (tolérant)
     * Permet de parser du JSON même s'il n'est pas parfaitement formaté
     */
    private val gson = GsonBuilder()
        .setLenient()
        .create()

    /**
     * Instance Retrofit configurée pour appeler l'API Parduzi
     * Toutes les interfaces @POST, @GET etc. passeront par cette config
     */
    val apiService: ParduziApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)                                      // URL de base
            .client(httpClient)                                     // Client HTTP avec timeouts
            .addConverterFactory(GsonConverterFactory.create(gson)) // JSON → Kotlin objects
            .build()
            .create(ParduziApiService::class.java)                 // Génère l'implémentation
    }
}
