/**
 * GenerationService helper implementations — extracted to keep generationService.ts under 350 lines.
 * All functions receive the GenerationService instance as `svc: any` and mutate its internal state.
 */
import { llmService } from './llm';
import { useAppStore, useChatStore, useRemoteServerStore } from '../stores';
import type { Message, GenerationMeta } from '../types';
import { runToolLoop } from './generationToolLoop';
import type { ToolResult } from './tools/types';
import type { GenerationOptions } from './providers/types';
import logger from '../utils/logger';

export const FLUSH_INTERVAL_MS = 50; // ~20 updates/sec
type StreamChunk = string | { content?: string; reasoningContent?: string };

export interface GenerationRequest {
  conversationId: string;
  messages: Message[];
  onFirstToken?: () => void;
}

export interface GenerationWithToolsRequest {
  conversationId: string;
  messages: Message[];
  options: {
    enabledToolIds: string[];
    projectId?: string;
    onToolCallStart?: (name: string, args: Record<string, any>) => void;
    onToolCallComplete?: (name: string, result: ToolResult) => void;
    onFirstToken?: () => void;
  };
}

export function buildGenerationMetaImpl(svc: any): GenerationMeta {
  if (svc.isUsingRemoteProvider()) {
    const remoteStore = useRemoteServerStore.getState();
    const activeServer = remoteStore.getActiveServer();
    // Estimate token count from streaming content (roughly 4 chars per token), including reasoning tokens
    const contentLength = svc.state.streamingContent.length + svc.totalReasoningLength;
    const estimatedTokens = Math.ceil(contentLength / 4);
    const generationTime = svc.state.startTime ? (Date.now() - svc.state.startTime) / 1000 : 0;
    const tokensPerSecond = generationTime > 0 ? estimatedTokens / generationTime : undefined;

    return {
      gpu: false,
      gpuBackend: 'Remote',
      modelName: activeServer?.name || 'Remote Model',
      tokenCount: estimatedTokens,
      tokensPerSecond,
      timeToFirstToken: svc.remoteTimeToFirstToken,
    };
  }

  // Local provider metadata
  const { gpu, gpuBackend, gpuLayers } = llmService.getGpuInfo();
  const perf = llmService.getPerformanceStats();
  const { downloadedModels, activeModelId, settings } = useAppStore.getState();
  return {
    gpu, gpuBackend, gpuLayers,
    modelName: downloadedModels.find((m: any) => m.id === activeModelId)?.name,
    tokensPerSecond: perf.lastTokensPerSecond,
    decodeTokensPerSecond: perf.lastDecodeTokensPerSecond,
    timeToFirstToken: perf.lastTimeToFirstToken,
    tokenCount: perf.lastTokenCount,
    cacheType: settings.cacheType,
  };
}
function processStreamDelta(svc: any, chunk: { content?: string; reasoningContent?: string }) {
  if (svc.abortRequested) return;

  // Cortocircuito: Si es razonamiento nativo (proviene de modelos que soportan thinking explícito)
  // lo añadimos directamente al buffer de razonamiento y omitimos el parseo de etiquetas manual.
  if (chunk.reasoningContent) {
    svc.reasoningBuffer += chunk.reasoningContent;
    svc.totalReasoningLength += chunk.reasoningContent.length;
    // Si todavía no estamos en modo "parsingThinking", lo activamos ya que estamos recibiendo razonamiento
    if (!svc.isParsingThinking) {
      svc.isParsingThinking = true;
    }
  }

  if (chunk.content) {
    if (!svc.state.streamingContent && svc.remoteTimeToFirstToken === undefined) {
      svc.remoteTimeToFirstToken = svc.state.startTime
        ? (Date.now() - svc.state.startTime) / 1000
        : undefined;
    }

    // Si ya estamos recibiendo razonamiento nativo y llega contenido (normalmente vacío o whitespace),
    // pero para modelos que NO soportan razonamiento nativo, necesitamos parsear las etiquetas <think>.
    
    let textToProcess = svc.tagBuffer + chunk.content;
    svc.tagBuffer = '';

    const THINK_START = '<think>';
    const THINK_END = '</think>';

    while (textToProcess.length > 0) {
      if (!svc.isParsingThinking) {
        // Búsqueda optimizada: primero exacto (minúsculas), luego case-insensitive solo si es necesario
        let startIndex = textToProcess.indexOf(THINK_START);
        if (startIndex === -1) {
          startIndex = textToProcess.toLowerCase().indexOf(THINK_START);
        }

        if (startIndex !== -1) {
          const prefix = textToProcess.slice(0, startIndex);
          if (prefix) {
            svc.state.streamingContent += prefix;
            svc.tokenBuffer += prefix;
          }
          svc.isParsingThinking = true;
          textToProcess = textToProcess.slice(startIndex + THINK_START.length);
        } else {
          // No se encontró <think>. Verificar si hay una etiqueta parcial al final
          const lastChar = textToProcess[textToProcess.length - 1];
          // Solo comprobamos si termina en algo que parece el inicio de una etiqueta
          if (lastChar === '<' || textToProcess.includes('<')) {
             let partialIdx = -1;
             for (let i = 1; i < THINK_START.length; i++) {
               if (textToProcess.endsWith(THINK_START.slice(0, i))) {
                 partialIdx = textToProcess.length - i;
                 break;
               }
             }
             if (partialIdx !== -1) {
               svc.tagBuffer = textToProcess.slice(partialIdx);
               const safeText = textToProcess.slice(0, partialIdx);
               if (safeText) {
                 svc.state.streamingContent += safeText;
                 svc.tokenBuffer += safeText;
               }
               textToProcess = '';
               continue;
             }
          }
          
          svc.state.streamingContent += textToProcess;
          svc.tokenBuffer += textToProcess;
          textToProcess = '';
        }
      } else {
        // Buscando el final del bloque de pensamiento
        let endIndex = textToProcess.indexOf(THINK_END);
        if (endIndex === -1) {
          endIndex = textToProcess.toLowerCase().indexOf(THINK_END);
        }

        if (endIndex !== -1) {
          const thought = textToProcess.slice(0, endIndex);
          svc.reasoningBuffer += thought;
          svc.totalReasoningLength += thought.length;
          svc.isParsingThinking = false;
          textToProcess = textToProcess.slice(endIndex + THINK_END.length);
        } else {
          // No se encontró </think>. Verificar si hay etiqueta parcial al final
          const lastChar = textToProcess[textToProcess.length - 1];
          if (lastChar === '<' || textToProcess.includes('<')) {
            let partialIdx = -1;
            for (let i = 1; i < THINK_END.length; i++) {
              if (textToProcess.endsWith(THINK_END.slice(0, i))) {
                partialIdx = textToProcess.length - i;
                break;
              }
            }
            if (partialIdx !== -1) {
              svc.tagBuffer = textToProcess.slice(partialIdx);
              const thought = textToProcess.slice(0, partialIdx);
              svc.reasoningBuffer += thought;
              svc.totalReasoningLength += thought.length;
              textToProcess = '';
              continue;
            }
          }
          
          svc.reasoningBuffer += textToProcess;
          svc.totalReasoningLength += textToProcess.length;
          textToProcess = '';
        }
      }
    }
  }

  if (!svc.flushTimer) {
     // Aumentar ligeramente el intervalo para agrupar mejor los tokens si el sistema está bajo carga
    svc.flushTimer = setTimeout(() => svc.flushTokenBuffer(), FLUSH_INTERVAL_MS);
  }
}


