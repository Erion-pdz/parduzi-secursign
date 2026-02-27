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

/**
 * Liste des bailleurs sociaux supportés par l'application
 * Chaque bailleur a un ID (utilisé en interne) et un nom d'affichage
 * Ces noms apparaissent dans le menu déroulant du formulaire
 */
val BAILEURS = listOf(
    "HMP" to "HMP (Habitat Marseille Provence)",
    "ERILIA" to "ERILIA",
    "13 HABITAT" to "13 HABITAT",
    "CDC HABITAT" to "CDC HABITAT",
    "LOGIREM" to "LOGIREM",
    "UNICIL" to "UNICIL",
    "PARDUZI STANDARD" to "Parduzi (Autre)"
)

/**
 * MainScreen - Écran principal de l'application
 * 
 * C'est ici que je gère :
 * - Le formulaire de quitus avec tous les champs (bailleur, numéro, client, adresse...)
 * - Les 2 signatures (client et technicien) avec des modals de dessin
 * - La capture GPS automatique pour prouver la présence sur site
 * - L'envoi au backend pour générer le Excel + envoi par email
 * - Le bouton de déconnexion
 */
@Composable
fun MainScreen(
    context: Context,
    onLogout: () -> Unit, //Callback appelé quand l'utilisateur clique sur "Se déconnecter"
    modifier: Modifier = Modifier
) {
    val coroutineScope = rememberCoroutineScope()
    
    // --- Variables d'état du formulaire ---
    // Je stocke toutes les données saisies par l'utilisateur
    var selectedBailleur by remember { mutableStateOf("HMP") }
    var internalNum by remember { mutableStateOf("") }      // Obligatoire
    var numeroBon by remember { mutableStateOf("") }        // Optionnel
    var clientName by remember { mutableStateOf("") }       // Obligatoire
    var address by remember { mutableStateOf("") }          // Obligatoire
    var batiment by remember { mutableStateOf("") }
    var logement by remember { mutableStateOf("") }
    var etage by remember { mutableStateOf("") }
    var observations by remember { mutableStateOf("") }     // Zone de texte libre pour remarques
    
    // --- Gestion des signatures ---
    // Chaque signature est stockée en Base64 (image PNG compressée)
    var isClientSigned by remember { mutableStateOf(false) }
    var isTechSigned by remember { mutableStateOf(false) }
    var clientSignatureData by remember { mutableStateOf("") } // Base64 de la signature client
    var techSignatureData by remember { mutableStateOf("") }   // Base64 de la signature technicien
    
    // --- Contrôle des modals de signature ---
    var showClientSignatureModal by remember { mutableStateOf(false) }
    var showTechSignatureModal by remember { mutableStateOf(false) }
    
    // --- État de l'envoi ---
    var isLoading by remember { mutableStateOf(false) }     // True pendant l'appel API
    var statusMessage by remember { mutableStateOf("") }    // Message de succès/erreur
    var isSuccess by remember { mutableStateOf(false) }     // Couleur du message (vert/rouge)
    var showStatus by remember { mutableStateOf(false) }    // Afficher ou masquer le message
    
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
    ) {
        Header()

        // Bouton de déconnexion en haut à droite
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
                    // --- VALIDATION DES DONNÉES ---
                    // Vérification que toutes les signatures sont bien présentes
                    if (!isClientSigned || !isTechSigned) {
                        statusMessage = "⚠️ Signatures manquantes!"
                        isSuccess = false
                        showStatus = true
                        return@PrimaryButton
                    }
                    // Vérification des champs obligatoires
                    if (internalNum.isEmpty() || clientName.isEmpty() || address.isEmpty()) {
                        statusMessage = "⚠️ Remplissez les champs obligatoires"
                        isSuccess = false
                        showStatus = true
                        return@PrimaryButton
                    }

                    isLoading = true
                    showStatus = false

                    // --- LANCEMENT DE LA GÉNÉRATION ---
                    coroutineScope.launch {
                        try {
                            // Étape 1 : Je récupère les coordonnées GPS actuelles
                            // Cela prouve que j'étais bien sur place au moment du quitus
                            val gpsCoords = getGpsCoordinates(context)

                            // Étape 2 : Je crée l'objet de données avec tout le formulaire
                            // Les signatures sont en Base64, prêtes à être insérées dans Excel
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

                            // Étape 3 : J'envoie tout au backend Node.js
                            // Le serveur va générer le Excel et l'envoyer par email
                            val response = RetrofitClient.apiService.generateQuitus(payload)

                            if (response.success) {
                                statusMessage = "✅ Quitus envoyé avec succès!\nFichier: ${response.filename}"
                                isSuccess = true
                                
                                // Réinitialisation du formulaire après succès
                                // L'utilisateur peut créer un nouveau quitus directement
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

/**
 * Récupère les coordonnées GPS actuelles de l'appareil
 * 
 * Cette fonction est cruciale pour la traçabilité :
 * - Elle prouve que j'étais physiquement sur le lieu du chantier
 * - Les coordonnées sont envoyées au backend et stockées en base de données
 * - En cas d'erreur (GPS désactivé, pas de permission...), je retourne 0,0
 * 
 * @SuppressLint("MissingPermission") car je demande les permissions au runtime séparément
 */
@SuppressLint("MissingPermission")
suspend fun getGpsCoordinates(context: Context): GpsCoordinates {
    return try {
        // FusedLocationProvider = API Google Play Services pour la localisation
        // Plus précis et moins gourmand en batterie que le GPS direct
        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
        withContext(Dispatchers.Default) {
            try {
                // Je récupère la dernière localisation connue (rapide)
                // Pas besoin d'attendre une nouvelle mise à jour GPS
                val task = fusedLocationClient.lastLocation
                var gps = GpsCoordinates(0.0, 0.0) // Valeur par défaut si pas de GPS
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
