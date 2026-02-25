package com.parduzi.secursign.api

import com.parduzi.secursign.models.ApiResponse
import com.parduzi.secursign.models.AuthResponse
import com.parduzi.secursign.models.BasicResponse
import com.parduzi.secursign.models.ForgotPasswordRequest
import com.parduzi.secursign.models.LoginRequest
import com.parduzi.secursign.models.QuitusData
import com.parduzi.secursign.models.RegisterRequest
import com.parduzi.secursign.models.ResetPasswordRequest
import retrofit2.http.Body
import retrofit2.http.POST

interface ParduziApiService {
    @POST("/api/generate")
    suspend fun generateQuitus(@Body data: QuitusData): ApiResponse

    @POST("/api/auth/register")
    suspend fun register(@Body data: RegisterRequest): AuthResponse

    @POST("/api/auth/login")
    suspend fun login(@Body data: LoginRequest): AuthResponse

    @POST("/api/auth/forgot")
    suspend fun forgotPassword(@Body data: ForgotPasswordRequest): BasicResponse

    @POST("/api/auth/reset")
    suspend fun resetPassword(@Body data: ResetPasswordRequest): BasicResponse
}
