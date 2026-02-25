package com.parduzi.secursign.models

data class RegisterRequest(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class ForgotPasswordRequest(
    val email: String
)

data class ResetPasswordRequest(
    val token: String,
    val newPassword: String
)

data class AuthUser(
    val id: Int,
    val email: String,
    val firstName: String,
    val lastName: String
)

data class AuthResponse(
    val success: Boolean,
    val token: String? = null,
    val user: AuthUser? = null,
    val message: String? = null,
    val error: String? = null
)

data class BasicResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)
