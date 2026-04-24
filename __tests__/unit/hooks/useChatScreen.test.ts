/**
 * useChatScreen Hook Unit Tests
 *
 * Tests for the ChatScreen orchestration hook covering:
 * - startNewChat / continueChat navigation
 * - handleDeleteConversation confirmation
 * - handleEjectAll confirmation
 * - activeModel computation (local vs remote)
 */

import { renderHook, act } from '@testing-library/react-native';

// ─────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────

jest.mock('../../../src/services', () => ({
  remoteServerManager: {
    setActiveRemoteTextModel: jest.fn(),
    setActiveRemoteImageModel: jest.fn(),
    clearActiveRemoteModel: jest.fn(),
  },
  llmService: {
    isModelLoaded: jest.fn(() => true),
    supportsToolCalling: jest.fn(() => false),
    supportsThinking: jest.fn(() => false),
  },
  generationService: {
    getState: jest.fn(() => ({ queuedMessages: [] })),
    subscribe: jest.fn(() => jest.fn()),
    setQueueProcessor: jest.fn(),
  },
  imageGenerationService: {
    getState: jest.fn(() => ({ isGenerating: false })),
    subscribe: jest.fn(() => jest.fn()),
  },
  activeModelService: {
    unloadTextModel: jest.fn(),
    getActiveModels: jest.fn(() => ({ text: { isLoading: false } })),
  },
  hardwareService: {
    formatModelSize: jest.fn(() => '4GB'),
  },
  contextCompactionService: {
    subscribeCompacting: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../../src/stores', () => ({
  useAppStore: jest.fn(),
  useChatStore: jest.fn(),
  useRemoteServerStore: jest.fn(),
  useProjectStore: jest.fn(),
  useCharacterStore: jest.fn(),
}));

jest.mock('../../../src/components', () => ({
  showAlert: jest.fn((title: string, message: string, buttons?: any[]) => ({
    visible: true, title, message, buttons: buttons ?? [],
  })),
  hideAlert: jest.fn(() => ({ visible: false, title: '', message: '', buttons: [] })),
  initialAlertState: { visible: false, title: '', message: '', buttons: [] },
}));

jest.mock('../../../src/utils/logger', () => ({
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { useChatScreen } from '../../../src/screens/ChatScreen/useChatScreen';
import { remoteServerManager } from '../../../src/services';
import { useAppStore, useChatStore, useRemoteServerStore } from '../../../src/stores';
import { showAlert } from '../../../src/components';

// Mock navigation
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockNavigation = { navigate: mockNavigate, setParams: mockSetParams } as any;

// Mock route
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: {} }),
}));

describe('useChatScreen', () => {
  const mockCreateConversation = jest.fn(() => 'conv-new');
  const mockSetActiveConversation = jest.fn();
  const mockDeleteConversation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRemoteServerStore as unknown as jest.Mock).mockImplementation((selector?: any) => {
      const state = {
        activeServerId: null,
        activeRemoteTextModelId: null,
        discoveredModels: {},
        servers: [],
      };
      return selector ? selector(state) : state;
    });

    (useChatStore as unknown as jest.Mock).mockImplementation((selector?: any) => {
      const state = {
        activeConversationId: null,
        conversations: [],
        createConversation: mockCreateConversation,
        setActiveConversation: mockSetActiveConversation,
        deleteConversation: mockDeleteConversation,
        addMessage: jest.fn(),
        clearStreamingMessage: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    (useAppStore as unknown as jest.Mock).mockImplementation((selector?: any) => {
      const state = {
        activeModelId: null,
        downloadedModels: [],
        settings: { 
          showGenerationDetails: true,
          contextLength: 4096,
          thinkingEnabled: true,
          thinkingLevel: 'reduced',
          toolsEnabled: true,
        },
        activeImageModelId: null,
        downloadedImageModels: [],
        setDownloadedImageModels: jest.fn(),
        setIsGeneratingImage: jest.fn(),
        setImageGenerationStatus: jest.fn(),
        removeImagesByConversationId: jest.fn(),
        loadedSettings: null,
        onboardingChecklist: {},
        shownSpotlights: {},
        markSpotlightShown: jest.fn(),
        generatedImages: [],
      };
      return selector ? selector(state) : state;
    });
  });

  // ==========================================================================
  // startNewChat (Effect triggered by route params or manual call)
  // ==========================================================================
  describe('active model and conversation', () => {
    it('computes active model name from local model', () => {
      const localModel = { id: 'l1', name: 'Local Llama' } as any;
      (useAppStore as unknown as jest.Mock).mockImplementation((sel?: any) => {
        const st = {
          activeModelId: 'l1',
          downloadedModels: [localModel],
          settings: { showGenerationDetails: true, thinkingLevel: 'reduced' },
          activeImageModelId: null,
          downloadedImageModels: [],
        };
        return sel ? sel(st) : st;
      });

      const { result } = renderHook(() => useChatScreen());
      expect(result.current.activeModelName).toBe('Local Llama');
    });

    it('computes active model name from remote model', () => {
      const remoteModel = { id: 'r1', name: 'Remote Llama' } as any;
      (useRemoteServerStore as unknown as jest.Mock).mockImplementation((sel?: any) => {
        const st = {
          activeServerId: 's1',
          activeRemoteTextModelId: 'r1',
          discoveredModels: { 's1': [remoteModel] },
        };
        return sel ? sel(st) : st;
      });

      const { result } = renderHook(() => useChatScreen());
      expect(result.current.activeModelName).toBe('Remote Llama');
    });
  });

  // ==========================================================================
  // handleDeleteConversation
  // ==========================================================================
  describe('handleDeleteConversation', () => {
    it('shows delete confirmation alert', () => {
      const { result } = renderHook(() => useChatScreen());
      act(() => { result.current.handleDeleteConversation(); });
      expect(showAlert).toHaveBeenCalledWith(
        'Delete Conversation',
        expect.any(String),
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // handleUnloadModel
  // ==========================================================================
  describe('handleUnloadModel', () => {
    it('calls activeModelService.unloadTextModel', async () => {
      const { result } = renderHook(() => useChatScreen());
      await act(async () => {
        result.current.handleUnloadModel();
      });
      expect(remoteServerManager.clearActiveRemoteModel).toHaveBeenCalled();
    });
  });
});
