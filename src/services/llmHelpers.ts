import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { APP_CONFIG } from '../constants';
import { Message } from '../types';
import { MultimodalSupport, LLMPerformanceStats } from './llmTypes';
import { hardwareService } from './hardware';
import logger from '../utils/logger';

export const SYSTEM_PROMPT_RESERVE = 256;
export const RESPONSE_RESERVE = 512;
export const CONTEXT_SAFETY_MARGIN = 0.85;
const DEFAULT_THREADS = 4;
const DEFAULT_BATCH = 512;
// Android: forzar al menos 1 capa GPU para que el JNI cargue la variante hexagon_opencl
// (rnllama_jni_v8_2_dotprod_i8mm_hexagon_opencl), que en Snapdragon 8 Gen 3 usa el HTP.
export const DEFAULT_GPU_LAYERS = Platform.OS === 'ios' ? 99 : 1;
/**
 * CPU mask para Snapdragon 8 Gen 3:
 *  cores 0-3 = Cortex-A520 (eficiencia) → excluidos
 *  cores 4-6 = Cortex-A720 (rendimiento medio) → incluidos
 *  core  7   = Cortex-X4  (rendimiento pico)   → incluido
 * Evitar cores 0-3 reduce térmicos y mejora tokens/s.
 */
const SNAPDRAGON_BIG_CORE_MASK = '4-7';
export function getOptimalThreadCount(): number { 
  // En Android (Snapdragon 8 Gen 3), usar exactamente 4 hilos permite pinear 
  // al cluster de rendimiento (Core 7 + Cores 4-6). Usar mas causa overhead.
  return Platform.OS === 'android' ? 4 : DEFAULT_THREADS; 
}
export function getOptimalBatchSize(): number {
  const ramGB = hardwareService.getTotalMemoryGB();
  if (ramGB > 0 && ramGB < 6) return 256;
  return DEFAULT_BATCH;
}
/** @deprecated Siempre false: mmap está forzado en todos los modelos para aprovechar UFS 4.0. */
export function shouldDisableMmap(_modelPath: string): boolean {
  return false;
}
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i) ?? 0;
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) - hash) + char;
    // eslint-disable-next-line no-bitwise
    hash = hash & hash;
  }
  return hash.toString(16);
}
export async function ensureSessionCacheDir(cacheDir: string): Promise<void> {
  try {
    if (!await RNFS.exists(cacheDir)) await RNFS.mkdir(cacheDir);
  } catch (e) {
    logger.log('[LLM] Failed to create session cache dir:', e);
  }
}
export function getSessionPath(cacheDir: string, promptHash: string): string {
  return `${cacheDir}/session-${promptHash}.bin`;
}
export interface ModelLoadParams {
  baseParams: object;
  nThreads: number;
  nBatch: number;
  ctxLen: number;
  nGpuLayers: number;
}

export function buildModelParams(
  modelPath: string,
  settings: { nThreads?: number; nBatch?: number; contextLength?: number; flashAttn?: boolean; enableGpu?: boolean; gpuLayers?: number; cacheType?: string },
): ModelLoadParams {
  const nThreads = settings.nThreads || getOptimalThreadCount();
  const nBatch = settings.nBatch || getOptimalBatchSize();
  const ctxLen = settings.contextLength || APP_CONFIG.maxContextLength;
  const useFlashAttn = settings.flashAttn ?? true;
  const gpuEnabled = settings.enableGpu !== false;
  const nGpuLayers = gpuEnabled ? (settings.gpuLayers ?? DEFAULT_GPU_LAYERS) : 0;
  // KV cache cuantizado requiere flash_attn. 
  // Antes forzábamos f16 en Android por drivers inestables, pero en Snapdragon 8 Gen 3 
  // con el backend Hexagon/HTP, q8_0 y q4_0 son estables y mucho más rápidos.
  const requestedCache = settings.cacheType || (useFlashAttn ? 'q8_0' : 'f16');
  const needsF16 = !useFlashAttn; // Solo forzar f16 si Flash Attention está apagado.
  const cacheType = (needsF16 && requestedCache !== 'f16') ? 'f16' : requestedCache;

  // En Android, pinear hilos a cores de rendimiento para mejorar throughput y reducir térmicos.
  const cpuMask = Platform.OS === 'android' ? SNAPDRAGON_BIG_CORE_MASK : undefined;

  return {
    baseParams: {
      model: modelPath,
      use_mlock: false,
      n_batch: nBatch,
      n_ubatch: nBatch,
      n_threads: nThreads,
      use_mmap: !shouldDisableMmap(modelPath),
      vocab_only: false,
      // Solo usar flash_attn (bool) — NO flash_attn_type que sobreescribe a AUTO
      flash_attn: useFlashAttn,
      cache_type_k: cacheType,
      cache_type_v: cacheType,
      // Pinear hilos a cores de rendimiento en Snapdragon
      ...(cpuMask ? { cpu_mask: cpuMask } : {}),
      // Eliminar kv_unified: false; su uso dividía el caché KV y causaba corrupción 
      // de memoria (texto basura) en Qwen/Llama con la NPU/GPU Adreno.
    },
    nThreads, nBatch, ctxLen, nGpuLayers,
  };
}
export interface ContextInitResult {
  context: LlamaContext;
  gpuAttemptFailed: boolean;
  actualLength: number;
}
/** Timeout para init del contexto GPU en Android.
 * Se usa 12s (en vez de 8s) porque el DSP Hexagon tiene handshake adicional
 * en el primer arranque (carga del skel desde /vendor/lib/rfsa/adsp/).
 */
