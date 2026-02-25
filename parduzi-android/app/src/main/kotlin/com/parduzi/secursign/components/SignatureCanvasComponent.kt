package com.parduzi.secursign.components

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.util.Base64
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.io.ByteArrayOutputStream

data class SignaturePath(
    val points: List<Offset>
)

@Composable
fun SignatureCanvasComponent(
    onSignatureChange: (String) -> Unit,
    onClear: () -> Unit
) {
    var canvasSize by remember { mutableStateOf(IntSize.Zero) }
    val paths = remember { mutableStateListOf<SignaturePath>() }
    var currentPath by remember { mutableStateOf(listOf<Offset>()) }
    var canvasBitmap by remember { mutableStateOf<Bitmap?>(null) }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(300.dp)
            .background(Color.White)
            .border(2.dp, Color(0xFF0a91a9), shape = RoundedCornerShape(8.dp))
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset ->
                        currentPath = listOf(offset)
                    },
                    onDrag = { change, _ ->
                        currentPath = currentPath + change.position
                    },
                    onDragEnd = {
                        if (currentPath.isNotEmpty()) {
                            paths.add(SignaturePath(currentPath))
                            currentPath = emptyList()
                            // Redraw canvas
                            updateCanvasBitmap(
                                canvasSize,
                                paths,
                                currentPath
                            ) { bitmap ->
                                canvasBitmap = bitmap
                                convertBitmapToBase64(bitmap) { base64 ->
                                    onSignatureChange(base64)
                                }
                            }
                        }
                    }
                )
            }
            .onSizeChanged { canvasSize = it }
    ) {
        // Draw signature canvas
        if (canvasSize.width > 0 && canvasSize.height > 0) {
            DrawSignatureCanvas(
                paths = paths,
                currentPath = currentPath,
                onBitmapReady = { bitmap ->
                    canvasBitmap = bitmap
                }
            )
        }

        // Clear button positioned at bottom
        Button(
            onClick = {
                paths.clear()
                currentPath = emptyList()
                canvasBitmap = null
                onClear()
                onSignatureChange("")
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(10.dp)
                .height(36.dp)
                .width(100.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFEF4444),
                contentColor = Color.White
            )
        ) {
            Text("Effacer", fontSize = 12.sp)
        }
    }
}

@Composable
fun DrawSignatureCanvas(
    paths: List<SignaturePath>,
    currentPath: List<Offset>,
    onBitmapReady: (Bitmap) -> Unit = {}
) {
    androidx.compose.foundation.Canvas(
        modifier = Modifier.fillMaxSize()
    ) {
        // Draw saved paths
        paths.forEach { path ->
            if (path.points.size > 1) {
                for (i in 0 until path.points.size - 1) {
                    drawLine(
                        color = Color.Black,
                        start = path.points[i],
                        end = path.points[i + 1],
                        strokeWidth = 4f
                    )
                }
            }
        }

        // Draw current path
        if (currentPath.size > 1) {
            for (i in 0 until currentPath.size - 1) {
                drawLine(
                    color = Color.Black,
                    start = currentPath[i],
                    end = currentPath[i + 1],
                    strokeWidth = 4f
                )
            }
        }
    }
}

fun updateCanvasBitmap(
    size: IntSize,
    paths: List<SignaturePath>,
    currentPath: List<Offset>,
    onBitmapReady: (Bitmap) -> Unit
) {
    if (size.width <= 0 || size.height <= 0) return

    val bitmap = Bitmap.createBitmap(size.width, size.height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint().apply {
        color = android.graphics.Color.BLACK
        strokeWidth = 8f
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        isAntiAlias = true
    }

    // Fill white background
    canvas.drawColor(android.graphics.Color.WHITE)

    // Draw paths
    paths.forEach { path ->
        if (path.points.size > 1) {
            for (i in 0 until path.points.size - 1) {
                canvas.drawLine(
                    path.points[i].x,
                    path.points[i].y,
                    path.points[i + 1].x,
                    path.points[i + 1].y,
                    paint
                )
            }
        }
    }

    // Draw current path
    if (currentPath.size > 1) {
        for (i in 0 until currentPath.size - 1) {
            canvas.drawLine(
                currentPath[i].x,
                currentPath[i].y,
                currentPath[i + 1].x,
                currentPath[i + 1].y,
                paint
            )
        }
    }

    onBitmapReady(bitmap)
}

fun convertBitmapToBase64(bitmap: Bitmap, onBase64Ready: (String) -> Unit) {
    try {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 90, outputStream)
        val byteArray = outputStream.toByteArray()
        val base64String = Base64.encodeToString(byteArray, Base64.DEFAULT)
        onBase64Ready("data:image/png;base64,$base64String")
    } catch (e: Exception) {
        e.printStackTrace()
        onBase64Ready("")
    }
}