export function buildToolLoopHandlersImpl(svc: any) {
  return {
    isAborted: () => svc.abortRequested,
    onThinkingDone: () => svc.updateState({ isThinking: false }),
    onStream: (data: StreamChunk) => {
      processStreamDelta(svc, typeof data === 'string' ? { content: data } : data);
    },
    onStreamReset: () => {
      svc.forceFlushTokens();
      svc.state.streamingContent = '';
      svc.tokenBuffer = '';
      svc.reasoningBuffer = '';
      svc.tagBuffer = '';
      svc.isParsingThinking = false;
    },
    onFinalResponse: (content: string) => {
      svc.state.streamingContent = content;
      useChatStore.getState().appendToStreamingMessage(content);
    },
  };
}

export async function prepareGenerationImpl(svc: any, conversationId: string): Promise<boolean> {
  if (svc.state.isGenerating) return false;
  svc.updateState({
    isGenerating: true, isThinking: true, conversationId,
    streamingContent: '', startTime: Date.now(),
  });
  useChatStore.getState().startStreaming(conversationId);
  // Drain pending native stop so LLM is idle before we start.
  if (svc.pendingStop !== null) await svc.pendingStop;
  if (!svc.state.isGenerating) return false; // stop called during drain
  svc.abortRequested = false;

  // Check provider readiness
  const failPrepare = (msg: string) => {
    svc.resetState();
    useChatStore.getState().clearStreamingMessage();
    throw new Error(msg);
  };
  if (svc.isUsingRemoteProvider()) {
    const provider = svc.getCurrentProvider();
    if (!provider) failPrepare('Remote provider not found');
    const ready = await provider.isReady();
    if (!ready) failPrepare('Remote provider not ready');
  } else {
    if (!llmService.isModelLoaded()) failPrepare('No model loaded');
    if (llmService.isCurrentlyGenerating()) failPrepare('LLM service busy');
  }

  svc.tokenBuffer = '';
  svc.reasoningBuffer = '';
  svc.totalReasoningLength = 0;
  svc.remoteTimeToFirstToken = undefined;
  return true;
}

