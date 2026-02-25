package com.parduzi.secursign

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.parduzi.secursign.models.GpsCoordinates

@Composable
fun getGPSLocation(
    context: Context,
    locationClient: FusedLocationProviderClient?
): GpsCoordinates {
    var coords by remember { mutableStateOf(GpsCoordinates(0.0, 0.0)) }
    
    LaunchedEffect(Unit) {
        if (ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            try {
                locationClient?.lastLocation?.addOnSuccessListener { location: Location? ->
                    if (location != null) {
                        coords = GpsCoordinates(location.latitude, location.longitude)
                    }
                }
            } catch (e: SecurityException) {
                e.printStackTrace()
            }
        }
    }
    
    return coords
}

@Composable
fun LoadingScreen() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "⏳ Chargement...",
            color = Color.White
        )
    }
}
