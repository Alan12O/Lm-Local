import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AlertState, initialAlertState } from '../../components';
import { useAppStore, useChatStore, useProjectStore, useRemoteServerStore, useCharacterStore } from '../../stores';
import logger from '../../utils/logger';
import {
  llmService, generationService, imageGenerationService, activeModelService,
  ImageGenerationState, hardwareService, QueuedMessage,
  contextCompactionService,
} from '../../services';
import { Message, MediaAttachment, Project, DownloadedModel, DebugInfo, RemoteModel } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { ensureModelLoadedFn, handleModelSelectFn, handleUnloadModelFn, initiateModelLoad, useChatImageModelEffects, useChatModelStateSync } from './useChatModelActions';
import { startGenerationFn, handleSendFn, handleStopFn, handleSelectProjectFn } from './useChatGenerationActions';
import { handleRetryMessageFn, handleEditMessageFn, handleDeleteConversationFn, handleGenerateImageFromMsgFn } from './useChatMessageHandlers';
import { getDisplayMessages, getPlaceholderText, ChatMessageItem, StreamingState } from './types';
import { saveImageToGallery } from './useSaveImage';

export type { AlertState, ChatMessageItem, StreamingState };
export { getDisplayMessages, getPlaceholderText };

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

type ActiveModelInfo = {
  isRemote: boolean;
  model: DownloadedModel | RemoteModel | null;
  modelId: string | null;
  modelName: string;
};

