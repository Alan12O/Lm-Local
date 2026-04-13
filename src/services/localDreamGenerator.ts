import { NativeModules, NativeEventEmitter } from 'react-native';
import { ImageGenerationParams, ImageGenerationProgress, GeneratedImage } from '../types';

const { LocalDream } = NativeModules;
const eventEmitter = LocalDream ? new NativeEventEmitter(LocalDream) : null;

class LocalDreamGeneratorService {
  private progressSubscription: any = null;
  private completeSubscription: any = null;
  private errorSubscription: any = null;
  private loadedPath: string | null = null;
  private threads: number = 4;

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
    
    // Asumimos un modelo SD genérico para arrancar el backend
    // onImageGenerationService y la UI asume modelo activo.
    // pasamos la ruta del directorio del modelo al script nativo:
    const useCpuClip = opts.useCpuClip ?? false;
    const runOnCpu = opts.cpuOnly ?? opts.runOnCpu ?? false;
    const modelId = "activo"; 
    const textEmbeddingSize = 768; // o dinámico

    await LocalDream.initializeModels(modelPath, useCpuClip, runOnCpu, modelId, textEmbeddingSize);
    this.loadedPath = modelPath;
    this.threads = threads ?? 4;
    return true;
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

  async generateImage(params: ImageGenerationParams & { previewInterval?: number, useOpenCL?: boolean }, onProgress?: (progress: ImageGenerationProgress) => void, onPreview?: (preview: { previewPath: string; step: number; totalSteps: number }) => void): Promise<GeneratedImage> {
    if (!LocalDream) throw new Error('Native module LocalDream not found');

    return new Promise((resolve, reject) => {
      // Limpiar listeners viejos si existen
      this.cancelGeneration().then(() => {
        this.progressSubscription = eventEmitter?.addListener('onImageGenerationProgress', (event) => {
          if (onProgress) {
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
          this.clearListeners();
          resolve({
            id: `img_${Date.now()}`,
            imagePath: event.imageUri.replace('file://', ''),
            prompt: params.prompt,
            negativePrompt: params.negativePrompt,
            seed: parseInt(event.seed || '0'),
            steps: params.steps || 20,
            width: params.width || 512,
            height: params.height || 512,
            modelId: 'sd',
            createdAt: new Date().toISOString()
          });
        });

        this.errorSubscription = eventEmitter?.addListener('onImageGenerationError', (msg) => {
          this.clearListeners();
          reject(new Error(msg));
        });

        LocalDream.generateImage(
          params.prompt,
          params.negativePrompt || '',
          params.steps || 20,
          params.guidanceScale || 7.0,
          params.width || 512,
          params.height || 512,
          params.seed || -1
        ).catch((e: Error) => {
          this.clearListeners();
          reject(e);
        });
      });
    });
  }

  private clearListeners() {
      this.progressSubscription?.remove();
      this.completeSubscription?.remove();
      this.errorSubscription?.remove();
  }

  async cancelGeneration(): Promise<boolean> {
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

  async deleteGeneratedImage(imageId: string): Promise<boolean> {
    return true;
  }
  
  async clearOpenCLCache(modelPath: string): Promise<number> {
    return 0;
  }
  
  async hasKernelCache(modelPath: string): Promise<boolean> {
    return true;
  }
}

export const localDreamGeneratorService = new LocalDreamGeneratorService();
export default localDreamGeneratorService;
