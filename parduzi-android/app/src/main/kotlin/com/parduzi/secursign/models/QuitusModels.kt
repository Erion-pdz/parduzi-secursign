package com.parduzi.secursign.models

import com.google.gson.annotations.SerializedName

data class QuitusData(
    val selectedBailleur: String,
    val internalNum: String,
    val numeroBon: String,
    val clientName: String,
    val address: String,
    val batiment: String,
    val logement: String,
    val etage: String,
    val observations: String,
    val signatureClient: String, // Base64
    val signatureTech: String,   // Base64
    val gps: GpsCoordinates
)

data class GpsCoordinates(
    val lat: Double,
    val lng: Double
)

data class ApiResponse(
    val success: Boolean,
    val filename: String? = null,
    val error: String? = null
)

data class BailleurOption(
    val id: String,
    val name: String
)