export async function generateResponseImpl(
  svc: any,
  req: GenerationRequest,
): Promise<void> {
  const { conversationId, messages } = req;
  if (!(await prepareGenerationImpl(svc, conversationId))) return;
  const chatStore = useChatStore.getState();
  const { settings } = useAppStore.getState();

  // Inject Super Extended instruction if needed
  let finalMessages = messages;
  const { thinkingEnabled, thinkingLevel } = settings;
  if (thinkingEnabled && thinkingLevel === 'super_extended') {
    const superExtendedInstruction: Message = {
      id: 'system-super-extended-mode',
      role: 'system',
      content: "MODO SUPER EXTENDIDO: Antes de procesar la respuesta final, realiza obligatoriamente una fase de 'Refinamiento y Optimización' en tu pensamiento. Analiza la petición del usuario, identifica posibles ambigüedades o mejoras, y redefine mentalmente el prompt para obtener el mejor resultado posible. Luego, procede con el razonamiento detallado y la respuesta final.",
      timestamp: 0,
    };
    finalMessages = [superExtendedInstruction, ...messages];
  }

  try {
    await llmService.generateResponse(
      finalMessages,
      (data) => {
        if (svc.abortRequested) return;
        const chunk = typeof data === 'string' ? { content: data, reasoningContent: undefined } : data;
        
        svc.updateState({ isThinking: false });
        processStreamDelta(svc, chunk);
      },
      () => {
        // If aborted, stopGeneration() already handled cleanup — don't clobber new generation state.
        if (svc.abortRequested) return;
        svc.forceFlushTokens();
        const generationTime = svc.state.startTime ? Date.now() - svc.state.startTime : undefined;
        chatStore.finalizeStreamingMessage(conversationId, generationTime, buildGenerationMetaImpl(svc));
        svc.resetState();
      },
    );
  } catch (error) {
    if (svc.abortRequested) return;
    logger.error('[GenerationService] Generation error:', error);
    if (svc.flushTimer) { clearTimeout(svc.flushTimer); svc.flushTimer = null; }
    svc.tokenBuffer = '';
    chatStore.clearStreamingMessage();
    svc.resetState();
    throw error;
  }
}