const GPU_INIT_TIMEOUT_MS = 60000; // El DSP Hexagon puede tardar hasta 40s en compilar el grafo neuronal (JIT) la primera vez.
/** Race a promise against a timeout; rejects with descriptive error on expiry. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
/** Safely release a context, swallowing errors (used during fallback cleanup). */
async function safeRelease(ctx: LlamaContext | null): Promise<void> {
  if (!ctx) return;
  try { await ctx.release(); } catch (e) { logger.warn('[LLM] Error releasing context during fallback:', e); }
}

/** Init llama with GPU, fall back to CPU, then retry with ctx=2048, then bare minimum on failure. */
export async function initContextWithFallback(
  params: object,
  contextLength: number,
  nGpuLayers: number,
): Promise<ContextInitResult> {
  const modelPath = (params as any).model || 'unknown';
  logger.log(`[LLM] initContextWithFallback: model=${modelPath}, ctx=${contextLength}, gpuLayers=${nGpuLayers}`);
  let gpuAttemptFailed = false;
  try {
    logger.log(`[LLM] Attempt 1/4: GPU init (ctx=${contextLength}, gpu_layers=${nGpuLayers})`);
    const gpuInitPromise = initLlama({ ...params, n_ctx: contextLength, n_gpu_layers: nGpuLayers } as any);
    // On Android, guard against Adreno driver hangs that cause ANRs.
    // If GPU init times out, the promise may still resolve later; capture and release it.
    if (nGpuLayers > 0 && Platform.OS === 'android') {
      let timedOut = false;
      gpuInitPromise.then(ctx => { if (timedOut) safeRelease(ctx); }).catch(() => {});
      try {
        const context = await withTimeout(gpuInitPromise, GPU_INIT_TIMEOUT_MS, 'GPU context init');
        logger.log('[LLM] GPU init succeeded');
        return { context, gpuAttemptFailed, actualLength: contextLength };
      } catch (e) {
        timedOut = true;
        throw e;
      }
    }
    const context = await gpuInitPromise;
    logger.log('[LLM] GPU init succeeded');
    return { context, gpuAttemptFailed, actualLength: contextLength };
  } catch (gpuError: any) {
    const gpuMsg = gpuError?.message || String(gpuError) || '';
    if (nGpuLayers > 0) {
      logger.warn(`[LLM] Attempt 1/4 failed (GPU): ${gpuMsg}`);
      gpuAttemptFailed = true;
    } else {
      logger.warn(`[LLM] Attempt 1/4 failed (no GPU requested): ${gpuMsg}`);
    }
    try {
      logger.log(`[LLM] Attempt 2/4: CPU init (ctx=${contextLength}, gpu_layers=0)`);
      const context = await initLlama({ ...params, n_ctx: contextLength, n_gpu_layers: 0 } as any);
      logger.log('[LLM] CPU init succeeded');
      return { context, gpuAttemptFailed, actualLength: contextLength };
    } catch (cpuError: any) {
      const cpuMsg = cpuError?.message || String(cpuError) || '';
      logger.warn(`[LLM] Attempt 2/4 failed (CPU, ctx=${contextLength}): ${cpuMsg}`);
      try {
        logger.log('[LLM] Attempt 3/4: CPU init (ctx=2048, gpu_layers=0)');
        const context = await initLlama({ ...params, n_ctx: 2048, n_gpu_layers: 0 } as any);
        logger.log('[LLM] CPU init with ctx=2048 succeeded');
        return { context, gpuAttemptFailed, actualLength: 2048 };
      } catch (minCtxError: any) {
        const minMsg = minCtxError?.message || String(minCtxError) || '';
        logger.warn(`[LLM] Attempt 3/4 failed (CPU, ctx=2048): ${minMsg}`);
        // Último recurso: parámetros barebones sin flash_attn, sin kv_unified, sin cpu_mask
        // Esto aísla si el fallo es por parámetros experimentales o por el modelo en sí.
        try {
          logger.log('[LLM] Attempt 4/4: Bare minimum (ctx=2048, no flash_attn, no kv_unified)');
          const bareParams = {
            model: (params as any).model,
            use_mlock: false,
            n_batch: 256,
            n_ubatch: 256,
            n_threads: 4,
            use_mmap: true,
            vocab_only: false,
            n_ctx: 2048,
            n_gpu_layers: 0,
          };
          const context = await initLlama(bareParams as any);
          logger.log('[LLM] Bare minimum init succeeded — model loaded with reduced params');
          return { context, gpuAttemptFailed: true, actualLength: 2048 };
        } catch (finalError: any) {
          const finalMsg = finalError?.message || String(finalError) || '';
          logger.error(`[LLM] Attempt 4/4 failed (bare minimum): ${finalMsg}`);
          logger.error(`[LLM] All 4 init attempts failed for model: ${modelPath}`);
          logger.error(`[LLM] Error chain — GPU: "${gpuMsg}" | CPU: "${cpuMsg}" | min-ctx: "${minMsg}" | bare: "${finalMsg}"`);
          throw new Error(`Failed to load model even at minimum context (2048). This may indicate insufficient memory, a corrupted model file, or an unsupported model format. (${finalMsg})`);
        }
      }
    }
  }
}
export interface GpuInfo {
  gpuEnabled: boolean;
  gpuReason: string;
  gpuDevices: string[];
  activeGpuLayers: number;
}

