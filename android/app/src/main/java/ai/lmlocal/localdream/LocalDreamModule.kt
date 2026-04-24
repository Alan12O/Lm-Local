package ai.lmlocal.localdream

import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.TimeUnit

class LocalDreamModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private var isSubscribed = false

    companion object {
        private const val TAG = "LocalDreamModule"
        private const val BACKEND_PORT = 8090
        private const val HEALTH_CHECK_TIMEOUT_MS = 90_000L // 90 seconds max wait
        private const val HEALTH_CHECK_INTERVAL_MS = 200L   // poll every 200ms
    }

    override fun getName(): String {
        return "LocalDream"
    }

    /**
     * Wait for the native backend server to be ready by polling the /health endpoint.
     * The native binary (libstable_diffusion_core.so) takes time to initialize:
     * - Load QNN/MNN runtime libraries
     * - Load model weights into memory (clip, unet, vae_decoder, tokenizer)
     * - Start the HTTP server
     *
     * Without this health check, generateImage() would fail with "connection refused"
     * because the HTTP server isn't ready yet.
     */
    private suspend fun waitForBackendReady(): Boolean = withContext(Dispatchers.IO) {
        val client = OkHttpClient.Builder()
            .connectTimeout(500, TimeUnit.MILLISECONDS)
            .readTimeout(500, TimeUnit.MILLISECONDS)
            .build()

        val startTime = System.currentTimeMillis()
        var attemptCount = 0

        Log.i(TAG, "⏳ Waiting for backend server on port $BACKEND_PORT...")

        while (isActive) {
            // Check timeout
            val elapsed = System.currentTimeMillis() - startTime
            if (elapsed > HEALTH_CHECK_TIMEOUT_MS) {
                Log.e(TAG, "❌ Backend health check timed out after ${elapsed}ms ($attemptCount attempts)")
                return@withContext false
            }

            // Check if backend reported an error via StateFlow
            val currentState = BackendService.backendState.value
            if (currentState is BackendService.BackendState.Error) {
                Log.e(TAG, "❌ Backend reported error: ${currentState.message}")
                return@withContext false
            }

            attemptCount++
            try {
                val request = Request.Builder()
                    .url("http://localhost:$BACKEND_PORT/health")
                    .get()
                    .build()

                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    Log.i(TAG, "✅ Backend health check passed after ${elapsed}ms ($attemptCount attempts)")
                    response.close()
                    return@withContext true
                }
                response.close()
            } catch (_: Exception) {
                // Expected while server is starting up — connection refused, timeout, etc.
            }

            if (attemptCount % 25 == 0) {
                Log.d(TAG, "⏳ Still waiting for backend... ${elapsed / 1000}s elapsed, $attemptCount attempts")
            }

            delay(HEALTH_CHECK_INTERVAL_MS)
        }

        return@withContext false
    }

    @ReactMethod
    fun initializeModels(modelsDir: String, useCpuClip: Boolean, runOnCpu: Boolean, modelId: String, textEmbeddingSize: Int, promise: Promise) {
        scope.launch {
            try {
                val context = reactApplicationContext

                Log.i(TAG, "🚀 Starting BackendService with model: $modelId, dir: $modelsDir")
                Log.i(TAG, "   useCpuClip=$useCpuClip, runOnCpu=$runOnCpu, textEmbeddingSize=$textEmbeddingSize")

                // Start backend service — use startForegroundService on Android 12+ (API 31+)
                val intent = Intent(context, BackendService::class.java).apply {
                    putExtra("modelsDir", modelsDir)
                    putExtra("useCpuClip", useCpuClip)
                    putExtra("runOnCpu", runOnCpu)
                    putExtra("modelId", modelId)
                    putExtra("textEmbeddingSize", textEmbeddingSize)
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }

                // Subscribe to state changes if not already
                if (!isSubscribed) {
                    isSubscribed = true
                    subscribeToStateFlows()
                }

                // CRITICAL: Wait for the native backend HTTP server to be ready
                // The server needs time to load model weights and start listening.
                // Without this, generateImage() would immediately fail with "connection refused".
                val isReady = withContext(Dispatchers.IO) {
                    waitForBackendReady()
                }

                if (isReady) {
                    Log.i(TAG, "✅ Backend fully initialized and ready for generation")
                    sendEvent("onBackendReady", null)
                    promise.resolve(true)
                } else {
                    val errorMsg = "Backend server failed to start within ${HEALTH_CHECK_TIMEOUT_MS / 1000}s"
                    Log.e(TAG, "❌ $errorMsg")
                    sendEvent("onImageGenerationError", errorMsg)
                    promise.reject("BACKEND_TIMEOUT", errorMsg)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error starting backend", e)
                promise.reject("INIT_ERROR", "Error inicializando backend: ${e.message}", e)
            }
        }
    }

    private fun subscribeToStateFlows() {
        scope.launch {
            BackendService.backendState.collectLatest { state ->
                Log.d(TAG, "Backend state changed: $state")
                when (state) {
                    is BackendService.BackendState.Running -> {
                        // Backend process started (but HTTP server may not be ready yet)
                        Log.i(TAG, "Backend process is running")
                    }
                    is BackendService.BackendState.Error -> {
                        Log.e(TAG, "Backend error: ${state.message}")
                        sendEvent("onImageGenerationError", "Backend error: ${state.message}")
                    }
                    else -> {}
                }
            }
        }

        scope.launch {
            BackgroundGenerationService.generationState.collectLatest { state ->
                when (state) {
                    is BackgroundGenerationService.GenerationState.Progress -> {
                        val params = Arguments.createMap()
                        params.putDouble("progress", state.progress.toDouble())
                        sendEvent("onImageGenerationProgress", params)
                    }
                    is BackgroundGenerationService.GenerationState.Complete -> {
                        val params = Arguments.createMap()
                        // Save bitmap to temp file to send back to JS
                        val context = reactApplicationContext
                        val file = File(context.cacheDir, "generated_${UUID.randomUUID()}.jpg")
                        val out = FileOutputStream(file)
                        state.bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 95, out)
                        out.flush()
                        out.close()

                        params.putString("imageUri", "file://" + file.absolutePath)
                        state.seed?.let { params.putString("seed", it.toString()) }
                        Log.i(TAG, "✅ Image generation complete: ${file.absolutePath}")
                        sendEvent("onImageGenerationComplete", params)
                        BackgroundGenerationService.markBitmapConsumed()
                        BackgroundGenerationService.clearCompleteState()
                    }
                    is BackgroundGenerationService.GenerationState.Error -> {
                        Log.e(TAG, "Generation error: ${state.message}")
                        sendEvent("onImageGenerationError", state.message)
                        BackgroundGenerationService.resetState()
                    }
                    else -> {}
                }
            }
        }
    }

    @ReactMethod
    fun generateImage(prompt: String, negativePrompt: String, steps: Int, cfg: Float, width: Int, height: Int, seed: Double, promise: Promise) {
        val context = reactApplicationContext

        if (BackgroundGenerationService.isServiceRunning.value) {
            promise.reject("ALREADY_GENERATING", "Actualmente generando")
            return
        }

        // Verify backend is still alive before attempting generation
        val backendState = BackendService.backendState.value
        if (backendState is BackendService.BackendState.Error || backendState is BackendService.BackendState.Idle) {
            promise.reject("ERR_NO_MODEL", "El backend no está corriendo. Por favor, recarga el modelo.")
            return
        }

        try {
            Log.i(TAG, "🎨 Starting image generation: prompt='${prompt.take(50)}...', steps=$steps, cfg=$cfg, ${width}x${height}")

            val intent = Intent(context, BackgroundGenerationService::class.java).apply {
                putExtra("prompt", prompt)
                putExtra("negative_prompt", negativePrompt)
                putExtra("steps", steps)
                putExtra("cfg", cfg)
                putExtra("width", width)
                putExtra("height", height)
                if (seed > 0) {
                    putExtra("seed", seed.toLong())
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
           Log.e(TAG, "❌ Error starting generation", e)
           promise.reject("START_ERR", "Error arrancando generación: ${e.message}", e)
        }
    }

    @ReactMethod
    fun stopGeneration(promise: Promise) {
        val intent = Intent(reactApplicationContext, BackgroundGenerationService::class.java).apply {
            action = BackgroundGenerationService.ACTION_STOP
        }
        reactApplicationContext.startService(intent)
        promise.resolve(true)
    }

    @ReactMethod
    fun restartBackend(promise: Promise) {
        try {
            Log.i(TAG, "🔄 Manual backend restart requested")
            val intent = Intent(reactApplicationContext, BackendService::class.java).apply {
                action = BackendService.ACTION_RESTART
            }
            reactApplicationContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error restarting backend", e)
            promise.reject("RESTART_ERR", e.message)
        }
    }

    @ReactMethod
    fun stopBackend(promise: Promise) {
        scope.launch {
            try {
                val context = reactApplicationContext
                val intent = Intent(context, BackendService::class.java).apply {
                    action = BackendService.ACTION_STOP
                }
                context.startService(intent)

                // CRITICAL: Wait until the backend process is fully dead and DSP
                // handles are released before resolving. Without this, the next
                // initializeModels() call races the dying process and inherits
                // stale FastRPC / DMA handles that corrupt the Hexagon DSP state.
                val maxWaitMs = 10_000L
                val pollMs = 200L
                val startTime = System.currentTimeMillis()
                while (System.currentTimeMillis() - startTime < maxWaitMs) {
                    val state = BackendService.backendState.value
                    if (state is BackendService.BackendState.Idle) {
                        Log.i(TAG, "✅ Backend confirmed stopped (Idle) after ${System.currentTimeMillis() - startTime}ms")
                        break
                    }
                    delay(pollMs)
                }

                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping backend", e)
                promise.resolve(true) // Resolve anyway to unblock JS side
            }
        }
    }

    @ReactMethod
    fun upscaleImage(imagePath: String, upscalerFilePath: String, promise: Promise) {
        val backendState = BackendService.backendState.value
        if (backendState is BackendService.BackendState.Error || backendState is BackendService.BackendState.Idle) {
            promise.reject("ERR_NO_MODEL", "El backend no está corriendo. Por favor, inicializa un upscaler.")
            return
        }

        scope.launch {
            try {
                Log.i(TAG, "🔍 Iniciando Upscale: imagen=$imagePath, upscaler=$upscalerFilePath")
                
                val uriStr = if (imagePath.startsWith("file://")) imagePath.substring(7) else imagePath
                val bitmapFile = File(uriStr)
                if (!bitmapFile.exists()) {
                    promise.reject("ERR_FILE_NOT_FOUND", "No se encontró la imagen a escalar")
                    return@launch
                }

                val options = android.graphics.BitmapFactory.Options().apply {
                    inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888
                }
                val bitmap = android.graphics.BitmapFactory.decodeFile(bitmapFile.absolutePath, options)
                if (bitmap == null) {
                    promise.reject("ERR_BITMAP_DECODE", "No se pudo decodificar la imagen")
                    return@launch
                }

                val context = reactApplicationContext
                val resultUri = ImageProcessingUtils.performUpscale(
                    bitmap = bitmap,
                    upscalerFilePath = upscalerFilePath,
                    outputDir = context.cacheDir
                )

                val params = Arguments.createMap()
                params.putString("imageUri", resultUri)
                promise.resolve(params)

            } catch (e: Exception) {
                Log.e(TAG, "❌ Error escalando imagen", e)
                promise.reject("ERR_UPSCALE", "Error durante upscaling: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun startTextNotification(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, TextGenerationService::class.java).apply {
                action = TextGenerationService.ACTION_START
            }
            context.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_TEXT_ERR", "Error arrancando notificación de texto", e)
        }
    }

    @ReactMethod
    fun stopTextNotification(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, TextGenerationService::class.java).apply {
                action = TextGenerationService.ACTION_STOP
            }
            context.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_TEXT_ERR", "Error deteniendo notificación de texto", e)
        }
    }

    /**
     * Check if the backend HTTP server is currently responding.
     * Useful for UI to know if it can generate without re-loading.
     */
    @ReactMethod
    fun isBackendReady(promise: Promise) {
        scope.launch(Dispatchers.IO) {
            try {
                val client = OkHttpClient.Builder()
                    .connectTimeout(500, TimeUnit.MILLISECONDS)
                    .readTimeout(500, TimeUnit.MILLISECONDS)
                    .build()
                val request = Request.Builder()
                    .url("http://localhost:$BACKEND_PORT/health")
                    .get()
                    .build()
                val response = client.newCall(request).execute()
                val isReady = response.isSuccessful
                response.close()
                promise.resolve(isReady)
            } catch (_: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun getSoCModel(promise: Promise) {
        try {
            // Priority 1: Use ro.soc.model (returns proper SM number like SM8650)
            val procModel = Runtime.getRuntime().exec("getprop ro.soc.model")
            val socModel = procModel.inputStream.bufferedReader().use { it.readLine() }
            
            if (!socModel.isNullOrBlank() && socModel.trim() != "unknown") {
                promise.resolve(socModel.trim())
                return
            }

            // Priority 2: Use ro.board.platform (might return codenames like pineapple or kalama)
            val procPlatform = Runtime.getRuntime().exec("getprop ro.board.platform")
            val platform = procPlatform.inputStream.bufferedReader().use { it.readLine() }
            
            if (!platform.isNullOrBlank()) {
                promise.resolve(platform.trim())
                return
            }

            // Priority 3: Use Build.HARDWARE or Build.BOARD
            val hardware = Build.HARDWARE
            val board = Build.BOARD
            promise.resolve(hardware ?: board ?: "unknown")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get SoC model", e)
            promise.reject("SOC_ERR", e.message)
        }
    }

    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to send event '$eventName': ${e.message}")
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Requerido por RN NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Requerido por RN NativeEventEmitter
    }
}
