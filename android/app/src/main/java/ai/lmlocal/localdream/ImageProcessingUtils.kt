package ai.lmlocal.localdream

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

object ImageProcessingUtils {
    private const val TAG = "ImageProcessingUtils"

    suspend fun performUpscale(
        bitmap: Bitmap,
        upscalerFilePath: String,
        outputDir: File
    ): String = withContext(Dispatchers.IO) {
        val totalStartTime = System.currentTimeMillis()

        val upscalerFile = File(upscalerFilePath)
        if (!upscalerFile.exists()) {
            throw Exception("Upscaler model file not found: ${upscalerFile.absolutePath}")
        }

        // Convert bitmap to RGB bytes
        val prepareStartTime = System.currentTimeMillis()
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        val rgbBytes = ByteArray(width * height * 3)
        for (i in pixels.indices) {
            val pixel = pixels[i]
            rgbBytes[i * 3] = ((pixel shr 16) and 0xFF).toByte()
            rgbBytes[i * 3 + 1] = ((pixel shr 8) and 0xFF).toByte()
            rgbBytes[i * 3 + 2] = (pixel and 0xFF).toByte()
        }
        Log.d(TAG, "Prepare RGB data took: ${System.currentTimeMillis() - prepareStartTime}ms")

        // Prepare binary request
        val url = URL("http://localhost:8081/upscale")
        val connection = url.openConnection() as HttpURLConnection

        try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/octet-stream")
            connection.setRequestProperty("X-Image-Width", width.toString())
            connection.setRequestProperty("X-Image-Height", height.toString())
            connection.setRequestProperty("X-Upscaler-Path", upscalerFile.absolutePath)
            connection.doOutput = true
            connection.connectTimeout = 300000 // 5 minutes
            connection.readTimeout = 300000

            // Send RGB binary data directly
            val sendStartTime = System.currentTimeMillis()
            connection.outputStream.use { os ->
                os.write(rgbBytes)
            }
            Log.d(TAG, "Send data took: ${System.currentTimeMillis() - sendStartTime}ms")

            // Read response
            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                // Read JPEG binary data
                val readStartTime = System.currentTimeMillis()
                val imageBytes = connection.inputStream.use { it.readBytes() }
                Log.d(TAG, "Receive JPEG data took: ${System.currentTimeMillis() - readStartTime}ms, size: ${imageBytes.size / 1024}KB")

                // Decode JPEG to Bitmap
                val decodeStartTime = System.currentTimeMillis()
                val resultBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                Log.d(TAG, "Decode JPEG took: ${System.currentTimeMillis() - decodeStartTime}ms")

                if (resultBitmap == null) {
                    throw Exception("Failed to decode JPEG response")
                }

                // Read response headers
                val durationMs = connection.getHeaderField("X-Duration-Ms")?.toIntOrNull() ?: 0

                Log.d(TAG, "=== Upscale complete ===")
                Log.d(TAG, "Server processing took: ${durationMs}ms")
                Log.d(TAG, "Client total time: ${System.currentTimeMillis() - totalStartTime}ms")
                Log.d(TAG, "Output size: ${resultBitmap.width}x${resultBitmap.height}")

                // Save to output file
                val outputFile = File(outputDir, "upscale_${UUID.randomUUID()}.jpg")
                FileOutputStream(outputFile).use { out ->
                    resultBitmap.compress(Bitmap.CompressFormat.JPEG, 95, out)
                }

                return@withContext "file://${outputFile.absolutePath}"
            } else {
                val errorBody = connection.errorStream?.bufferedReader()?.use { it.readText() }
                throw Exception("Upscale failed with response code: $responseCode, error: $errorBody")
            }
        } finally {
            connection.disconnect()
        }
    }
}