export const useChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ChatScreenRouteProp>();
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [loadingModel, setLoadingModel] = useState<DownloadedModel | null>(null);
  const [supportsVision, setSupportsVision] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [animateLastN, setAnimateLastN] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [queuedTexts, setQueuedTexts] = useState<string[]>([]);
  const [viewerImageUri, setViewerImageUri] = useState<string | null>(null);
  const [imageGenState, setImageGenState] = useState<ImageGenerationState>(imageGenerationService.getState());
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [supportsToolCalling, setSupportsToolCalling] = useState(false);
  const [supportsThinking, setSupportsThinking] = useState(false);
  const [isCompacting, setIsCompacting] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [showIncognitoToast, setShowIncognitoToast] = useState(false);
  const lastMessageCountRef = useRef(0);
  const generatingForConversationRef = useRef<string | null>(null);
  const modelLoadStartTimeRef = useRef<number | null>(null);
  const startGenerationRef = useRef<(id: string, text: string) => Promise<void>>(null as any);
  const addMessageRef = useRef<typeof addMessage>(null as any);
  // Guard: tracks last conversationId we routed to prevent re-triggering the routing effect
  const lastRoutedConvRef = useRef<string | undefined>(undefined);

  const {
    activeModelId, downloadedModels, settings, activeImageModelId,
    downloadedImageModels, setDownloadedImageModels,
    setIsGeneratingImage: setAppIsGeneratingImage,
    setImageGenerationStatus: setAppImageGenerationStatus,
    removeImagesByConversationId, loadedSettings,
  } = useAppStore();

  // Remote model state - use proper selectors for reactivity
  const activeServerId = useRemoteServerStore((s) => s.activeServerId);
  const activeRemoteTextModelId = useRemoteServerStore((s) => s.activeRemoteTextModelId);
  const discoveredModels = useRemoteServerStore((s) => s.discoveredModels);

  const {
    activeConversationId, conversations, createConversation, addMessage,
    updateMessageContent, deleteMessagesAfter, streamingMessage, streamingReasoningContent,
    isThinkingBlock, streamingForConversationId, isStreaming, isThinking, clearStreamingMessage,
    deleteConversation, setActiveConversation, setConversationProject,
  } = useChatStore();

  const { projects, getProject } = useProjectStore();
  const { getCharacter } = useCharacterStore();
  addMessageRef.current = addMessage;

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeCharacter = activeConversation?.projectId ? getCharacter(activeConversation.projectId) : null;
  const themeColor = activeCharacter?.themeColor;

  // Compute active model from either local or remote source
  const activeModelInfo = useMemo((): ActiveModelInfo => {
    // Check for remote model first
    if (activeServerId && activeRemoteTextModelId) {
      const serverModels = discoveredModels[activeServerId] || [];
      const remoteModel = serverModels.find(m => m.id === activeRemoteTextModelId);
      if (remoteModel) {
        return {
          isRemote: true,
          model: remoteModel,
          modelId: remoteModel.id,
          modelName: remoteModel.name,
        };
      }
      logger.warn('[ChatScreen] Remote model not found:', activeServerId, activeRemoteTextModelId);
    }
    // Fall back to local model
    const localModel = downloadedModels.find(m => m.id === activeModelId);
    if (localModel) {
      return {
        isRemote: false,
        model: localModel,
        modelId: localModel.id,
        modelName: localModel.name,
      };
    }
    return { isRemote: false, model: null, modelId: null, modelName: 'Unknown' };
  }, [activeServerId, activeRemoteTextModelId, discoveredModels, activeModelId, downloadedModels]);

  // activeModel is for LOCAL models only (for file path, memory checks, etc.)
  const activeModel = activeModelInfo.isRemote ? undefined : (activeModelInfo.model as DownloadedModel | undefined);
  const activeRemoteModel = activeModelInfo.isRemote ? (activeModelInfo.model as RemoteModel | null) : null;
  const hasActiveModel = activeModelInfo.modelId !== null;
  const activeModelName = activeModelInfo.modelName;

  const activeProject = activeConversation?.projectId ? getProject(activeConversation.projectId) : null;
  const activeImageModel = downloadedImageModels.find(m => m.id === activeImageModelId);
  const imageModelLoaded = !!activeImageModel;
  const isGeneratingImage = imageGenState.isGenerating;
  const isStreamingForThisConversation = streamingForConversationId === activeConversationId;
  const isCharacterMode = !!(activeConversation?.projectId && useCharacterStore.getState().getCharacter(activeConversation.projectId));

  const modelDeps = useMemo(() => ({
    activeModel, activeModelId: activeModelInfo.modelId, activeModelInfo, hasActiveModel, activeConversationId, isStreaming, settings,
    clearStreamingMessage, createConversation, addMessage,
    setIsModelLoading, setLoadingModel, setSupportsVision, setShowModelSelector,
    setAlertState, modelLoadStartTimeRef,
  }), [
    activeModel, activeModelInfo, hasActiveModel, activeConversationId, isStreaming, settings,
    clearStreamingMessage, createConversation, addMessage,
    setIsModelLoading, setLoadingModel, setSupportsVision, setShowModelSelector,
    setAlertState, modelLoadStartTimeRef,
  ]);

  const genDeps = useMemo(() => ({
    activeModelId: activeModelInfo.modelId, activeModel, activeModelInfo, hasActiveModel, activeConversationId, activeConversation, activeProject,
    activeImageModel, imageModelLoaded, isStreaming, isGeneratingImage, imageGenState, settings,
    downloadedModels, setAlertState, setIsClassifying, setAppImageGenerationStatus,
    setAppIsGeneratingImage, addMessage, clearStreamingMessage, deleteConversation,
    setActiveConversation, removeImagesByConversationId, generatingForConversationRef, navigation, setShowSettingsPanel, setShowModelSelector,
    ensureModelLoaded: async () => ensureModelLoadedFn(modelDeps),
    isCharacterMode,
  }), [
    activeModelInfo, activeModel, hasActiveModel, activeConversationId, activeConversation, activeProject,
    activeImageModel, imageModelLoaded, isStreaming, isGeneratingImage, imageGenState, settings,
    downloadedModels, setAlertState, setIsClassifying, setAppImageGenerationStatus,
    setAppIsGeneratingImage, addMessage, clearStreamingMessage, deleteConversation,
    setActiveConversation, removeImagesByConversationId, generatingForConversationRef, navigation, setShowSettingsPanel, setShowModelSelector,
    isCharacterMode, modelDeps
  ]);

  useEffect(() => {
    const unsub1 = imageGenerationService.subscribe(state => setImageGenState(state));
    const unsub2 = contextCompactionService.subscribeCompacting(setIsCompacting);
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    return generationService.subscribe(state => {
      setQueueCount(state.queuedMessages.length);
      setQueuedTexts(state.queuedMessages.map((m: QueuedMessage) => m.text));
    });
  }, []);

  const handleQueuedSend = useCallback(async (item: QueuedMessage) => {
    addMessageRef.current(item.conversationId, { role: 'user', content: item.text, attachments: item.attachments });
    await startGenerationRef.current(item.conversationId, item.messageText);
  }, []);

  useEffect(() => {
    generationService.setQueueProcessor(handleQueuedSend);
    return () => generationService.setQueueProcessor(null);
  }, [handleQueuedSend]);

  useEffect(() => {
    const { conversationId, projectId } = route.params || {};

    // Guard: skip if we already processed this exact conversationId to avoid loops
    if (conversationId !== undefined && conversationId === lastRoutedConvRef.current) return;
    lastRoutedConvRef.current = conversationId;

    if (conversationId && conversationId !== activeConversationId) {
      setActiveConversation(conversationId);
    } else if (!conversationId && !activeConversationId && activeModelInfo.modelId) {
      const newId = createConversation(activeModelInfo.modelId, undefined, projectId, isIncognito);
      navigation.setParams({ conversationId: newId } as any);
    }
  // activeConversationId removed intentionally — the ref prevents re-processing the same id
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.conversationId, route.params?.projectId, activeModelInfo.modelId, isIncognito]);

  // Separate effect for auto-send (e.g. from Math Laboratory) — isolated to avoid routing loops
  useEffect(() => {
    const { initialMessage, autoSend, conversationId } = route.params || {};
    if (!initialMessage || !autoSend) return;
    const targetId = conversationId || activeConversationId;
    if (!targetId || !activeModelInfo.modelId) return;
    // Clear immediately to prevent re-triggering
    navigation.setParams({ initialMessage: undefined, autoSend: undefined } as any);
    handleSendFn(genDeps, { text: initialMessage, startGeneration, setDebugInfo });
  // Only runs when initialMessage/autoSend arrive — genDeps excluded to keep this stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.initialMessage, route.params?.autoSend]);


  // Clear KV Cache en el mount removido para evitar el crasheo de SIGSEGV en OpenCL
  useEffect(() => {
    if (generatingForConversationRef.current && generatingForConversationRef.current !== activeConversationId) {
      generatingForConversationRef.current = null;
    }
  }, [activeConversationId]);

  // Clean up incognito conversations on unmount
  useEffect(() => {
    return () => {
      const activeId = useChatStore.getState().activeConversationId;
      if (activeId) {
        const conv = useChatStore.getState().conversations.find(c => c.id === activeId);
        if (conv?.isIncognito) {
          useChatStore.getState().deleteConversation(activeId);
        }
      }
    };
  }, []);

  useChatImageModelEffects({ setDownloadedImageModels, settings, activeImageModelId, downloadedModels });
  useChatModelStateSync({ activeModelInfo, activeModelId, activeModel, modelDeps, activeRemoteModel, activeRemoteTextModelId, isModelLoading, setSupportsVision, setSupportsToolCalling, setSupportsThinking });

  const displayMessages = getDisplayMessages(activeConversation?.messages || [], { isThinking, streamingMessage, streamingReasoningContent, isStreamingForThisConversation, isThinkingBlock });

  useEffect(() => {
    const prev = lastMessageCountRef.current, curr = displayMessages.length;
    if (curr > prev && prev > 0) setAnimateLastN(curr - prev);
    lastMessageCountRef.current = curr;
  }, [displayMessages.length]);
  useEffect(() => { lastMessageCountRef.current = 0; setAnimateLastN(0); }, [activeConversationId]);

  const startGeneration = async (targetConversationId: string, messageText: string) => {
    await startGenerationFn(genDeps, { setDebugInfo, targetConversationId, messageText });
  };
  startGenerationRef.current = startGeneration;
  const toolsEnabled = settings.toolsEnabled ?? true;
  const enabledTools = supportsToolCalling && toolsEnabled ? (settings.enabledTools || []) : [];
  const handleToggleTool = (toolId: string) => {
    const cur = settings.enabledTools || [];
    useAppStore.getState().updateSettings({ enabledTools: cur.includes(toolId) ? cur.filter((id: string) => id !== toolId) : [...cur, toolId] });
  };
  const handleToggleAllTools = (enabled: boolean) => {
    useAppStore.getState().updateSettings({ toolsEnabled: enabled });
  };
  // Check if there are pending settings that require model reload
  const isModelStale = useMemo(() => {
    return !!activeModelInfo.modelId && !activeModelInfo.isRemote && !llmService.isModelLoaded() && !isModelLoading;
  }, [activeModelInfo.modelId, activeModelInfo.isRemote, isModelLoading]);

  const hasPendingSettings = (() => {
    if (isModelStale) return true;
    if (!loadedSettings) return false;
    return (
      settings.nThreads !== loadedSettings.nThreads ||
      settings.nBatch !== loadedSettings.nBatch ||
      settings.contextLength !== loadedSettings.contextLength ||
      settings.enableGpu !== loadedSettings.enableGpu ||
      settings.gpuLayers !== loadedSettings.gpuLayers ||
      settings.flashAttn !== loadedSettings.flashAttn ||
      settings.cacheType !== loadedSettings.cacheType
    );
  })();

  const handleReloadTextModel = useCallback(async () => {
    if (!activeModelInfo.modelId || activeModelInfo.isRemote) return;
    // Must unload first — loadTextModel skips if the same model ID is already loaded,
    // which means setLoadedSettings would never run and the banner would persist.
    if (llmService.isModelLoaded()) {
      await activeModelService.unloadTextModel();
    }
    await initiateModelLoad(modelDeps, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModelInfo.modelId, activeModelInfo.isRemote, settings]);

  return {
    isModelLoading, loadingModel, supportsVision,
    showProjectSelector, setShowProjectSelector,
    showDebugPanel, setShowDebugPanel,
    showModelSelector, setShowModelSelector,
    showSettingsPanel, setShowSettingsPanel,
    showToolPicker, setShowToolPicker, supportsToolCalling, supportsThinking,
    debugInfo, alertState, setAlertState,
    showScrollToBottom, setShowScrollToBottom,
    isClassifying, animateLastN, queueCount, queuedTexts,
    viewerImageUri, setViewerImageUri, imageGenState,
    toolsEnabled, enabledTools, handleToggleTool, handleToggleAllTools,
    activeModelId: activeModelInfo.modelId, activeConversationId, activeConversation, activeModel,
    activeModelInfo, hasActiveModel, activeRemoteModel, activeModelName,
    activeProject, activeImageModel, imageModelLoaded, isGeneratingImage,
    themeColor,
    imageGenerationProgress: imageGenState.progress,
    imageGenerationStatus: imageGenState.status,
    imagePreviewPath: imageGenState.previewPath,
    isStreaming, isThinking, isCompacting, hasPendingSettings, isModelStale,
    handleReloadTextModel, displayMessages, downloadedModels, projects, settings,
    navigation, hardwareService,
    isIncognito: activeConversation?.isIncognito ?? isIncognito,
    showIncognitoToast,
    handleToggleIncognito: (val: boolean) => {
      setIsIncognito(val);
      if (activeModelInfo.modelId) {
        // Auto-routing: reuse existing or start new conversation of the target type
        const newId = createConversation(
          activeModelInfo.modelId as string, 
          undefined, 
          activeConversation?.projectId || undefined, 
          val
        );
        
        // Sync navigation params so the UI reacts to the specific conversation ID
        navigation.setParams({ conversationId: newId } as any);

        if (val) {
          setShowIncognitoToast(true);
          setTimeout(() => setShowIncognitoToast(false), 1200);
        }
      }
    },

    handleSend: (text: string, attachments?: MediaAttachment[], imageMode?: 'auto' | 'force' | 'disabled') =>
      handleSendFn(genDeps, { text, attachments, imageMode, startGeneration, setDebugInfo }),
    handleStop: () => handleStopFn(genDeps),
    handleModelSelect: (model: DownloadedModel) => handleModelSelectFn(modelDeps, model),
    handleUnloadModel: () => handleUnloadModelFn(modelDeps),
    handleDeleteConversation: () =>
      handleDeleteConversationFn(genDeps, { activeConversationId, activeConversation, setAlertState }),
    handleCopyMessage: (_content: string) => { },
    handleRetryMessage: (message: Message) =>
      handleRetryMessageFn(message, genDeps, { activeConversationId, hasActiveModel, activeConversation, deleteMessagesAfter, setDebugInfo }),
    handleEditMessage: (message: Message, newContent: string) =>
      handleEditMessageFn(genDeps, { message, newContent, activeConversationId, hasActiveModel, updateMessageContent, deleteMessagesAfter, setDebugInfo }),
    handleSelectProject: (project: Project | null) =>
      handleSelectProjectFn({ activeConversationId, setConversationProject, setShowProjectSelector }, project),
    handleGenerateImageFromMessage: (prompt: string) =>
      handleGenerateImageFromMsgFn(prompt, genDeps, { activeConversationId, activeImageModel, setAlertState }),
    handleImagePress: (uri: string) => setViewerImageUri(uri),
    handleSaveImage: () => saveImageToGallery(viewerImageUri, setAlertState),
    isRemote: activeModelInfo.isRemote,
    isCharacterMode,
  };
};
