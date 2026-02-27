package com.parduzi.secursign.utils

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * AuthStorage - Gestionnaire de stockage sécurisé du token JWT
 * 
 * J'utilise EncryptedSharedPreferences pour stocker le token de manière chiffrée.
 * C'est la méthode recommandée par Google pour protéger les données sensibles :
 * - Chiffrement AES256-GCM pour les valeurs (le token JWT)
 * - Chiffrement AES256-SIV pour les clés
 * - MasterKey protégée par le KeyStore Android (matériel sécurisé)
 * 
 * Même si quelqu'un root le téléphone, il ne peut pas lire le token en clair.
 */
object AuthStorage {
    private const val FILE_NAME = "auth_storage" // Nom du fichier de préférences chiffrées
    private const val KEY_TOKEN = "auth_token"    // Clé pour le token JWT

    /**
     * Sauvegarde le token JWT de manière sécurisée
     * Appelé après login/register réussi
     */
    fun saveToken(context: Context, token: String) {
        val prefs = getPrefs(context)
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    /**
     * Récupère le token JWT stocké
     * Retourne null si l'utilisateur n'est pas connecté
     */
    fun getToken(context: Context): String? {
        val prefs = getPrefs(context)
        return prefs.getString(KEY_TOKEN, null)
    }

    /**
     * Supprime le token JWT (déconnexion)
     * L'utilisateur devra se reconnecter
     */
    fun clearToken(context: Context) {
        val prefs = getPrefs(context)
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    /**
     * Crée l'instance EncryptedSharedPreferences avec les meilleurs algorithmes de chiffrement
     * - MasterKey : AES256-GCM (clé stockée dans le KeyStore matériel Android)
     * - Clés : AES256-SIV (déterministe pour retrouver les clés)
     * - Valeurs : AES256-GCM (authentifié, empêche la modification malveillante)
     */
    private fun getPrefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        FILE_NAME,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
}
