package com.parduzi.secursign.utils

import android.R
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.util.Base64
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import java.io.ByteArrayOutputStream

class SignatureCapture {
    private val paths = mutableListOf<Pair<Path, Float>>() // Path et largeur
    private var currentPath: Path? = null
    private var currentPoints = mutableListOf<Pair<Float, Float>>()
    
    fun startPath(x: Float, y: Float) {
        currentPath = Path().apply { moveTo(x, y) }
        currentPoints.clear()
        currentPoints.add(x to y)
    }
    
    fun addPoint(x: Float, y: Float) {
        currentPath?.lineTo(x, y)
        currentPoints.add(x to y)
    }
    
    fun endPath() {
        currentPath?.let {
            // Calculer la largeur en fonction de la vitesse du doigt
            val avgSpeed = calculateSpeed()
            val strokeWidth = 3f - (avgSpeed / 100f).coerceIn(0f, 2f) // 1-3 pixels
            paths.add(it to strokeWidth)
        }
        currentPath = null
        currentPoints.clear()
    }
    
    private fun calculateSpeed(): Float {
        if (currentPoints.size < 2) return 0f
        var totalDistance = 0f
        for (i in 0 until currentPoints.size - 1) {
            val p1 = currentPoints[i]
            val p2 = currentPoints[i + 1]
            totalDistance += Math.hypot(
                (p2.first - p1.first).toDouble(),
                (p2.second - p1.second).toDouble()
            ).toFloat()
        }
        return totalDistance / currentPoints.size
    }
    
    fun toBitmap(width: Int = 400, height: Int = 200): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(android.graphics.Color.WHITE)
        
        val paint = Paint().apply {
            color = android.graphics.Color.BLACK
            isAntiAlias = true
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
        }
        
        for ((path, strokeWidth) in paths) {
            paint.strokeWidth = strokeWidth
            canvas.drawPath(path, paint)
        }
        
        return bitmap
    }
    
    fun toBase64(): String {
        val bitmap = toBitmap()
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        return Base64.encodeToString(stream.toByteArray(), Base64.DEFAULT)
    }
    
    fun clear() {
        paths.clear()
        currentPath = null
        currentPoints.clear()
    }
    
    fun isEmpty(): Boolean = paths.isEmpty()
}

@Composable
fun SignaturePadComposable(
    modifier: Modifier = Modifier.fillMaxWidth().height(250.dp),
    onSignatureReady: (String) -> Unit = {}
) {
    val signature = remember { SignatureCapture() }
    val isDrawing = remember { mutableStateOf(false) }
    
    Box(
        modifier = modifier
            .background(Color.White)
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset ->
                        signature.startPath(offset.x, offset.y)
                        isDrawing.value = true
                    },
                    onDrag = { change, _ ->
                        signature.addPoint(change.position.x, change.position.y)
                    },
                    onDragEnd = {
                        signature.endPath()
                        isDrawing.value = false
                        if (!signature.isEmpty()) {
                            onSignatureReady(signature.toBase64())
                        }
                    },
                    onDragCancel = {
                        signature.endPath()
                        isDrawing.value = false
                    }
                )
            }
    ) {
        // Le canvas réel serait rendu ici avec DrawScope
        // Pour une implémentation simple, on utilise le captage implicite
    }
}
