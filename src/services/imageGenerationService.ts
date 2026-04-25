/** ImageGenerationService - Handles image generation independently of UI lifecycle */
import { localDreamGeneratorService as onnxImageGeneratorService } from './localDreamGenerator';
import { activeModelService } from './activeModelService';
import { llmService } from './llm';
import { useAppStore, useChatStore } from '../stores';
import { GeneratedImage } from '../types';
import logger from '../utils/logger';
import { buildEnhancementMessages, getConversationContext, cleanEnhancedPrompt, buildImageGenMeta } from './imageGenerationHelpers';

export interface ImageGenerationState {
  isGenerating: boolean;
  progress: { step: number; totalSteps: number } | null;
  status: string | null;
  previewPath: string | null;
  prompt: string | null;
  conversationId: string | null;
  error: string | null;
  result: GeneratedImage | null;
}

type ImageGenerationListener = (state: ImageGenerationState) => void;

interface GenerateImageParams {
  prompt: string;
  conversationId?: string;
  negativePrompt?: string;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  previewInterval?: number;
  skipEnhancement?: boolean;
}

interface ActiveImageModel {
  id: string;
  name: string;
  modelPath: string;
  backend?: string;
}

interface RunGenerationOptions {
  params: GenerateImageParams;
  enhancedPrompt: string;
  activeImageModel: ActiveImageModel;
  steps: number;
  guidanceScale: number;
  imageWidth: number;
  imageHeight: number;
  useOpenCL: boolean;
  isFallbackRetry?: boolean;
}

interface UpdateEnhancementOptions {
  conversationId: string | undefined;
  tempMessageId: string | null;
  enhancedPrompt: string;
  originalPrompt: string;
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

class ImageGenerationService {
  private state: ImageGenerationState = {
    isGenerating: false, progress: null, status: null, previewPath: null,
    prompt: null, conversationId: null, error: null, result: null,
  };

  private readonly listeners: Set<ImageGenerationListener> = new Set();
  private cancelRequested: boolean = false;

  getState(): ImageGenerationState { return { ...this.state }; }

  isGeneratingFor(conversationId: string): boolean {
    return this.state.isGenerating && this.state.conversationId === conversationId;
  }

