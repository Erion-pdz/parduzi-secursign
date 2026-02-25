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

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ParduziTheme {
                val initialResetToken = intent?.data?.getQueryParameter("token")
                var resetToken by remember { mutableStateOf(initialResetToken) }
                var authToken by remember { mutableStateOf<String?>(null) }
                var isAuthReady by remember { mutableStateOf(false) }

                // Load stored token once at startup
                LaunchedEffect(Unit) {
                    val stored = withContext(Dispatchers.IO) {
                        AuthStorage.getToken(this@MainActivity)
                    }
                    authToken = stored
                    isAuthReady = true
                }

                Scaffold(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Colors.bg)
                ) { paddingValues ->
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
                    } else if (authToken.isNullOrEmpty()) {
                        AuthScreen(
                            onLoginSuccess = { token ->
                                AuthStorage.saveToken(this@MainActivity, token)
                                authToken = token
                            },
                            resetToken = resetToken,
                            onResetDone = { resetToken = null },
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Colors.bg)
                                .padding(paddingValues)
                                .padding(20.dp)
                        )
                    } else {
                        MainScreen(
                            context = this@MainActivity,
                            onLogout = {
                                AuthStorage.clearToken(this@MainActivity)
                                authToken = null
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
