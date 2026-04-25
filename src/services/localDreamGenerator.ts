import { NativeModules, NativeEventEmitter, AppState, AppStateStatus } from 'react-native';
import { ImageGenerationParams, ImageGenerationProgress, GeneratedImage } from '../types';

const { LocalDream } = NativeModules;
const eventEmitter = LocalDream ? new NativeEventEmitter(LocalDream) : null;

class LocalDreamGeneratorService {
  private progressSubscription: any = null;
  private completeSubscription: any = null;
  private errorSubscription: any = null;
  private loadedPath: string | null = null;
  private threads: number = 4;

  // Bug 2 fix: Reference to the active generation's reject function
  // so cancelGeneration() can settle the hanging Promise.
  private activeReject: ((reason: Error) => void) | null = null;

  // Bug 3a fix: Reference to the safety timeout so we can clean it
  // up on cancellation instead of letting it fire 10 min later.
  private activeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Bug 1 fix: Listen for app state transitions to proactively release
    // hardware (GPU/NPU/DSP) when the OS sends the app to background.
    // Mobile OSes aggressively destroy GPU contexts; if we don't release
    // them first, the native backend ends up in a corrupt "zombie" state.
    this.initAppStateListener();
  }

  /**
   * Registers a permanent AppState listener that unloads the image model
   * whenever the app transitions to background/inactive. This prevents
   * the OS from destroying the GPU/NPU context out from under us.
   *
   * We intentionally never remove this listener — the service is a
   * singleton that lives for the entire lifetime of the application.
   */
  private initAppStateListener(): void {
    AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState.match(/inactive|background/) && this.loadedPath !== null) {
        console.log('[LocalDream] 📱 App going to background — force-unloading image model to release GPU/NPU');
        // Fire-and-forget: we don't await because the OS might kill us
        // before the promise resolves, and that's fine — stopBackend
        // is our best-effort cleanup.
        this.unloadModel().catch((e) => {
          console.warn('[LocalDream] ⚠️ Background unload failed (expected if process is dying):', e);
        });
      }
    });
  }

  isAvailable(): boolean {
    return !!LocalDream;
  }

  async isModelLoaded(): Promise<boolean> {
    return this.loadedPath !== null;
  }

  async getLoadedModelPath(): Promise<string | null> {
    return this.loadedPath;
  }

  async loadModel(modelPath: string, threads?: number, opts: any = {}): Promise<boolean> {
    if (!LocalDream) throw new Error('LocalDream NO DISPONIBLE');
    
    const useCpuClip = opts.useCpuClip ?? true; // All xororz catalog variants expect clip.mnn.
    const runOnCpu = opts.cpuOnly ?? opts.runOnCpu ?? false;
    const modelId = "activo"; 
    const textEmbeddingSize = 768;

    console.log(`[LocalDream] 🚀 loadModel: path=${modelPath}, useCpuClip=${useCpuClip}, runOnCpu=${runOnCpu}`);

    // Note: We unload even if this.loadedPath is null, because the app
    // might have restarted after a background exit (where JS state is lost
    // but the native backend service is still running).
    console.log(`[LocalDream] ♻️ Unloading previous model (if any) before loading new one...`);
    await this.unloadModel();

    console.log(`[LocalDream] ⏳ Waiting for backend server to be ready (this may take 30-90s on first load)...`);

    try {
      // initializeModels now waits for the backend HTTP server to be ready
      // via health check polling (up to 90 seconds) before resolving
      await LocalDream.initializeModels(modelPath, useCpuClip, runOnCpu, modelId, textEmbeddingSize);
      console.log(`[LocalDream] ✅ Backend ready! Model loaded successfully.`);
      this.loadedPath = modelPath;
      this.threads = threads ?? 4;
      return true;
    } catch (error: any) {
      console.error(`[LocalDream] ❌ Failed to load model: ${error?.message || error}`);
      this.loadedPath = null;
      throw error;
    }
  }

  getLoadedThreads(): number | null {
    return this.threads;
  }

  async unloadModel(): Promise<boolean> {
    if (LocalDream) {
        await LocalDream.stopBackend();
    }
    this.loadedPath = null;
    return true;
  }

  async generateImage(params: ImageGenerationParams & { previewInterval?: number, useOpenCL?: boolean }, onProgress?: (progress: ImageGenerationProgress) => void, _onPreview?: (preview: { previewPath: string; step: number; totalSteps: number }) => void): Promise<GeneratedImage> {
    if (!LocalDream) throw new Error('Native module LocalDream not found');

    const GENERATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes max

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = () => {
        settled = true;
        this.activeReject = null;
        this.activeTimeoutId = null;
        this.clearListeners();
      };

      // Bug 2 fix: Store reject so cancelGeneration() can settle this Promise.
      this.activeReject = reject;

      // Timeout protection — if no response in 10 minutes, something is very wrong
      // Bug 3a fix: Store timeoutId at class level so cancelGeneration() can clear it.
      this.activeTimeoutId = setTimeout(() => {
        if (!settled) {
          settle();
          // Force-kill the native backend: if 10 minutes passed, the C++
          // engine is stuck/hung on the NPU/GPU. Rejecting the Promise only
          // unblocks the UI — we must also release the hardware zombie.
          console.warn('[LocalDream] ⚠️ TIMEOUT: Forcing model unload to recover hardware state.');
          this.unloadModel().catch(() => {});
          reject(new Error('La generación de imagen excedió el tiempo máximo (10 min). El backend ha fallado.'));
        }
      }, GENERATION_TIMEOUT_MS);

      // Clear old listeners before starting
      this.cancelGeneration().then(() => {
        // Re-store reject after cancelGeneration clears it (since cancel
        // was called to clean up a previous generation, not this one).
        this.activeReject = reject;

        this.progressSubscription = eventEmitter?.addListener('onImageGenerationProgress', (event) => {
          if (onProgress && !settled) {
             const prog = event.progress;
             const steps = params.steps || 20;
             onProgress({
               step: Math.floor(prog * steps),
               totalSteps: steps,
               progress: prog
             });
          }
        });

        this.completeSubscription = eventEmitter?.addListener('onImageGenerationComplete', (event) => {
          if (settled) return;
          if (this.activeTimeoutId) clearTimeout(this.activeTimeoutId);
          settle();
          console.log(`[LocalDream] ✅ Image generation complete: ${event.imageUri}`);
          resolve({
            id: `img_${Date.now()}`,
            imagePath: event.imageUri.replace('file://', ''),
            prompt: params.prompt,
            negativePrompt: params.negativePrompt,
            seed: parseInt(event.seed || '0', 10),
            steps: params.steps || 20,
            width: params.width || 512,
            height: params.height || 512,
            modelId: 'sd',
            createdAt: new Date().toISOString()
          });
        });

        this.errorSubscription = eventEmitter?.addListener('onImageGenerationError', (msg) => {
          if (settled) return;
          if (this.activeTimeoutId) clearTimeout(this.activeTimeoutId);
          settle();
          const errStr = typeof msg === 'string' ? msg : msg?.message || 'Error desconocido en generación';
          console.error(`[LocalDream] ❌ Generation error event: ${errStr}`);
          
          // Auto-healing: If the NPU crashes or times out, the native state is corrupted.
          // By forcefully unloading, the next generation attempt will safely reboot the backend.
          if (errStr.includes("exec failed") || errStr.includes("QNN UNET") || errStr.includes("timeout")) {
              console.warn(`[LocalDream] ⚠️ CRITICAL NPU FAILURE DETECTED: Forcing model unload to recover state.`);
              this.unloadModel().catch(() => {});
          }

          reject(new Error(errStr));
        });

        console.log(`[LocalDream] 🎨 Starting generation: prompt="${(params.prompt || '').substring(0, 50)}...", steps=${params.steps || 20}, ${params.width || 512}x${params.height || 512}`);

        LocalDream.generateImage(
          params.prompt,
          params.negativePrompt || '',
          params.steps || 20,
          params.guidanceScale || 7.0,
          params.width || 512,
          params.height || 512,
          params.seed || -1
        ).catch((e: Error) => {
          if (settled) return;
          if (this.activeTimeoutId) clearTimeout(this.activeTimeoutId);
          settle();
          console.error(`[LocalDream] ❌ generateImage native call rejected: ${e.message}`);
          
          if (e.message.includes("exec failed") || e.message.includes("QNN UNET") || e.message.includes("Socket")) {
             this.unloadModel().catch(() => {});
          }

          reject(e);
        });
      });
    });
  }

  async upscaleImage(imageUri: string, upscalerFilePath: string): Promise<string> {
    if (!LocalDream) throw new Error('LocalDream NO DISPONIBLE');
    
    console.log(`[LocalDream] ✨ upscaleImage requested: img=${imageUri}, upscaler=${upscalerFilePath}`);
    
    try {
      const response = await LocalDream.upscaleImage(imageUri, upscalerFilePath);
      return response.imageUri;
    } catch (error: any) {
      console.error(`[LocalDream] ❌ upscaleImage failed: ${error?.message || error}`);
      throw error;
    }
  }

  private clearListeners() {
      this.progressSubscription?.remove();
      this.completeSubscription?.remove();
      this.errorSubscription?.remove();
  }

  async cancelGeneration(): Promise<boolean> {
    // Bug 3a fix: Clear the safety timeout before it fires on a dead generation
    if (this.activeTimeoutId) {
      clearTimeout(this.activeTimeoutId);
      this.activeTimeoutId = null;
    }

    // Bug 2 fix: Reject the active Promise BEFORE clearing listeners.
    // This ensures the caller's .catch() or try/catch fires, which unblocks
    // the UI from the "generating" state. Without this, the Promise hangs
    // forever because clearListeners() removes the only channels that could
    // have resolved/rejected it.
    if (this.activeReject) {
      const rejectFn = this.activeReject;
      this.activeReject = null;
      rejectFn(new Error('Generation cancelled by user'));
    }

    if (LocalDream) {
      await LocalDream.stopGeneration();
    }
    this.clearListeners();
    return true;
  }

  async getServerPort(): Promise<number> {
    return 8090;
  }

  async isNpuSupported(): Promise<boolean> {
    return true;
  }

  async getSoCModel(): Promise<string> {
    return "snapdragon";
  }

  async getGeneratedImages(): Promise<GeneratedImage[]> {
    return [];
  }

  async deleteGeneratedImage(_imageId: string): Promise<boolean> {
    return true;
  }
  
  async clearOpenCLCache(_modelPath: string): Promise<number> {
    return 0;
  }
  
  async hasKernelCache(_modelPath: string): Promise<boolean> {
    return true;
  }

  async restartBackend(): Promise<boolean> {
    try {
      console.log('[LocalDream] Manual backend restart requested');
      return await NativeModules.LocalDream.restartBackend();
    } catch (e) {
      console.error('[LocalDream] Failed to restart backend:', e);
      return false;
    }
  }
}

export const localDreamGeneratorService = new LocalDreamGeneratorService();
export default localDreamGeneratorService;
