package com.parduzi.secursign

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.parduzi.secursign.screens.AuthScreen
import com.parduzi.secursign.screens.MainScreen
import com.parduzi.secursign.ui.theme.Colors
import com.parduzi.secursign.ui.theme.ParduziTheme
import com.parduzi.secursign.utils.AuthStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * MainActivity - Point d'entrée de l'application Parduzi SecureSign
 * 
 * Cette activité gère toute la logique d'authentification et de navigation :
 * - Chargement du token JWT stocké de manière sécurisée au démarrage
 * - Gestion des deep links pour la réinitialisation de mot de passe (secursign://reset?token=...)
 * - Navigation automatique entre écran d'auth et écran principal selon l'état de connexion
 * - Gestion de la déconnexion avec suppression du token
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ParduziTheme {
                // Je récupère le token du deep link si l'utilisateur clique sur un lien de reset password
                val initialResetToken = intent?.data?.getQueryParameter("token")
                var resetToken by remember { mutableStateOf(initialResetToken) }
                
                // Le token JWT qui prouve que l'utilisateur est connecté
                var authToken by remember { mutableStateOf<String?>(null) }
                
                // Flag pour savoir si j'ai fini de charger le token depuis le stockage sécurisé
                var isAuthReady by remember { mutableStateOf(false) }

                // Au démarrage de l'app, je charge le token stocké dans EncryptedSharedPreferences
                // Si l'utilisateur était connecté, il n'aura pas besoin de se reconnecter
                LaunchedEffect(Unit) {
                    val stored = withContext(Dispatchers.IO) {
                        AuthStorage.getToken(this@MainActivity)
                    }
                    authToken = stored
                    isAuthReady = true // Signal que je suis prêt à afficher l'interface
                }

                Scaffold(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Colors.bg)
                ) { paddingValues ->
                    // Écran de chargement pendant que je récupère le token
                    if (!isAuthReady) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Colors.bg)
                                .padding(paddingValues),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = Colors.cyan)
                        }
                    } 
                    // Si pas de token = utilisateur non connecté → j'affiche l'écran d'authentification
                    else if (authToken.isNullOrEmpty()) {
                        AuthScreen(
                            // Callback appelé quand l'utilisateur se connecte avec succès
                            onLoginSuccess = { token ->
                                // Je sauvegarde le token JWT dans le stockage chiffré
                                AuthStorage.saveToken(this@MainActivity, token)
                                authToken = token // Mise à jour du state → bascule vers MainScreen
                            },
                            resetToken = resetToken, // Token du deep link pour reset password
                            onResetDone = { resetToken = null }, // Nettoyage après reset
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Colors.bg)
                                .padding(paddingValues)
                                .padding(20.dp)
                        )
                    } 
                    // Si token valide = utilisateur connecté → j'affiche l'écran principal avec le formulaire
                    else {
                        MainScreen(
                            context = this@MainActivity,
                            // Callback de déconnexion : je supprime le token et retourne à l'écran d'auth
                            onLogout = {
                                AuthStorage.clearToken(this@MainActivity) // Suppression du token chiffré
                                authToken = null // Mise à jour du state → bascule vers AuthScreen
                            },
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Colors.bg)
                                .padding(paddingValues)
                                .padding(20.dp)
                        )
                    }
                }
            }
        }
    }
}
