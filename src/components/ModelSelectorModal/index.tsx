import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import { AppSheet } from '../AppSheet';
import { useTheme, useThemedStyles } from '../../theme';
import { useAppStore, useRemoteServerStore } from '../../stores';
import { DownloadedModel, ONNXImageModel, RemoteModel } from '../../types';
import { activeModelService, llmService, remoteServerManager } from '../../services';
import { CustomAlert, AlertState, initialAlertState, showAlert } from '../CustomAlert';
import { createAllStyles } from './styles';
import { TextTab } from './TextTab';
import { ImageTab } from './ImageTab';
import logger from '../../utils/logger';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TabType = 'text' | 'image';

interface ModelSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectModel: (model: DownloadedModel) => void;
  onSelectImageModel?: (model: ONNXImageModel) => void;
  onUnloadModel: () => void;
  onUnloadImageModel?: () => void;
  isLoading: boolean;
  currentModelPath: string | null;
  initialTab?: TabType;
  onAddServer?: () => void;
  onImportImageModel?: () => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  visible,
  onClose,
  onSelectModel,
  onSelectImageModel,
  onUnloadModel,
  onUnloadImageModel,
  isLoading,
  currentModelPath,
  initialTab = 'text',
  onAddServer,
  onImportImageModel,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createAllStyles);
  const { downloadedModels, downloadedImageModels, activeImageModelId } = useAppStore();
  const {
    servers,
    discoveredModels,
    serverHealth,
    activeRemoteTextModelId,
    activeRemoteImageModelId,
    setActiveRemoteImageModelId,
  } = useRemoteServerStore();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);

  // Reanimated state for tab bubble
  const tabProgress = useSharedValue(initialTab === 'image' ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      tabProgress.value = initialTab === 'image' ? 1 : 0;
    }
  }, [visible, initialTab]);

  const handleTabChange = (tab: TabType) => {
    if (isAnyLoading) return;
    setActiveTab(tab);
    tabProgress.value = withTiming(tab === 'image' ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.quad),
    });
  };

  const bubbleStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    height: '100%',
    width: '50%',
    left: `${interpolate(tabProgress.value, [0, 1], [0, 50])}%` as any,
    backgroundColor: styles.tabActiveBg.backgroundColor,
    borderRadius: 12,
  }));

  const textTextStyle = useAnimatedStyle(() => ({
    color: interpolate(tabProgress.value, [0, 1], [1, 0]) > 0.5 ? styles.tabActiveText.color : styles.tabInactiveText.color,
  }));

  const imageTextStyle = useAnimatedStyle(() => ({
    color: tabProgress.value > 0.5 ? styles.tabActiveText.color : styles.tabInactiveText.color,
  }));

  // Group remote models by server for TextTab — exclude servers known to be offline
  const remoteTextModels = useMemo(() => {
    return servers
      .filter(server => serverHealth[server.id]?.isHealthy !== false)
      .map(server => ({
        serverId: server.id,
        serverName: server.name,
        models: discoveredModels[server.id] || [],
      })).filter(group => group.models.length > 0);
  }, [servers, discoveredModels, serverHealth]);

  // Remote image generation models — Ollama/LM Studio don't serve image gen models.
  const remoteVisionModels = useMemo(() => [], []);

  const handleSelectImageModel = async (model: ONNXImageModel) => {
    if (activeImageModelId === model.id) return;
    setIsLoadingImage(true);
    try {
      await activeModelService.loadImageModel(model.id);
      setActiveRemoteImageModelId(null);
      onSelectImageModel?.(model);
    } catch (error) {
      logger.error('Failed to load image model:', error);
      setAlertState(showAlert('Failed to Load', (error as Error).message));
    } finally {
      setIsLoadingImage(false);
    }
  };

  const handleUnloadImageModel = async () => {
    setIsLoadingImage(true);
    try {
      await activeModelService.unloadImageModel();
      setActiveRemoteImageModelId(null);
      onUnloadImageModel?.();
    } catch (error) {
      logger.error('Failed to unload image model:', error);
    } finally {
      setIsLoadingImage(false);
    }
  };

  const handleSelectRemoteTextModel = async (model: RemoteModel, serverId: string) => {
    try {
      if (llmService.isModelLoaded()) {
        await activeModelService.unloadTextModel();
      }
      await remoteServerManager.setActiveRemoteTextModel(serverId, model.id);
    } catch (error) {
      logger.error('[ModelSelectorModal] Failed to set remote text model:', error);
      setAlertState(showAlert('Failed to Select Model', (error as Error).message));
    }
  };

  const handleSelectRemoteVisionModel = async (model: RemoteModel, serverId: string) => {
    try {
      await remoteServerManager.setActiveRemoteImageModel(serverId, model.id);
    } catch (error) {
      logger.error('[ModelSelectorModal] Failed to set remote vision model:', error);
      setAlertState(showAlert('Failed to Select Model', (error as Error).message));
    }
  };

  const handleSelectLocalModel = (model: DownloadedModel) => {
    remoteServerManager.clearActiveRemoteModel();
    onSelectModel(model);
  };

  const handleUnloadModel = () => {
    remoteServerManager.clearActiveRemoteModel();
    onUnloadModel();
  };

  const isAnyLoading = isLoading || isLoadingImage;

  return (
    <AppSheet visible={visible} onClose={onClose} snapPoints={['40%', '80%']} title="Selector de Modelos">
      <View style={styles.tabBarOutline}>
        <Animated.View style={bubbleStyle} />
        
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabChange('text')}
          disabled={isAnyLoading}
        >
          <Animated.Text style={[styles.tabText, textTextStyle]}>Texto</Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabChange('image')}
          disabled={isAnyLoading}
        >
          <Animated.Text style={[styles.tabText, imageTextStyle]}>Imagen</Animated.Text>
        </TouchableOpacity>
      </View>

      {isAnyLoading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando modelo...</Text>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'text' ? (
          <TextTab
            downloadedModels={downloadedModels}
            remoteModels={remoteTextModels}
            currentModelPath={currentModelPath}
            currentRemoteModelId={activeRemoteTextModelId}
            isAnyLoading={isAnyLoading}
            onSelectModel={handleSelectLocalModel}
            onSelectRemoteModel={handleSelectRemoteTextModel}
            onUnloadModel={handleUnloadModel}
            onAddServer={() => { onClose(); onAddServer?.(); }}
          />
        ) : (
          <ImageTab
            downloadedImageModels={downloadedImageModels}
            remoteVisionModels={remoteVisionModels}
            activeImageModelId={activeImageModelId}
            activeRemoteImageModelId={activeRemoteImageModelId}
            isAnyLoading={isAnyLoading}
            isLoadingImage={isLoadingImage}
            onSelectImageModel={handleSelectImageModel}
            onSelectRemoteVisionModel={handleSelectRemoteVisionModel}
            onUnloadImageModel={handleUnloadImageModel}
            onImportLocalModel={onImportImageModel}
          />
        )}
      </ScrollView>

      <CustomAlert {...alertState} onClose={() => setAlertState(initialAlertState)} />
    </AppSheet>
  );
};
