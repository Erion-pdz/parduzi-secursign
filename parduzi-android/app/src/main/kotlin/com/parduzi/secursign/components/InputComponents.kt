package com.parduzi.secursign.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parduzi.secursign.ui.theme.Colors

@Composable
fun CustomTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "",
    modifier: Modifier = Modifier.fillMaxWidth(),
    isMultiline: Boolean = false,
    isPassword: Boolean = false,
    minLines: Int = 1
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, color = Color.Gray) },
        modifier = modifier.then(
            Modifier
                .fillMaxWidth()
                .background(Color.White, shape = RoundedCornerShape(8.dp))
        ),
        textStyle = TextStyle(
            color = Color.Black,
            fontSize = 15.sp
        ),
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        singleLine = !isMultiline,
        minLines = if (isMultiline) 4 else minLines,
        maxLines = if (isMultiline) Int.MAX_VALUE else 1,
        shape = RoundedCornerShape(8.dp),
        colors = TextFieldDefaults.colors(
            unfocusedContainerColor = Color.White,
            focusedContainerColor = Color.White,
            unfocusedIndicatorColor = Colors.border,
            focusedIndicatorColor = Colors.cyan,
            unfocusedTextColor = Color.Black,
            focusedTextColor = Color.Black
        )
    )
}

@Composable
fun CustomDropdown(
    value: String,
    onValueChange: (String) -> Unit,
    options: List<Pair<String, String>>, // id to display name
    label: String
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White, shape = RoundedCornerShape(8.dp))
            .border(1.dp, Colors.border, shape = RoundedCornerShape(8.dp))
            .padding(12.dp)
    ) {
        Text(
            text = value.ifEmpty { label },
            color = Color.Black,
            fontSize = 15.sp
        )
    }
}
