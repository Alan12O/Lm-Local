package ai.lmlocal.localdream

import android.app.*
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit


class BackendService : Service() {
    private var process: Process? = null
    private lateinit var runtimeDir: File

    companion object {
        private const val TAG = "BackendService"
        private const val EXECUTABLE_NAME = "libstable_diffusion_core.so"
        private const val RUNTIME_DIR = "runtime_libs"
        private const val NOTIFICATION_ID = 2
        private const val CHANNEL_ID = "backend_service_channel"

        const val ACTION_STOP = "ai.lmlocal.localdream.STOP_GENERATION"
        const val ACTION_RESTART = "ai.lmlocal.localdream.RESTART_BACKEND"

        private object StateHolder {
            val _backendState = MutableStateFlow<BackendState>(BackendState.Idle)
        }

        val backendState: StateFlow<BackendState> = StateHolder._backendState

        private fun updateState(state: BackendState) {
            StateHolder._backendState.value = state
        }
    }

    sealed class BackendState {
        object Idle : BackendState()
        object Starting : BackendState()
        object Running : BackendState()
        data class Error(val message: String) : BackendState()
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        prepareRuntimeDir()
    }

    override fun onBind(intent: Intent): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "service started command: ${intent?.action}")
        startForeground(
            NOTIFICATION_ID,
            createNotification("Servidor LocalDream Iniciando...")
        )

        when (intent?.action) {
            ACTION_STOP -> {
                Log.d("GenerationService", "stop")
                stopSelf()
                return START_NOT_STICKY
            }

            ACTION_RESTART -> {
                Log.i(TAG, "restarting backend service")
                stopBackend()
                // Give the system a small window to release NPU handles and port 8090
                try { Thread.sleep(1000) } catch (_: Exception) {}
            }
        }

        val modelsDirPath = intent?.getStringExtra("modelsDir")
        val useCpuClip = intent?.getBooleanExtra("useCpuClip", false) ?: false
        val runOnCpu = intent?.getBooleanExtra("runOnCpu", false) ?: false
        val modelId = intent?.getStringExtra("modelId")
        val width = intent?.getIntExtra("width", 512) ?: 512
        val height = intent?.getIntExtra("height", 512) ?: 512
        val textEmbeddingSize = intent?.getIntExtra("textEmbeddingSize", 768) ?: 768

        if (modelsDirPath != null && modelId != null) {
            var mDir = File(modelsDirPath)
            mDir = findTrueModelDir(mDir)
            if (startBackend(mDir, width, height, useCpuClip, runOnCpu, modelId, textEmbeddingSize)) {
                updateState(BackendState.Running)
            } else {
                updateState(BackendState.Error("Backend start failed"))
            }
        } else {
            updateState(BackendState.Error("Model/Dir not provided"))
            stopSelf()
        }

        return START_NOT_STICKY
    }

    override fun onTimeout(startId: Int) {
        super.onTimeout(startId)
        Log.e(TAG, "Foreground service timeout")
        updateState(BackendState.Error("Service timeout"))
        stopBackend()
        stopSelf()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.i(TAG, "App swipe-killed (onTaskRemoved). Forcing backend and orphans to stop.")
        
        // 1. Properly cleanly terminate the known process if any
        stopBackend()
        
        // 2. Kill any escaped zombies gracefully then forcefully
        try {
            val kill15 = Runtime.getRuntime().exec(arrayOf("sh", "-c", "killall -15 $EXECUTABLE_NAME"))
            kill15.waitFor(2, TimeUnit.SECONDS)
            Runtime.getRuntime().exec(arrayOf("sh", "-c", "killall -9 $EXECUTABLE_NAME"))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to killall in onTaskRemoved", e)
        }
        
        stopSelf()
    }

    private fun createNotificationChannel() {
        val name = "Backend Service"
        val descriptionText = "Backend service for image generation"
        val importance = NotificationManager.IMPORTANCE_LOW
        val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
            description = descriptionText
        }
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
    }

    private fun createNotification(contentText: String): Notification {
        val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Motor Generador Local")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_popup_sync)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun prepareRuntimeDir() {
        try {
            runtimeDir = File(filesDir, RUNTIME_DIR).apply {
                if (!exists()) {
                    mkdirs()
                }
            }

            try {
                val qnnlibsAssets = assets.list("qnnlibs")
                qnnlibsAssets?.forEach { fileName ->
                    val targetLib = File(runtimeDir, fileName)

                    val needsCopy = !targetLib.exists() || run {
                        val assetInputStream = assets.open("qnnlibs/$fileName")
                        val assetSize = assetInputStream.use { it.available().toLong() }
                        targetLib.length() != assetSize
                    }

                    if (needsCopy) {
                        val assetInputStream = assets.open("qnnlibs/$fileName")
                        assetInputStream.use { input ->
                            targetLib.outputStream().use { output ->
                                input.copyTo(output)
                            }
                        }
                        Log.d(TAG, "Copied $fileName from assets to runtime directory")
                    }

                    targetLib.setReadable(true, true)
                    targetLib.setExecutable(true, true)
                }
                Log.i(TAG, "QNN libraries prepared in runtime directory")
            } catch (e: IOException) {
                Log.e(TAG, "Failed to prepare QNN libraries from assets", e)
                throw RuntimeException("Failed to prepare QNN libraries from assets", e)
            }

            runtimeDir.setReadable(true, true)
            runtimeDir.setExecutable(true, true)

            Log.i(TAG, "Runtime directory prepared: ${runtimeDir.absolutePath}")
            Log.i(TAG, "Runtime files: ${runtimeDir.list()?.joinToString()}")

        } catch (e: Exception) {
            Log.e(TAG, "Prepare runtime dir failed", e)
            updateState(BackendState.Error("Prepare runtime dir failed: ${e.message}"))
            throw RuntimeException("Failed to prepare runtime directory", e)
        }
    }

    private fun findTrueModelDir(dir: File, depth: Int = 0): File {
        if (!dir.exists() || !dir.isDirectory || depth > 3) return dir
        if (File(dir, "tokenizer.json").exists()) return dir
        
        // Priorizar output_512 y carpetas qnn
        val outputDir = File(dir, "output_512")
        if (outputDir.exists() && outputDir.isDirectory) {
            if (File(outputDir, "tokenizer.json").exists()) return outputDir
            outputDir.listFiles()?.filter { it.isDirectory }?.forEach { subDir ->
                if (File(subDir, "tokenizer.json").exists()) return subDir
            }
        }
        
        dir.listFiles()?.filter { it.isDirectory }?.forEach { subDir ->
            val result = findTrueModelDir(subDir, depth + 1)
            if (File(result, "tokenizer.json").exists()) return result
        }
        return dir
    }

    private fun startBackend(modelsDir: File, width: Int, height: Int, useCpuClip: Boolean, runOnCpu: Boolean, modelId: String, textEmbeddingSize: Int): Boolean {
        Log.i(TAG, "backend start, model: ${modelId}, resolution: ${width}x${height}")

        // CRITICAL: Always kill any existing backend process before starting a new one.
        // Without this, a crashed/corrupted process stays alive on port 8090 and the
        // health check passes immediately, causing all subsequent UNET executions to
        // fail with "Dma execution aborted on Skel" (err 6031).
        if (process != null) {
            Log.i(TAG, "Killing existing backend process before starting new one...")
            stopBackend()
        }

        // CRITICAL: Kill any orphaned processes from previous app crashes/swipes.
        // This includes zombies from BOTH debug (ai.lmlocal.dev) and
        // release (ai.lmlocal) package variants sharing the same binary name.
        var needsDspCooldown = false
        try {
            Log.i(TAG, "Executing killall to purge orphaned binaries before starting...")

            val kill15 = Runtime.getRuntime().exec(arrayOf("sh", "-c", "killall -15 $EXECUTABLE_NAME"))
            if (kill15.waitFor(2, TimeUnit.SECONDS) && kill15.exitValue() == 0) {
                Log.i(TAG, "SIGTERM killed an orphaned process")
                needsDspCooldown = true
            }

            val kill9 = Runtime.getRuntime().exec(arrayOf("sh", "-c", "killall -9 $EXECUTABLE_NAME"))
            if (kill9.waitFor(2, TimeUnit.SECONDS) && kill9.exitValue() == 0) {
                Log.i(TAG, "SIGKILL killed an orphaned process")
                needsDspCooldown = true
            }
        } catch (e: Exception) {
            Log.w(TAG, "killall failed or not available: ${e.message}")
        }

        // Check if port 8090 is still occupied (e.g. by a zombie from another
        // package variant that killall couldn't reach, or a process the OS is
        // still tearing down). If so, wait and retry killing.
        try {
            val portCheck = java.net.Socket()
            try {
                portCheck.connect(java.net.InetSocketAddress("127.0.0.1", 8090), 300)
                portCheck.close()
                Log.w(TAG, "Port 8090 is STILL occupied after killall! Waiting and retrying...")
                needsDspCooldown = true
                Thread.sleep(2000)
                // One more aggressive kill attempt
                Runtime.getRuntime().exec(arrayOf("sh", "-c", "killall -9 $EXECUTABLE_NAME"))
                    .waitFor(2, TimeUnit.SECONDS)
            } catch (_: Exception) {
                // Connection refused = port not in use = good
            }
        } catch (_: Exception) { }

        // CRITICAL: ALWAYS wait for the Qualcomm Hexagon DSP to fully release
        // FastRPC skel handles and DMA mappings from ANY previous session.
        // When Android kills the app (swipe from recents), the native process
        // dies but the DSP kernel driver retains handles that take 2-5 seconds
        // to release. Without this wait, the new process will inherit stale
        // contexts and the first QnnGraph_execute will fail with err 6031
        // ("Dma execution aborted on Skel") or "QNN UNET exec failed".
        //
        // The old code only waited when killall found a zombie, but if the OS
        // already killed the process, killall finds nothing and never waits --
        // yet the DSP is still dirty. Now we ALWAYS wait.
        val cooldownMs = if (needsDspCooldown) 5000L else 2000L
        Log.i(TAG, "Waiting ${cooldownMs}ms for DSP/FastRPC handle cleanup (zombie found: $needsDspCooldown)...")
        Thread.sleep(cooldownMs)

        updateState(BackendState.Starting)

        try {
            val nativeDir = applicationInfo.nativeLibraryDir

            val executableFile = File(nativeDir, EXECUTABLE_NAME)

            if (!executableFile.exists()) {
                Log.e(TAG, "error: executable does not exist: ${executableFile.absolutePath}")
                return false
            }

            val preferences = this.getSharedPreferences("app_prefs", MODE_PRIVATE)
            val useImg2img = preferences.getBoolean("use_img2img", true)

            var clipfilename = "clip.bin"
            if (useCpuClip) {
                clipfilename = "clip.mnn"
            }
            var command = listOf(
                executableFile.absolutePath,
                "--clip", File(modelsDir, clipfilename).absolutePath,
                "--unet", File(modelsDir, "unet.bin").absolutePath,
                "--vae_decoder", File(modelsDir, "vae_decoder.bin").absolutePath,
                "--tokenizer", File(modelsDir, "tokenizer.json").absolutePath,
                "--backend", File(runtimeDir, "libQnnHtp.so").absolutePath,
                "--system_library", File(runtimeDir, "libQnnSystem.so").absolutePath,
                "--port", "8090",
                "--text_embedding_size", textEmbeddingSize.toString()
            )
            if (width != 512 || height != 512) {
                val patchFile = if (width == height) {
                    val squarePatch = File(modelsDir, "${width}.patch")
                    if (squarePatch.exists()) {
                        squarePatch
                    } else {
                        File(modelsDir, "${width}x${height}.patch")
                    }
                } else {
                    File(modelsDir, "${width}x${height}.patch")
                }

                if (patchFile.exists()) {
                    command = command + listOf(
                        "--patch", patchFile.absolutePath,
                    )
                    Log.i(TAG, "Using patch file: ${patchFile.name}")
                } else {
                    Log.w(
                        TAG,
                        "Patch file not found: ${patchFile.absolutePath}, falling back to 512×512"
                    )
                }
            }
            if (useImg2img) {
                command = command + listOf(
                    "--vae_encoder", File(modelsDir, "vae_encoder.bin").absolutePath,
                )
            }
            if (modelId.startsWith("pony")) {
                command += "--ponyv55"
            }
            if (useCpuClip) {
                command += "--use_cpu_clip"
            }
            if (runOnCpu) {
                command = listOf(
                    executableFile.absolutePath,
                    "--clip", File(modelsDir, "clip.mnn").absolutePath,
                    "--unet", File(modelsDir, "unet.mnn").absolutePath,
                    "--vae_decoder", File(modelsDir, "vae_decoder.mnn").absolutePath,
                    "--tokenizer", File(modelsDir, "tokenizer.json").absolutePath,
                    "--port", "8090",
                    "--text_embedding_size", if (modelId != "sd21") "768" else "1024",
                    "--cpu"
                )
                if (useImg2img) {
                    command = command + listOf(
                        "--vae_encoder", File(modelsDir, "vae_encoder.mnn").absolutePath,
                    )
                }
            }
            val env = mutableMapOf<String, String>()

            val systemLibPaths = mutableListOf(
                nativeDir,                   // libc++_shared.so y otras libs del APK
                runtimeDir.absolutePath,     // QNN libs copiadas de assets
                "/system/lib64",
                "/vendor/lib64",
                "/vendor/lib64/egl",
            )
            try {
                val maliSymlink = File("/system/vendor/lib64/egl/libGLES_mali.so")
                if (maliSymlink.exists()) {
                    val realPath = maliSymlink.canonicalPath
                    val soc = realPath.split("/").getOrNull(realPath.split("/").size - 2)

                    if (soc != null) {
                        val socPaths = listOf(
                            "/vendor/lib64/$soc",
                            "/vendor/lib64/egl/$soc"
                        )

                        socPaths.forEach { path ->
                            if (!systemLibPaths.contains(path)) {
                                systemLibPaths.add(path)
                                Log.d("LibPath", "Added SoC path: $path")
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w("LibPath", "Failed to resolve Mali paths: ${e.message}")
            }
            val systemLibPathsStr = systemLibPaths.joinToString(":")
            env["LD_LIBRARY_PATH"] = systemLibPathsStr
            env["DSP_LIBRARY_PATH"] = runtimeDir.absolutePath
            env["ADSP_LIBRARY_PATH"] = runtimeDir.absolutePath

            Log.d(TAG, "COMMAND: ${command.joinToString(" ")}")
            Log.d(TAG, "DIR: ${runtimeDir}")
            Log.d(TAG, "LD_LIBRARY_PATH=${env["LD_LIBRARY_PATH"]}")
            Log.d(TAG, "DSP_LIBRARY_PATH=${env["DSP_LIBRARY_PATH"]}")

            val processBuilder = ProcessBuilder(command).apply {
                directory(File(nativeDir))
                redirectErrorStream(true)
                environment().putAll(env)
            }

            process = processBuilder.start()

            startMonitorThread()

            return true

        } catch (e: Exception) {
            Log.e(TAG, "backend start failed", e)
            updateState(BackendState.Error("backend start failed: ${e.message}"))
            e.printStackTrace()
            return false
        }
    }

    private fun startMonitorThread() {
        Thread {
            try {
                process?.let { proc ->
                    proc.inputStream.bufferedReader().use { reader ->
                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            Log.i(TAG, "Backend: $line")
                        }
                    }

                    val exitCode = proc.waitFor()
                    Log.i(TAG, "Backend process exited with code: $exitCode")
                    updateState(BackendState.Error("Backend process exited with code: $exitCode"))
                }
            } catch (e: java.io.InterruptedIOException) {
                // Expected when stopBackend() kills the process while we're reading stdout.
                Log.d(TAG, "Monitor thread interrupted by process shutdown (normal)")
            } catch (e: Exception) {
                Log.e(TAG, "monitor error", e)
                updateState(BackendState.Error("monitor error: ${e.message}"))
            }
        }.apply {
            isDaemon = true
            start()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForeground(true)
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(NOTIFICATION_ID)
        stopBackend()
    }

    fun stopBackend() {
        Log.i(TAG, "Stopping backend process...")
        process?.let { proc ->
            try {
                // Signal SIGTERM first (handled in our C++ code)
                proc.destroy()

                // Wait for clean exit — give up to 5 seconds
                val exitedCount = 50 // 5 seconds in 100ms steps
                var finished = false
                for (i in 0 until exitedCount) {
                    if (!proc.isAlive) {
                        finished = true
                        break
                    }
                    Thread.sleep(100)
                }

                if (!finished) {
                    Log.w(TAG, "Backend didn't stop in time, forcing...")
                    proc.destroyForcibly()
                    proc.waitFor(2, TimeUnit.SECONDS)
                } else {
                    // Even after clean exit, force-destroy to ensure all OS-level
                    // file descriptors (especially FastRPC /dev/adsprpc-smd handles)
                    // are released immediately rather than lingering.
                    proc.destroyForcibly()
                }

                Log.i(TAG, "Process ended. isAlive=${proc.isAlive}")

                // CRITICAL: Wait for the Qualcomm Hexagon DSP to fully release
                // FastRPC skel handles and DMA mappings. Without this delay the
                // next process that opens the DSP will inherit stale contexts and
                // immediately fail with "Dma execution aborted on Skel" (err 6031).
                Log.i(TAG, "Waiting 3s for DSP/FastRPC handle cleanup...")
                Thread.sleep(3000)

                updateState(BackendState.Idle)
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping backend: ${e.message}")
                updateState(BackendState.Error("Error stopping: ${e.message}"))
            } finally {
                process = null
            }
        }
    }
}