package ai.offgridmobile.localdream

import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

class LocalDreamModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private var isSubscribed = false

    override fun getName(): String {
        return "LocalDream"
    }

    @ReactMethod
    fun initializeModels(modelsDir: String, useCpuClip: Boolean, runOnCpu: Boolean, modelId: String, textEmbeddingSize: Int, promise: Promise) {
        try {
            val context = reactApplicationContext

            // Start backend service
            val intent = Intent(context, BackendService::class.java).apply {
                putExtra("modelsDir", modelsDir)
                putExtra("useCpuClip", useCpuClip)
                putExtra("runOnCpu", runOnCpu)
                putExtra("modelId", modelId)
                putExtra("textEmbeddingSize", textEmbeddingSize)
            }
            context.startService(intent)

            // Subscribe to state changes if not already
            if (!isSubscribed) {
                isSubscribed = true
                scope.launch {
                    BackendService.backendState.collectLatest { state ->
                        Log.d("LocalDreamModule", "Backend state: $state")
                        when (state) {
                            is BackendService.BackendState.Running -> {
                                // Can notify JS that it started ok!
                            }
                            is BackendService.BackendState.Error -> {
                                sendEvent("onImageGenerationError", state.message)
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
                                val file = File(context.cacheDir, "generated_${UUID.randomUUID()}.jpg")
                                val out = FileOutputStream(file)
                                state.bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 95, out)
                                out.flush()
                                out.close()
                                
                                params.putString("imageUri", "file://" + file.absolutePath)
                                state.seed?.let { params.putString("seed", it.toString()) }
                                sendEvent("onImageGenerationComplete", params)
                                BackgroundGenerationService.markBitmapConsumed()
                                BackgroundGenerationService.clearCompleteState()
                            }
                            is BackgroundGenerationService.GenerationState.Error -> {
                                sendEvent("onImageGenerationError", state.message)
                                BackgroundGenerationService.resetState()
                            }
                            else -> {}
                        }
                    }
                }
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", "Error inicializando backend", e)
        }
    }

    @ReactMethod
    fun generateImage(prompt: String, negativePrompt: String, steps: Int, cfg: Float, width: Int, height: Int, seed: Double, promise: Promise) {
        val context = reactApplicationContext

        if (BackgroundGenerationService.isServiceRunning.value) {
            promise.reject("ALREADY_GENERATING", "Actualmente generando")
            return
        }

        try {
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
            context.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
           promise.reject("START_ERR", "Error arrancando generación", e)
        }
    }

    @ReactMethod
    fun stopGeneration(promise: Promise) {
        val context = reactApplicationContext
        val bgIntent = Intent(context, BackgroundGenerationService::class.java).apply {
            action = BackgroundGenerationService.ACTION_STOP
        }
        context.startService(bgIntent)
        promise.resolve(true)
    }

    @ReactMethod
    fun stopBackend(promise: Promise) {
        val context = reactApplicationContext
        val intent = Intent(context, BackendService::class.java).apply {
            action = BackendService.ACTION_STOP
        }
        context.startService(intent)
        promise.resolve(true)
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

    private fun sendEvent(eventName: String, params: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
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
