package com.parduzi.secursign.utils

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object AuthStorage {
    private const val FILE_NAME = "auth_storage"
    private const val KEY_TOKEN = "auth_token"

    // Store token securely using EncryptedSharedPreferences
    fun saveToken(context: Context, token: String) {
        val prefs = getPrefs(context)
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    // Read token if it exists
    fun getToken(context: Context): String? {
        val prefs = getPrefs(context)
        return prefs.getString(KEY_TOKEN, null)
    }

    // Clear token (logout)
    fun clearToken(context: Context) {
        val prefs = getPrefs(context)
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    private fun getPrefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        FILE_NAME,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
}