export function captureGpuInfo(
  context: LlamaContext,
  gpuAttemptFailed: boolean,
  nGpuLayers: number,
): GpuInfo {
  const nativeGpuAvailable = context.gpu ?? false;
  const gpuReason = (context as any).reasonNoGPU ?? '';
  const gpuDevices = (context as any).devices ?? [];
  const activeGpuLayers = gpuAttemptFailed ? 0 : nGpuLayers;
  const gpuEnabled = nativeGpuAvailable && activeGpuLayers > 0;
  return { gpuEnabled, gpuReason, gpuDevices, activeGpuLayers };
}
export function supportsNativeThinking(context: LlamaContext | null): boolean {
  if (!context) return false;
  try {
    if (typeof context.isJinjaSupported === 'function') {
      return context.isJinjaSupported();
    }
    const jinja = (context as any)?.model?.chatTemplates?.jinja;
    return !!(jinja?.default || jinja?.toolUse);
  } catch {
    return false;
  }
}
export function getThinkingBudget(level: 'super_lite' | 'reduced' | 'medium' | 'normal' | 'super_extended'): number {
  switch (level) {
    case 'super_lite': return 64;
    case 'reduced': return 256;
    case 'medium': return 1024;
    case 'super_extended': return 8192;
    case 'normal':
    default: return 4000;
  }
}

export function buildThinkingCompletionParams(enableThinking: boolean, level: 'super_lite' | 'reduced' | 'medium' | 'normal' | 'super_extended' = 'normal'): { enable_thinking: boolean; reasoning_format: 'none' | 'deepseek'; thinking_budget_tokens?: number } {
  if (!enableThinking) return { enable_thinking: false, reasoning_format: 'none' };
  
  return { 
    enable_thinking: true, 
    reasoning_format: 'deepseek',
    thinking_budget_tokens: getThinkingBudget(level)
  };
}
export function getStreamingDelta(nextValue: string | undefined, previousValue: string): string | undefined {
  if (!nextValue) return undefined;
  if (!previousValue) return nextValue;
  return nextValue.startsWith(previousValue) ? nextValue.slice(previousValue.length) || undefined : nextValue;
}

