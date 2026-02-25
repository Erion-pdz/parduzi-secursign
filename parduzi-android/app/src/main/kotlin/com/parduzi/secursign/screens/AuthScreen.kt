package com.parduzi.secursign.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parduzi.secursign.api.RetrofitClient
import com.parduzi.secursign.components.CardSection
import com.parduzi.secursign.components.CustomTextField
import com.parduzi.secursign.components.Header
import com.parduzi.secursign.components.InputGroup
import com.parduzi.secursign.components.PrimaryButton
import com.parduzi.secursign.components.SecondaryButton
import com.parduzi.secursign.components.StatusMessage
import com.parduzi.secursign.models.ForgotPasswordRequest
import com.parduzi.secursign.models.LoginRequest
import com.parduzi.secursign.models.RegisterRequest
import com.parduzi.secursign.models.ResetPasswordRequest
import com.parduzi.secursign.ui.theme.Colors
import kotlinx.coroutines.launch

@Composable
fun AuthScreen(
    onLoginSuccess: (String) -> Unit,
    resetToken: String?,
    onResetDone: () -> Unit,
    modifier: Modifier = Modifier
) {
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    var isLogin by remember { mutableStateOf(true) }

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var showForgot by remember { mutableStateOf(false) }
    var forgotEmail by remember { mutableStateOf("") }
    var resetPassword by remember { mutableStateOf("") }
    var resetConfirm by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf("") }
    var isSuccess by remember { mutableStateOf(false) }
    var showStatus by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
    ) {
        Header()

        if (!resetToken.isNullOrEmpty()) {
            // Reset password form (deep link)
            CardSection(title = "Reinitialiser le mot de passe") {
                InputGroup(label = "Nouveau mot de passe") {
                    CustomTextField(
                        value = resetPassword,
                        onValueChange = { resetPassword = it },
                        placeholder = "8 caracteres + Maj + Min + Chiffre + Special",
                        isPassword = true
                    )
                }

                InputGroup(label = "Confirmer le mot de passe") {
                    CustomTextField(
                        value = resetConfirm,
                        onValueChange = { resetConfirm = it },
                        placeholder = "Confirmer",
                        isPassword = true
                    )
                }

                Text(
                    text = "Le mot de passe doit contenir au moins 8 caracteres, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractere special.",
                    fontSize = 12.sp,
                    color = Color.White,
                    modifier = Modifier.padding(top = 6.dp)
                )
            }
        } else {
            // Formulaire d'authentification (connexion ou inscription)
            CardSection(title = if (isLogin) "Connexion" else "Creation de compte") {
                if (!isLogin) {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.weight(1f)) {
                            InputGroup(label = "Prenom") {
                                CustomTextField(
                                    value = firstName,
                                    onValueChange = { firstName = it },
                                    placeholder = "Prenom"
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            InputGroup(label = "Nom") {
                                CustomTextField(
                                    value = lastName,
                                    onValueChange = { lastName = it },
                                    placeholder = "Nom"
                                )
                            }
                        }
                    }
                }

                InputGroup(label = "Email") {
                    CustomTextField(
                        value = email,
                        onValueChange = { email = it },
                        placeholder = "email@example.com"
                    )
                }

                InputGroup(label = "Mot de passe") {
                    CustomTextField(
                        value = password,
                        onValueChange = { password = it },
                        placeholder = "8 caracteres + Maj + Min + Chiffre + Special",
                        isPassword = true
                    )
                }

                if (!isLogin) {
                    Text(
                        text = "Le mot de passe doit contenir au moins 8 caracteres, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractere special.",
                        fontSize = 12.sp,
                        color = Color.White,
                        modifier = Modifier.padding(top = 6.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        StatusMessage(
            message = statusMessage,
            isSuccess = isSuccess,
            isVisible = showStatus
        )

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Colors.cyan)
            }
        } else if (!resetToken.isNullOrEmpty()) {
            PrimaryButton(
                text = "Valider",
                onClick = {
                    showStatus = false

                    if (resetPassword.isEmpty() || resetConfirm.isEmpty()) {
                        statusMessage = "Veuillez remplir tous les champs"
                        isSuccess = false
                        showStatus = true
                        return@PrimaryButton
                    }

                    if (resetPassword != resetConfirm) {
                        statusMessage = "Les mots de passe ne correspondent pas"
                        isSuccess = false
                        showStatus = true
                        return@PrimaryButton
                    }

                    if (!isStrongPassword(resetPassword)) {
                        statusMessage = "Mot de passe non conforme"
                        isSuccess = false
                        showStatus = true
                        return@PrimaryButton
                    }

                    isLoading = true
                    coroutineScope.launch {
                        try {
                            val response = RetrofitClient.apiService.resetPassword(
                                ResetPasswordRequest(
                                    token = resetToken,
                                    newPassword = resetPassword
                                )
                            )
                            if (response.success) {
                                statusMessage = response.message ?: "Mot de passe mis a jour"
                                isSuccess = true
                                onResetDone()
                            } else {
                                statusMessage = response.error ?: "Erreur lors de la reinitialisation"
                                isSuccess = false
                            }
                        } catch (e: Exception) {
                            statusMessage = e.message ?: "Erreur reseau"
                            isSuccess = false
                        } finally {
                            isLoading = false
                            showStatus = true
                        }
                    }
                }
            )
        } else {
            PrimaryButton(
                text = if (isLogin) "Se connecter" else "Creer un compte",
                onClick = {
                    showStatus = false

                    // Validation locale des champs
                    if (email.isEmpty() || password.isEmpty() || (!isLogin && (firstName.isEmpty() || lastName.isEmpty()))) {
                        statusMessage = "Veuillez remplir tous les champs"
                        isSuccess = false
                        showStatus = true
                        return@PrimaryButton
                    }

                    // Verification du niveau de securite du mot de passe
                    if (!isLogin && !isStrongPassword(password)) {
                        statusMessage = "Mot de passe non conforme"
                        isSuccess = false
                        showStatus = true
                        return@PrimaryButton
                    }

                    isLoading = true
                    coroutineScope.launch {
                        try {
                            if (isLogin) {
                                // Connexion
                                val response = RetrofitClient.apiService.login(
                                    LoginRequest(email = email.trim(), password = password)
                                )
                                if (response.success && !response.token.isNullOrEmpty()) {
                                    statusMessage = "Connexion reussie"
                                    isSuccess = true
                                    onLoginSuccess(response.token)
                                } else {
                                    statusMessage = response.error ?: "Erreur de connexion"
                                    isSuccess = false
                                }
                            } else {
                                // Inscription
                                val response = RetrofitClient.apiService.register(
                                    RegisterRequest(
                                        email = email.trim(),
                                        password = password,
                                        firstName = firstName.trim(),
                                        lastName = lastName.trim()
                                    )
                                )
                                if (response.success) {
                                    statusMessage = response.message ?: "Compte cree. Verifiez votre email."
                                    isSuccess = true
                                    isLogin = true
                                } else {
                                    statusMessage = response.error ?: "Erreur de creation"
                                    isSuccess = false
                                }
                            }
                        } catch (e: Exception) {
                            statusMessage = e.message ?: "Erreur reseau"
                            isSuccess = false
                        } finally {
                            isLoading = false
                            showStatus = true
                        }
                    }
                }
            )

            Spacer(modifier = Modifier.height(10.dp))

            if (resetToken.isNullOrEmpty()) {
                if (isLogin) {
                    SecondaryButton(
                        text = if (showForgot) "Annuler" else "Mot de passe oublie",
                        onClick = { showForgot = !showForgot }
                    )

                    if (showForgot) {
                        Spacer(modifier = Modifier.height(10.dp))

                        // Forgot password form
                        InputGroup(label = "Email pour reinitialisation") {
                            CustomTextField(
                                value = forgotEmail,
                                onValueChange = { forgotEmail = it },
                                placeholder = "email@example.com"
                            )
                        }

                        PrimaryButton(
                            text = "Envoyer le lien",
                            onClick = {
                                showStatus = false

                                if (forgotEmail.isEmpty()) {
                                    statusMessage = "Veuillez saisir votre email"
                                    isSuccess = false
                                    showStatus = true
                                    return@PrimaryButton
                                }

                                isLoading = true
                                coroutineScope.launch {
                                    try {
                                        val response = RetrofitClient.apiService.forgotPassword(
                                            ForgotPasswordRequest(email = forgotEmail.trim())
                                        )
                                        if (response.success) {
                                            statusMessage = response.message ?: "Email envoye"
                                            isSuccess = true
                                            showForgot = false
                                            forgotEmail = ""
                                        } else {
                                            statusMessage = response.error ?: "Erreur lors de l'envoi"
                                            isSuccess = false
                                        }
                                    } catch (e: Exception) {
                                        statusMessage = e.message ?: "Erreur reseau"
                                        isSuccess = false
                                    } finally {
                                        isLoading = false
                                        showStatus = true
                                    }
                                }
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                SecondaryButton(
                    text = if (isLogin) "Je n'ai pas de compte" else "J'ai deja un compte",
                    onClick = { isLogin = !isLogin }
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
    }
}

private fun isStrongPassword(password: String): Boolean {
    val policy = Regex("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$")
    return policy.matches(password)
}
