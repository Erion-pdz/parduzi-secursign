package com.parduzi.secursign.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parduzi.secursign.R
import com.parduzi.secursign.ui.theme.Colors

@Composable
fun Header() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 20.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Logo
        Box(
            modifier = Modifier
                .size(50.dp)
                .background(color = Colors.primary, shape = RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.logo_pz),
                contentDescription = "Parduzi Logo",
                modifier = Modifier.size(40.dp)
            )
        }

        Spacer(modifier = Modifier.width(15.dp))

        // Title & Subtitle
        Column {
            Text(
                text = "Quitus Numérique",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
            Text(
                text = "Validation certifiée de fin de chantier",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF1a1a1a)
            )
        }
    }
}

@Composable
fun CardSection(
    title: String,
    borderColor: Color = Colors.border,
    content: @Composable () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(color = Colors.card, shape = RoundedCornerShape(16.dp))
            .border(1.dp, borderColor, shape = RoundedCornerShape(16.dp))
            .padding(20.dp)
            .padding(bottom = 20.dp)
    ) {
        Text(
            text = title,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            modifier = Modifier
                .padding(bottom = 15.dp)
                .fillMaxWidth(),
            letterSpacing = 1.sp
        )
        content()
    }
}

@Composable
fun FormLabel(text: String) {
    Text(
        text = text,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = Color.White,
        modifier = Modifier
            .padding(bottom = 5.dp)
            .height(18.dp),
        maxLines = 1
    )
}

@Composable
fun InputGroup(
    label: String,
    content: @Composable () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 15.dp)) {
        FormLabel(text = label)
        content()
    }
}

@Composable
fun StatusMessage(
    message: String,
    isSuccess: Boolean,
    isVisible: Boolean
) {
    if (isVisible) {
        val backgroundColor = if (isSuccess) Colors.success else Colors.error
        val textColor = Color.White
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(backgroundColor, shape = RoundedCornerShape(8.dp))
                .padding(16.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Text(
                text = message,
                color = textColor,
                fontSize = 14.sp
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}