/** Reads the model's trained context length from metadata, or null if unavailable. */
export function getModelMaxContext(context: LlamaContext): number | null {
  try {
    const metadata = (context as any).model?.metadata;
    if (!metadata) return null;
    const trainCtx = metadata['llama.context_length'] || metadata['general.context_length'] || metadata.context_length;
    if (!trainCtx) return null;
    const maxModelCtx = Number.parseInt(trainCtx, 10);
    return Number.isNaN(maxModelCtx) || maxModelCtx <= 0 ? null : maxModelCtx;
  } catch {
    return null;
  }
}
export function logContextMetadata(context: LlamaContext, contextLength: number): void {
  const maxModelCtx = getModelMaxContext(context);
  if (maxModelCtx == null) return;
  logger.log(`[LLM] Model trained context: ${maxModelCtx}, using: ${contextLength}`);
  if (contextLength > maxModelCtx) logger.warn(`[LLM] Requested context (${contextLength}) exceeds model max (${maxModelCtx})`);
}
export interface MultimodalInitResult {
  initialized: boolean;
  support: MultimodalSupport;
}
export async function initMultimodal(
  context: LlamaContext,
  mmProjPath: string,
  useGpuForClip: boolean,
): Promise<MultimodalInitResult> {
  const noSupport: MultimodalInitResult = { initialized: false, support: { vision: false, audio: false } };
  try {
    const success = await context.initMultimodal({ path: mmProjPath, use_gpu: useGpuForClip });
    if (!success) {
      logger.warn('[LLM] initMultimodal returned false - mmproj may be incompatible with model');
      return noSupport;
    }
    let support: MultimodalSupport = { vision: true, audio: false };
    try {
      const s = await context.getMultimodalSupport();
      support = { vision: s?.vision || true, audio: s?.audio || false };
    } catch {
      // getMultimodalSupport not available, keep defaults
    }
    logger.log('[LLM] Multimodal initialized successfully, vision:', support.vision);
    return { initialized: true, support };
  } catch (error: any) {
    logger.error('[LLM] Multimodal init exception:', error?.message || error);
    return noSupport;
  }
}
export async function checkContextMultimodal(context: LlamaContext): Promise<MultimodalSupport> {
  try {
    // @ts-ignore - llama.rn may have this method
    if (typeof context.getMultimodalSupport === 'function') {
      const s = await context.getMultimodalSupport();
      return { vision: s?.vision || false, audio: s?.audio || false };
    }
  } catch {
    logger.log('Multimodal support check not available');
  }
  return { vision: false, audio: false };
}
export async function estimateTokens(context: LlamaContext, text: string): Promise<number> {
  try {
    return (await context.tokenize(text)).tokens?.length || 0;
  } catch {
    return Math.ceil(text.length / 4);
  }
}
export async function fitMessagesInBudget(
  context: LlamaContext,
  messages: Message[],
  budget: number,
): Promise<Message[]> {
  const result: Message[] = [];
  let remaining = budget;
  for (let i = messages.length - 1; i >= 0 && remaining > 0; i--) {
    const msg = messages[i];
    let tokens: number;
    try {
      tokens = ((await context.tokenize(msg.content)).tokens?.length || 0) + 10;
    } catch {
      tokens = Math.ceil(msg.content.length / 4) + 10;
    }
    if (tokens <= remaining) {
      result.unshift(msg);
      remaining -= tokens;
    } else if (result.length === 0) {
      result.unshift(msg);
      break;
    } else {
      break;
    }
  }
  return result;
}
/** Max safe context length based on device RAM to prevent OOM on low-RAM devices. */
export const BYTES_PER_GB = 1024 * 1024 * 1024;
export function getMaxContextForDevice(totalMemoryBytes: number): number {
  const gb = totalMemoryBytes / BYTES_PER_GB;
  if (gb <= 8) return 2048;
  return 4096; // Límite estricto superior para evitar OOM en cuantizaciones pesadas.
}
/**
 * Capas de GPU para Android por rango de RAM:
 * - ≤4GB: 0 (sin GPU — riesgo alto de OOM y abort nativo)
 * - ≤6GB: 1 (Hexagon backend trigger: mínimo para activar rnllama_jni_hexagon_opencl)
 * - ≤8GB: 8 (Hexagon parcial — delega cálculos de atención a HTP)
 * - >8GB: 16 (Snapdragon 8 Gen 3 típico — usa OpenCL + HTP sin saturar)
 *
 * NOTA: en GGUF cuantizado (Q4/Q8) no se puede cargar todo el modelo en GPU.
 * El objetivo es que el JNI cargue rnllama_jni_v8_2_dotprod_i8mm_hexagon_opencl
 * y delegue las operaciones GEMM/atención a la NPU, dejando pesos en RAM via mmap.
 */