  subscribe(listener: ImageGenerationListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  private updateState(partial: Partial<ImageGenerationState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
    const appStore = useAppStore.getState();
    if ('isGenerating' in partial) appStore.setIsGeneratingImage(this.state.isGenerating);
    if ('progress' in partial) appStore.setImageGenerationProgress(this.state.progress);
    if ('status' in partial) appStore.setImageGenerationStatus(this.state.status);
    if ('previewPath' in partial) appStore.setImagePreviewPath(this.state.previewPath);
  }


  private async _resetLlmAfterEnhancement(): Promise<void> {
    logger.log('[ImageGen] 🔄 Starting cleanup - generating:', llmService.isCurrentlyGenerating());
    try {
      await llmService.stopGeneration();
      logger.log('[ImageGen] ✓ stopGeneration() called');
      // CRITICAL FIX: Unload the LLM from memory to free up the GPU/NPU and RAM.
      // Since "Optimizing Gemma" enabled GPU by default for text, leaving it loaded 
      // crashes the Qualcomm DSP when LocalDream tries to load the Image Model.
      await llmService.unloadModel();
      logger.log('[ImageGen] ✓ unloadModel() called - memory freed for Image Generation');
      logger.log('[ImageGen] ✅ LLM service reset complete - generating:', llmService.isCurrentlyGenerating());
    } catch (resetError) {
      logger.error('[ImageGen] ❌ Failed to reset/unload LLM service:', resetError);
    }
  }

  private async _updateEnhancementMessage(opts: UpdateEnhancementOptions): Promise<void> {
    const { conversationId, tempMessageId, enhancedPrompt, originalPrompt } = opts;
    if (!conversationId || !tempMessageId) return;
    const chatStore = useChatStore.getState();
    if (enhancedPrompt && enhancedPrompt !== originalPrompt) {
      chatStore.updateMessageContent(conversationId, tempMessageId, `<think>__LABEL:Prompt mejorado__\n${enhancedPrompt}</think>`);
      chatStore.updateMessageThinking(conversationId, tempMessageId, false);
    } else {
      logger.warn('[ImageGen] Enhancement produced no change, deleting thinking message');
      chatStore.deleteMessage(conversationId, tempMessageId);
    }
  }

  private async _enhancePrompt(params: GenerateImageParams, steps: number): Promise<string> {
    const { settings } = useAppStore.getState();
    if (!settings.enhanceImagePrompts) {
      logger.log('[ImageGen] Enhancement disabled, using original prompt');
      return params.prompt;
    }
    const isTextModelLoaded = llmService.isModelLoaded();
    const isLlmGenerating = llmService.isCurrentlyGenerating();
    logger.log('[ImageGen] 🎨 Starting prompt enhancement - Model loaded:', isTextModelLoaded, 'LLM generating:', isLlmGenerating);
    if (!isTextModelLoaded) {
      logger.warn('[ImageGen] No text model loaded, skipping enhancement');
      return params.prompt;
    }
    this.updateState({
      isGenerating: true, prompt: params.prompt, conversationId: params.conversationId || null,
      status: 'Mejorando prompt con IA...', previewPath: null,
      progress: { step: 0, totalSteps: steps }, error: null, result: null,
    });
    const contextMessages = params.conversationId ? getConversationContext(params.conversationId) : [];
    let tempMessageId: string | null = null;
    if (params.conversationId) {
      const tempMessage = useChatStore.getState().addMessage(params.conversationId, {
        role: 'assistant', content: 'Mejorando tu prompt...', isThinking: true,
      });
      tempMessageId = tempMessage.id;
    }
    try {
      logger.log('[ImageGen] 📤 Calling llmService.generateResponse for enhancement...');
      let raw = await llmService.generateResponse(buildEnhancementMessages(params.prompt, contextMessages), (_data) => { });
      logger.log('[ImageGen] 📥 llmService.generateResponse returned');
      logger.log('[ImageGen] LLM state after enhancement - generating:', llmService.isCurrentlyGenerating());
      raw = cleanEnhancedPrompt(raw);
      logger.log('[ImageGen] ✅ Original prompt:', params.prompt);
      logger.log('[ImageGen] ✅ Enhanced prompt:', raw);
      await this._resetLlmAfterEnhancement();
      const enhancedPrompt = raw || params.prompt;
      await this._updateEnhancementMessage({ conversationId: params.conversationId, tempMessageId, enhancedPrompt, originalPrompt: params.prompt });
      return enhancedPrompt;
    } catch (error: any) {
      logger.error('[ImageGen] ❌ Prompt enhancement failed:', error);
      logger.error('[ImageGen] Error details:', error?.message || 'Unknown error');
      await this._resetLlmAfterEnhancement();
      if (params.conversationId && tempMessageId) {
        useChatStore.getState().deleteMessage(params.conversationId, tempMessageId);
      }
      return params.prompt;
    }
  }

  private async _ensureImageModelLoaded(activeImageModelId: string | null, activeImageModel: ActiveImageModel, desiredThreads: number): Promise<boolean> {
    const isImageModelLoaded = await onnxImageGeneratorService.isModelLoaded();
    const loadedPath = await onnxImageGeneratorService.getLoadedModelPath();
    const loadedThreads = onnxImageGeneratorService.getLoadedThreads();
    const needsThreadReload = loadedThreads == null || loadedThreads !== desiredThreads;
    if (isImageModelLoaded && loadedPath === activeImageModel.modelPath && !needsThreadReload) return true;
    if (!activeImageModelId) {
      this.updateState({ error: 'No hay modelo de imagen seleccionado', isGenerating: false });
      return false;
    }
    try {
      this.updateState({ status: `Cargando ${activeImageModel.name}...` });
      await activeModelService.loadImageModel(activeImageModelId);
      return true;
    } catch (error: any) {
      this.updateState({ isGenerating: false, progress: null, status: null, error: `Error al cargar el modelo de imagen: ${error?.message || 'Error desconocido'}` });
      return false;
    }
  }

  private _saveResult(result: any, opts: { params: GenerateImageParams; activeImageModel: any; meta: { steps: number; guidanceScale: number; useOpenCL: boolean; startTime: number } }): GeneratedImage {
    const { params, activeImageModel, meta } = opts;
    result.modelId = activeImageModel.id;
    if (params.conversationId) result.conversationId = params.conversationId;
    useAppStore.getState().addGeneratedImage(result);
    useAppStore.getState().completeChecklistStep('triedImageGen');
    if (params.conversationId) {
      const genTime = Date.now() - meta.startTime;
      useChatStore.getState().addMessage(params.conversationId, {
        role: 'assistant',
        content: `Imagen generada para: "${params.prompt}"`,
        attachments: [{ id: result.id, type: 'image', uri: `file://${result.imagePath}`, width: result.width, height: result.height }],
        generationTimeMs: genTime,
        generationMeta: buildImageGenMeta(activeImageModel, { steps: meta.steps, guidanceScale: meta.guidanceScale, result, useOpenCL: meta.useOpenCL }),
      });
    }
    this.updateState({ isGenerating: false, progress: null, status: null, previewPath: null, result, error: null });
    return result;
  }

  public clearResult(): void {
    this.updateState({ result: null, previewPath: null, error: null, progress: null, status: null });
  }

  /**
   * Safely load a previously generated image from history into the
   * current display state. This is the public API that screens should
   * use instead of casting to `any` and calling updateState directly.
   *
   * Guards against overwriting state during an active generation.
   */
  public loadResultFromHistory(image: GeneratedImage): void {
    if (this.state.isGenerating) {
      logger.warn('[ImageGen] Cannot load from history while generating');
      return;
    }
    this.updateState({ result: image, previewPath: null, error: null });
  }

  private async _runGenerationAndSave(opts: RunGenerationOptions): Promise<GeneratedImage | null> {
    const { params, enhancedPrompt, activeImageModel, steps, guidanceScale, imageWidth, imageHeight, useOpenCL } = opts;

    // Check if this is the first GPU run (no OpenCL kernel cache yet)
    let isFirstGpuRun = false;
    if (useOpenCL) {
      try {
        const hasCache = await onnxImageGeneratorService.hasKernelCache(activeImageModel.modelPath);
        isFirstGpuRun = !hasCache;
      } catch (e) {
        // If check fails, assume cache exists to avoid false positives
        logger.warn('[ImageGen] Failed to check for OpenCL kernel cache:', e);
      }
    }

    this.updateState({
      status: isFirstGpuRun
        ? 'Optimizando GPU para tu dispositivo (~120s, solo una vez)...'
        : 'Iniciando generación de imagen...',
    });
    const startTime = Date.now();
    try {
      const result = await onnxImageGeneratorService.generateImage(
        { prompt: enhancedPrompt, negativePrompt: params.negativePrompt || '', steps, guidanceScale, seed: params.seed, width: imageWidth, height: imageHeight, previewInterval: params.previewInterval ?? 2, useOpenCL },
        (progress) => {
          if (this.cancelRequested) return;
          const displayStep = Math.min(progress.step, steps);
          if (isFirstGpuRun) {
            this.updateState({
              progress: { step: displayStep, totalSteps: steps },
              status: displayStep <= 1
                ? 'Optimizando GPU para tu dispositivo (~120s, solo una vez)...'
                : `Optimización de GPU en curso... (${displayStep}/${steps})`,
            });
          } else {
            this.updateState({ progress: { step: displayStep, totalSteps: steps }, status: `Generando imagen (${displayStep}/${steps})...` });
          }
        },
        (preview) => {
          if (this.cancelRequested) return;
          const displayStep = Math.min(preview.step, steps);
          this.updateState({ previewPath: `file://${preview.previewPath}?t=${Date.now()}`, status: `Refinando imagen (${displayStep}/${steps})...` });
        },
      );
      if (this.cancelRequested || !result?.imagePath) { this.resetState(); return null; }
      return this._saveResult(result, { params, activeImageModel, meta: { steps, guidanceScale, useOpenCL, startTime } });
    } catch (error: any) {
      const errorMsg = error?.message || 'Image generation failed';
      if (errorMsg.includes('cancelled')) {
        this.resetState();
      } else {
        logger.error('[ImageGenerationService] Generation error:', error);

        // If the pipeline crashed or the model was unloaded, surface a
        // user-friendly message and allow retry (model will auto-reload).
        const isPipelineCrash = errorMsg.includes('Pipeline failed') ||
          errorMsg.includes('unloaded') ||
          errorMsg.includes('ERR_NO_MODEL') ||
          errorMsg.includes('TextEncoder') ||
          errorMsg.includes('complete event');
        const userMessage = isPipelineCrash
          ? 'Fallo en la generación de imagen — el modelo encontró un error nativo. Por favor, intenta de nuevo.'
          : errorMsg;

        this.updateState({ isGenerating: false, progress: null, status: null, previewPath: null, error: userMessage });
      }
      return null;
    }
  }

  /**
   * Generate an image. Runs independently of UI lifecycle.
   * If conversationId is provided, the result will be added as a chat message.
   */
  async generateImage(params: GenerateImageParams): Promise<GeneratedImage | null> {
    if (this.state.isGenerating) {
      logger.log('[ImageGenerationService] Already generating, ignoring request');
      return null;
    }
    const { settings, activeImageModelId, downloadedImageModels } = useAppStore.getState();
    const activeImageModel = downloadedImageModels.find(m => m.id === activeImageModelId);
    if (!activeImageModel) { this.updateState({ error: 'No hay modelo de imagen seleccionado' }); return null; }

    const steps = params.steps || settings.imageSteps || 8;
    const guidanceScale = params.guidanceScale || settings.imageGuidanceScale || 2.0;
    const imageWidth = settings.imageWidth || 256;
    const imageHeight = settings.imageHeight || 256;

    const shouldEnhance = settings.enhanceImagePrompts && !params.skipEnhancement;
    const enhancedPrompt = shouldEnhance ? await this._enhancePrompt(params, steps) : params.prompt;

    logger.log('[ImageGen] enhanceImagePrompts setting:', settings.enhanceImagePrompts, 'skipEnhancement:', params.skipEnhancement);
    this.cancelRequested = false;

    if (!shouldEnhance) {
      this.updateState({
        isGenerating: true, prompt: params.prompt, conversationId: params.conversationId || null,
        status: 'Preparando generación de imagen...', previewPath: null,
        progress: { step: 0, totalSteps: steps }, error: null, result: null,
      });
    } else {
      this.updateState({ status: 'Preparando generación de imagen...' });
    }

    let forceEvict = settings.modelLoadingStrategy === 'memory';
    
    // Qualcomm DSP (NPU) strict memory isolation rule to prevent Error 6031 (DMA abort)
    const idAndName = `${activeImageModel.id ?? ''} ${activeImageModel.name ?? ''}`.toLowerCase();
    const isQnnModel = activeImageModel.backend === 'qnn' || idAndName.includes('qnn') || idAndName.includes('npu') || idAndName.includes('snapdragon');
    if (isQnnModel) {
      logger.log('[ImageGen] QNN NPU model detected. Forcing text model eviction to prevent DMA / Memory Crash.');
      forceEvict = true;
    }

    if (!forceEvict && llmService.isModelLoaded() && activeImageModelId) {
      const activeTextId = useAppStore.getState().activeModelId;
      const memCheck = await activeModelService.checkMemoryForDualModel(activeTextId, activeImageModelId);
      if (memCheck.severity === 'critical' || memCheck.severity === 'warning') {
        logger.log(`[ImageGen] Dual memory check returned ${memCheck.severity}. Forcing text model eviction.`);
        forceEvict = true;
      }
    }

    // Bug 1 refuerzo: Evicción "ciega" — no confiamos en llmService.isModelLoaded()
    // porque después de un ciclo background→foreground el estado JS puede estar
    // desincronizado del estado nativo. evictTextModel() ya maneja el caso
    // de "no hay nada cargado" internamente, así que es seguro llamarlo siempre.
    if (forceEvict) {
      logger.log('[ImageGen] Memory strategy: explicitly evicting text model to prevent OOM for image generation.');
      try {
        await activeModelService.evictTextModel();
        // Give the OS 1 second to actually reclaim the GPU context and memory
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        logger.warn('[ImageGen] Failed to unload text model:', e);
      }
    }

    const loaded = await this._ensureImageModelLoaded(activeImageModelId, activeImageModel, settings.imageThreads ?? 4);
    if (!loaded) return null;
    if (this.cancelRequested) { this.resetState(); return null; }

    return this._runGenerationAndSave({ params, enhancedPrompt, activeImageModel, steps, guidanceScale, imageWidth, imageHeight, useOpenCL: settings.imageUseOpenCL ?? true });
  }

  async cancelGeneration(): Promise<void> {
    if (!this.state.isGenerating) return;
    this.cancelRequested = true;

    // Bug 3b fix: Stop the LLM if it's still running prompt enhancement.
    // Without this, the text model keeps consuming GPU/NPU in the background
    // even after the user cancels the image generation.
    try {
      if (llmService.isCurrentlyGenerating()) {
        logger.log('[ImageGen] 🛑 Stopping LLM enhancement (cancel requested)');
        await llmService.stopGeneration();
      }
      if (llmService.isModelLoaded()) {
        logger.log('[ImageGen] 🛑 Unloading LLM to free hardware for next generation');
        await llmService.unloadModel();
      }
    } catch (e) {
      logger.warn('[ImageGen] Failed to stop/unload LLM during cancel:', e);
    }

    try { await onnxImageGeneratorService.cancelGeneration(); } catch { /* Ignore */ }
    this.resetState();
  }

  private resetState(): void {
    this.updateState({
      isGenerating: false, progress: null, status: null, previewPath: null,
      prompt: null, conversationId: null, error: null,
      // Keep result so the last generated image is still accessible
    });
  }
}

export const imageGenerationService = new ImageGenerationService();