export async function generateRemoteResponseImpl(
  svc: any,
  req: GenerationRequest,
): Promise<void> {
  const { conversationId, messages } = req;
  if (!(await prepareGenerationImpl(svc, conversationId))) return;
  const chatStore = useChatStore.getState();
  const provider = svc.getCurrentProvider();

  if (!provider) { svc.resetState(); throw new Error('No remote provider available'); }
  svc.remoteTimeToFirstToken = undefined;

  svc.currentRemoteAbortController = new AbortController();
  // Capture signal per-generation so callbacks stay guarded even after
  // abortRequested is reset by the next generation's prepareGeneration().
  const { signal: generationSignal } = svc.currentRemoteAbortController;

  const { temperature, maxTokens, topP, thinkingEnabled, thinkingLevel } = useAppStore.getState().settings;

  // Inject Super Extended instruction if needed
  let finalMessages = messages;
  if (thinkingEnabled && thinkingLevel === 'super_extended') {
    const superExtendedInstruction: Message = {
      id: `super-ext-${Date.now()}`,
      role: 'system',
      content: "MODO SUPER EXTENDIDO: Antes de procesar la respuesta final, realiza obligatoriamente una fase de 'Refinamiento y Optimización' en tu pensamiento. Analiza la petición del usuario, identifica posibles ambigüedades o mejoras, y redefine mentalmente el prompt para obtener el mejor resultado posible. Luego, procede con el razonamiento detallado y la respuesta final.",
      timestamp: Date.now(),
    };
    finalMessages = [superExtendedInstruction, ...messages];
  }

  const options: GenerationOptions = {
    temperature, maxTokens, topP,
    stopSequences: [],
    enableThinking: thinkingEnabled && provider.capabilities.supportsThinking,
    thinkingLevel: thinkingLevel,
  };

  try {
    await provider.generate(finalMessages, options, {
      onToken: (token: string) => {
        processStreamDelta(svc, { content: token });
      },
      onReasoning: (content: string) => {
        processStreamDelta(svc, { reasoningContent: content });
      },
      onComplete: () => {
        if (generationSignal.aborted) return;
        svc.forceFlushTokens();
        const generationTime = svc.state.startTime ? Date.now() - svc.state.startTime : undefined;
        chatStore.finalizeStreamingMessage(conversationId, generationTime, buildGenerationMetaImpl(svc));
        svc.resetState();
      },
      onError: (error: Error) => {
        if (generationSignal.aborted) return;
        logger.error('[GenerationService] Remote generation error:', error);
        if (svc.flushTimer) { clearTimeout(svc.flushTimer); svc.flushTimer = null; }
        svc.tokenBuffer = '';
        chatStore.clearStreamingMessage();
        svc.resetState();
        throw error;
      },
    });
  } catch (error) {
    if (generationSignal.aborted) return;
    logger.error('[GenerationService] Remote generation error:', error);
    // Mark server as offline so the Remote Servers screen reflects the failure
    const failedServerId = useRemoteServerStore.getState().activeServerId;
    if (failedServerId) useRemoteServerStore.getState().updateServerHealth(failedServerId, false);
    if (svc.flushTimer) { clearTimeout(svc.flushTimer); svc.flushTimer = null; }
    svc.tokenBuffer = '';
    chatStore.clearStreamingMessage();
    svc.resetState();
    throw error;
  } finally {
    svc.currentRemoteAbortController = null;
  }
}

export async function generateRemoteWithToolsImpl(
  svc: any,
  req: GenerationWithToolsRequest,
): Promise<void> {
  const { conversationId, messages, options } = req;
  logger.log(`[GenService][DEBUG] generateRemoteWithToolsImpl — conv=${conversationId}, messages=${messages.length}, enabledToolIds=[${options.enabledToolIds.join(', ')}]`);
  if (!(await prepareGenerationImpl(svc, conversationId))) {
    logger.log(`[GenService][DEBUG] prepareGeneration returned false, aborting`);
    return;
  }
  const provider = svc.getCurrentProvider();

  if (!provider) { svc.resetState(); throw new Error('No remote provider available'); }
  logger.log(`[GenService][DEBUG] Provider ready — type=${provider.type}, capabilities=${JSON.stringify(provider.capabilities)}`);

  const { enabledToolIds, projectId, ...callbacks } = options;

  // Use the same tool loop but with remote provider
  await runToolLoop({
    conversationId, messages, enabledToolIds, projectId, callbacks,
    ...buildToolLoopHandlersImpl(svc),
    forceRemote: true,
  });

  if (svc.abortRequested) {
    logger.log(`[GenService][DEBUG] Generation was aborted, skipping finalize`);
  } else {
    svc.forceFlushTokens();
    const generationTime = svc.state.startTime ? Date.now() - svc.state.startTime : undefined;
    logger.log(`[GenService][DEBUG] Finalizing — streamingContent length=${svc.state.streamingContent?.length || 0}, generationTime=${generationTime}ms`);
    useChatStore.getState().finalizeStreamingMessage(
      conversationId, generationTime, buildGenerationMetaImpl(svc),
    );
    svc.resetState();
  }
}