const ANDROID_GPU_LAYER_CAPS: { maxGB: number; layers: number }[] = [
  { maxGB: 4, layers: 0 },
  { maxGB: 6, layers: 1 },
  { maxGB: 8, layers: 32 },
  { maxGB: 16, layers: 99 }, // Permitir offload total en Snapdragon 8 Gen 3
];
const ANDROID_GPU_LAYERS_FALLBACK = 32;

/** Capas GPU seguras según RAM del dispositivo. Skips GPU en ≤4 GB para evitar abort(). */
export function getGpuLayersForDevice(totalMemoryBytes: number, requestedLayers: number): number {
  const totalGB = totalMemoryBytes / BYTES_PER_GB;
  if (totalGB <= 4) return 0;

  // Caps específicos de Android/Adreno para prevenir ANRs
  if (Platform.OS === 'android') {
    const tier = ANDROID_GPU_LAYER_CAPS.find(t => totalGB <= t.maxGB);
    const maxLayers = tier ? tier.layers : ANDROID_GPU_LAYERS_FALLBACK;
    return Math.min(requestedLayers, maxLayers);
  }
  return requestedLayers;
}

/**
 * Verifica si la cuantización del modelo es óptima para el backend activo.
 * En Android (Snapdragon 8 Gen 3), la NPU Hexagon no soporta de forma nativa/rápida
 * los modelos IQ (Importance Quantization) o BF16, causando una caída de rendimiento.
 */
export function checkQuantizationPerformance(
  modelPath: string,
  gpuEnabled: boolean,
): { optimized: boolean; reason?: string } {
  if (Platform.OS !== 'android' || !gpuEnabled) return { optimized: true };

  const fileName = modelPath.split('/').pop()?.toUpperCase() || '';

  if (fileName.includes('-IQ') || fileName.includes('.IQ')) {
    return {
      optimized: false,
      reason: 'Las cuantizaciones IQ (Importance Quantization) no están optimizadas para la NPU Hexagon. Obtendrás un rendimiento mucho mayor con modelos Q4_K_M o Q4_0.',
    };
  }

  if (fileName.includes('BF16')) {
    return {
      optimized: false,
      reason: 'Los modelos BF16 son extremadamente lentos en dispositivos móviles. Se recomienda usar Q4_K_M para aceleración NPU real.',
    };
  }

  return { optimized: true };
}
export { validateModelFile, checkMemoryForModel, safeCompletion } from './llmSafetyChecks';
// Stop tokens: modelos comunes + tokens de control específicos de Gemma 2/4
export const STOP_TOKENS = [
  '</s>', '<|end|>', '<|eot_id|>',
  '<end_of_turn>',   // Gemma 2 / 4  — marcador de fin de turno
  '<eos>',           // Gemma 4 alternativo
];
export function buildCompletionParams(settings: {
  maxTokens?: number; temperature?: number; topP?: number; repeatPenalty?: number;
}, options?: { disableCtxShift?: boolean; loadStatePath?: string; saveStatePath?: string; }): Record<string, any> {
  const result: Record<string, any> = {
    n_predict: settings.maxTokens || RESPONSE_RESERVE,
    temperature: settings.temperature ?? 0.7,
    top_k: 40,
    top_p: settings.topP ?? 0.95,
    penalty_repeat: settings.repeatPenalty ?? 1.1,
    stop: STOP_TOKENS,
    ctx_shift: options?.disableCtxShift ? false : true,
  };
  if (options?.loadStatePath) result.load_state_path = options.loadStatePath;
  if (options?.saveStatePath) result.save_state_path = options.saveStatePath;
  return result;
}
export function recordGenerationStats(
  startTime: number,
  firstTokenMs: number,
  tokenCount: number,
): LLMPerformanceStats {
  const elapsed = (Date.now() - startTime) / 1000;
  const tokensPerSec = elapsed > 0 ? tokenCount / elapsed : 0;
  const ttft = firstTokenMs / 1000;
  const decodeTime = elapsed - ttft;
  const decodeTokensPerSec = decodeTime > 0 && tokenCount > 1 ? (tokenCount - 1) / decodeTime : 0;
  logger.log(`[LLM] Generated ${tokenCount} tokens in ${elapsed.toFixed(1)}s (${tokensPerSec.toFixed(1)} tok/s, TTFT ${ttft.toFixed(2)}s)`);
  return {
    lastTokensPerSecond: tokensPerSec,
    lastDecodeTokensPerSecond: decodeTokensPerSec,
    lastTimeToFirstToken: ttft,
    lastGenerationTime: elapsed,
    lastTokenCount: tokenCount,
  };
}
