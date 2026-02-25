package com.parduzi.secursign.screens

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.util.Base64
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
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
import com.google.android.gms.location.LocationServices
import com.parduzi.secursign.api.RetrofitClient
import com.parduzi.secursign.components.CardSection
import com.parduzi.secursign.components.CustomTextField
import com.parduzi.secursign.components.Header
import com.parduzi.secursign.components.InputGroup
import com.parduzi.secursign.components.PrimaryButton
import com.parduzi.secursign.components.SecondaryButton
import com.parduzi.secursign.components.SignatureButton
import com.parduzi.secursign.components.StatusMessage
import com.parduzi.secursign.models.GpsCoordinates
import com.parduzi.secursign.models.QuitusData
import com.parduzi.secursign.ui.theme.Colors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File

val BAILEURS = listOf(
    "HMP" to "HMP (Habitat Marseille Provence)",
    "ERILIA" to "ERILIA",
    "13 HABITAT" to "13 HABITAT",
    "CDC HABITAT" to "CDC HABITAT",
    "LOGIREM" to "LOGIREM",
    "UNICIL" to "UNICIL",
    "PARDUZI STANDARD" to "Parduzi (Autre)"
)

@Composable
fun MainScreen(
    context: Context,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val coroutineScope = rememberCoroutineScope()
    
    var selectedBailleur by remember { mutableStateOf("HMP") }
    var internalNum by remember { mutableStateOf("") }
    var numeroBon by remember { mutableStateOf("") }
    var clientName by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var batiment by remember { mutableStateOf("") }
    var logement by remember { mutableStateOf("") }
    var etage by remember { mutableStateOf("") }
    var observations by remember { mutableStateOf("") }
    
    var isClientSigned by remember { mutableStateOf(false) }
    var isTechSigned by remember { mutableStateOf(false) }
    var clientSignatureData by remember { mutableStateOf("") }
    var techSignatureData by remember { mutableStateOf("") }
    
    var showClientSignatureModal by remember { mutableStateOf(false) }
    var showTechSignatureModal by remember { mutableStateOf(false) }
    
    var isLoading by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf("") }
    var isSuccess by remember { mutableStateOf(false) }
    var showStatus by remember { mutableStateOf(false) }
    
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
    ) {
        Header()

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.End
        ) {
            SecondaryButton(
                text = "Se deconnecter",
                onClick = onLogout,
                modifier = Modifier.width(160.dp)
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // --- DOSSIER ---
        CardSection(title = "🏢 Informations Dossier") {
            InputGroup(label = "Bailleur / Client Principal") {
                BailleurDropdown(
                    selected = selectedBailleur,
                    onSelected = { selectedBailleur = it }
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    InputGroup(label = "Numéro Interne (Obligatoire)") {
                        CustomTextField(
                            value = internalNum,
                            onValueChange = { internalNum = it },
                            placeholder = "Ex: INT-2025-001"
                        )
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    InputGroup(label = "N° de Bon (Optionnel)") {
                        CustomTextField(
                            value = numeroBon,
                            onValueChange = { numeroBon = it },
                            placeholder = "Laisser vide si absent"
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // --- LOCATAIRE ---
        CardSection(title = "👤 Locataire & Lieu") {
            InputGroup(label = "Nom du Locataire / Client") {
                CustomTextField(
                    value = clientName,
                    onValueChange = { clientName = it },
                    placeholder = "NOM Prénom"
                )
            }

            InputGroup(label = "Cité") {
                CustomTextField(
                    value = address,
                    onValueChange = { address = it },
                    placeholder = "Ex: Cité Rabelais"
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    InputGroup(label = "Bâtiment") {
                        CustomTextField(
                            value = batiment,
                            onValueChange = { batiment = it },
                            placeholder = "Ex: A"
                        )
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    InputGroup(label = "Logement") {
                        CustomTextField(
                            value = logement,
                            onValueChange = { logement = it },
                            placeholder = "Ex: 12"
                        )
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    InputGroup(label = "Étage") {
                        CustomTextField(
                            value = etage,
                            onValueChange = { etage = it },
                            placeholder = "Ex: 2"
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // --- DETAILS ---
        CardSection(title = "📝 Détails") {
            InputGroup(label = "Observations") {
                CustomTextField(
                    value = observations,
                    onValueChange = { observations = it },
                    placeholder = "RAS ou réserves...",
                    isMultiline = true
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // --- SIGNATURES ---
        CardSection(title = "✍️ Signatures") {
            SignatureButton(
                label = "Locataire / Client",
                status = if (isClientSigned) "✅ Signé" else "✍️ Cliquer pour signer",
                isSigned = isClientSigned,
                onClick = { showClientSignatureModal = true }
            )

            Spacer(modifier = Modifier.height(15.dp))

            SignatureButton(
                label = "Technicien",
                status = if (isTechSigned) "✅ Signé" else "✍️ Cliquer pour signer",
                isSigned = isTechSigned,
                onClick = { showTechSignatureModal = true }
            )
        }

        // Client Signature Modal
        if (showClientSignatureModal) {
            SignatureModal(
                title = "Signature Locataire / Client",
                onSignatureSaved = { signature ->
                    clientSignatureData = signature
                    isClientSigned = true
                    showClientSignatureModal = false
                },
                onDismiss = { showClientSignatureModal = false }
            )
        }

        // Tech Signature Modal
        if (showTechSignatureModal) {
            SignatureModal(
                title = "Signature Technicien",
                onSignatureSaved = { signature ->
                    techSignatureData = signature
                    isTechSigned = true
                    showTechSignatureModal = false
                },
                onDismiss = { showTechSignatureModal = false }
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // --- STATUS MESSAGE ---
        StatusMessage(
            message = statusMessage,
            isSuccess = isSuccess,
            isVisible = showStatus
        )

        // --- SUBMIT BUTTON ---
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Colors.cyan)
            }
        } else {
            PrimaryButton(
                text = "📨 Envoyer le Quitus",
                onClick = {
                    // Validation
                    if (!isClientSigned || !isTechSigned) {
                        statusMessage = "⚠️ Signatures manquantes!"
                        isSuccess = false
                        showStatus = true
                        return@PrimaryButton
                    }
                    if (internalNum.isEmpty() || clientName.isEmpty() || address.isEmpty()) {
                        statusMessage = "⚠️ Remplissez les champs obligatoires"
                        isSuccess = false
                        showStatus = true
                        return@PrimaryButton
                    }

                    isLoading = true
                    showStatus = false

                    coroutineScope.launch {
                        try {
                            // Get GPS coordinates
                            val gpsCoords = getGpsCoordinates(context)

                            // Create payload
                            val payload = QuitusData(
                                selectedBailleur = selectedBailleur,
                                internalNum = internalNum,
                                numeroBon = numeroBon,
                                clientName = clientName,
                                address = address,
                                batiment = batiment,
                                logement = logement,
                                etage = etage,
                                observations = observations,
                                signatureClient = clientSignatureData,
                                signatureTech = techSignatureData,
                                gps = gpsCoords
                            )

                            // Send to API
                            val response = RetrofitClient.apiService.generateQuitus(payload)

                            if (response.success) {
                                statusMessage = "✅ Quitus envoyé avec succès!\nFichier: ${response.filename}"
                                isSuccess = true
                                
                                // Reset form
                                internalNum = ""
                                numeroBon = ""
                                clientName = ""
                                address = ""
                                batiment = ""
                                logement = ""
                                etage = ""
                                observations = ""
                                isClientSigned = false
                                isTechSigned = false
                                clientSignatureData = ""
                                techSignatureData = ""
                                selectedBailleur = "HMP"
                            } else {
                                statusMessage = "❌ Erreur: ${response.error ?: "Erreur inconnue"}"
                                isSuccess = false
                            }
                        } catch (e: Exception) {
                            statusMessage = "❌ Erreur: ${e.message ?: "Erreur réseau"}"
                            isSuccess = false
                        } finally {
                            isLoading = false
                            showStatus = true
                        }
                    }
                }
            )
        }

        Spacer(modifier = Modifier.height(20.dp))
    }
}

@SuppressLint("MissingPermission")
suspend fun getGpsCoordinates(context: Context): GpsCoordinates {
    return try {
        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
        withContext(Dispatchers.Default) {
            try {
                val task = fusedLocationClient.lastLocation
                // Try to get location, but don't block if not available
                var gps = GpsCoordinates(0.0, 0.0)
                task.addOnSuccessListener { location ->
                    if (location != null) {
                        gps = GpsCoordinates(
                            lat = location.latitude,
                            lng = location.longitude
                        )
                    }
                }
                gps
            } catch (e: Exception) {
                GpsCoordinates(0.0, 0.0)
            }
        }
    } catch (e: Exception) {
        GpsCoordinates(0.0, 0.0)
    }
}

@Composable
fun BailleurDropdown(
    selected: String,
    onSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White, shape = RoundedCornerShape(8.dp))
            .border(1.dp, Colors.border, shape = RoundedCornerShape(8.dp))
            .clickable { expanded = true }
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = BAILEURS.firstOrNull { it.first == selected }?.second ?: selected,
                color = Color.Black,
                fontSize = 15.sp,
                modifier = Modifier.weight(1f)
            )
            Icon(
                Icons.Filled.ArrowDropDown,
                contentDescription = "Dropdown",
                tint = Colors.cyan
            )
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth(0.9f)
        ) {
            BAILEURS.forEach { (id, displayName) ->
                DropdownMenuItem(
                    text = {
                        Text(
                            text = displayName,
                            color = Color.Black,
                            fontSize = 14.sp
                        )
                    },
                    onClick = {
                        onSelected(id)
                        expanded = false
                    }
                )
            }
        }
    }
}
