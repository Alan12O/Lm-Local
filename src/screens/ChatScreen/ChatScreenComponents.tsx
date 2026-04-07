import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { AttachStep } from 'react-native-spotlight-tour';
import { ModelSelectorModal } from '../../components';
import { AnimatedEntry } from '../../components/AnimatedEntry';
import { llmService } from '../../services';
import { createStyles } from './styles';
import { useTheme } from '../../theme';

type StylesType = ReturnType<typeof createStyles>;
type ColorsType = ReturnType<typeof useTheme>['colors'];

export const NoModelScreen: React.FC<{
  styles: StylesType;
  colors: ColorsType;
  navigation: any;
  downloadedModelsCount: number;
  showModelSelector: boolean;
  setShowModelSelector: (v: boolean) => void;
  onSelectModel: (model: any) => void;
  onUnloadModel: () => void;
  isModelLoading: boolean;
}> = ({ styles, colors, navigation, downloadedModelsCount, showModelSelector, setShowModelSelector, onSelectModel, onUnloadModel, isModelLoading }) => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>New Chat</Text>
        </View>
        <View style={styles.headerActions} />
      </View>
    </View>
    <View style={styles.noModelContainer}>
      <View style={styles.noModelIconContainer}>
        <Icon name="cpu" size={32} color={colors.textMuted} />
      </View>
      <Text style={styles.noModelTitle}>No Model Selected</Text>
      <Text style={styles.noModelText}>
        {downloadedModelsCount > 0
          ? 'Select a model to start chatting.'
          : 'Download a model from the Models tab to start chatting.'}
      </Text>
      {downloadedModelsCount > 0 && (
        <TouchableOpacity style={styles.selectModelButton} onPress={() => setShowModelSelector(true)}>
          <Text style={styles.selectModelButtonText}>Select Model</Text>
        </TouchableOpacity>
      )}
    </View>
    <ModelSelectorModal
      visible={showModelSelector}
      onClose={() => setShowModelSelector(false)}
      onSelectModel={onSelectModel}
      onUnloadModel={onUnloadModel}
      isLoading={isModelLoading}
      currentModelPath={llmService.getLoadedModelPath()}
    />
  </SafeAreaView>
);

export const LoadingScreen: React.FC<{
  styles: StylesType;
  colors: ColorsType;
  navigation: any;
  loadingModelName: string;
  modelSize: string;
  hasVision: boolean;
}> = ({ styles, colors, navigation, loadingModelName, modelSize, hasVision }) => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Loading Model</Text>
        </View>
        <View style={styles.headerActions} />
      </View>
    </View>
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading {loadingModelName}</Text>
      {modelSize ? <Text style={styles.loadingSubtext}>{modelSize}</Text> : null}
      <Text style={styles.loadingHint}>
        Preparing model for inference. This may take a moment for larger models.
      </Text>
      {hasVision && <Text style={styles.loadingHint}>Vision capabilities will be enabled.</Text>}
    </View>
  </SafeAreaView>
);

export const ChatHeader: React.FC<{
  styles: StylesType;
  colors: ColorsType;
  activeConversation: any;
  activeModel: any;
  activeModelName?: string;
  activeImageModel: any;
  activeProject: any;
  navigation: any;
  setShowModelSelector: (v: boolean) => void;
  setShowSettingsPanel: (v: boolean) => void;
  setShowProjectSelector: (v: boolean) => void;
  isRemote?: boolean;
}> = ({ styles, colors, activeConversation, activeModel, activeModelName, activeImageModel, activeProject, navigation, setShowModelSelector, setShowSettingsPanel, setShowProjectSelector, isRemote }) => (
  <View style={styles.header}>
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Icon name="menu" size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={[styles.headerLeft, { flex: 1, alignItems: 'center' }]}>
        <TouchableOpacity 
          style={[styles.modelSelector, { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }]} 
          onPress={() => setShowModelSelector(true)} 
          testID="model-selector"
        >
          {isRemote && (
            <Icon name="cloud" size={14} color={colors.primary} style={styles.remoteIcon} />
          )}
          <Text style={[styles.headerTitle, { fontSize: 16 }]} numberOfLines={1} testID="model-loaded-indicator">
            {activeModelName || activeModel?.name || '⚠️ Ningún modelo'}
          </Text>
          {activeImageModel && (
            <View style={styles.headerImageBadge}>
              <Icon name="image" size={10} color={colors.primary} />
            </View>
          )}
          <Icon name="chevron-down" size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerActions}>
        <AttachStep index={16}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettingsPanel(true)} testID="chat-settings-icon">
            <Icon name="sliders" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </AttachStep>
      </View>
    </View>
  </View>
);

export const EmptyChat: React.FC<{
  styles: StylesType;
  colors: ColorsType;
  activeModel: any;
  activeModelName?: string;
  activeProject: any;
  setShowProjectSelector: (v: boolean) => void;
  isRemote?: boolean;
  onQuickAction?: (text: string) => void;
}> = ({ styles, colors, activeModel, activeModelName, activeProject, setShowProjectSelector, isRemote, onQuickAction }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const quickActions = [
    { icon: 'code', text: 'Ayuda con código' },
    { icon: 'align-left', text: 'Resumir texto' },
    { icon: 'edit-3', text: 'Redactar correo' },
    { icon: 'pie-chart', text: 'Analizar datos' },
  ];

  return (
    <View style={[styles.emptyChat, { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }]}>
      {/* Saludo Principal */}
      <AnimatedEntry index={0} staggerMs={60}>
        <Text style={[styles.emptyChatTitle, { fontSize: 28, fontWeight: '300', marginBottom: 32 }]}>
          {getGreeting()}
        </Text>
      </AnimatedEntry>

      {/* Quick Actions */}
      <AnimatedEntry index={1} staggerMs={60}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 600 }}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity 
              key={idx}
              onPress={() => onQuickAction?.(action.text)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceLight,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 100,
                borderWidth: 0.5,
                borderColor: colors.borderLight,
              }}
            >
              <Icon name={action.icon} size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textSecondary, flexShrink: 0 }}>{action.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </AnimatedEntry>

      {/* Indicador de Personaje / Proyecto (si aplica) */}
      {activeProject && (
        <AnimatedEntry index={2} staggerMs={60}>
          <TouchableOpacity 
            style={[styles.projectHint, { marginTop: 32 }]} 
            onPress={() => setShowProjectSelector(true)}
          >
            <View style={styles.projectHintIcon}>
              <Text style={styles.projectHintIconText}>
                {activeProject.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.projectHintText}>
              Conversando en: {activeProject.name} — tocar para instrucciones
            </Text>
          </TouchableOpacity>
        </AnimatedEntry>
      )}

    </View>
  );
};

export const ImageProgressIndicator: React.FC<{
  styles: StylesType;
  colors: ColorsType;
  imagePreviewPath: string | null | undefined;
  imageGenerationStatus: string | null | undefined;
  imageGenerationProgress: { step: number; totalSteps: number } | null | undefined;
  onStop: () => void;
}> = ({ styles, colors, imagePreviewPath, imageGenerationStatus, imageGenerationProgress, onStop }) => (
  <View style={styles.imageProgressContainer}>
    <View style={styles.imageProgressCard}>
      <View style={styles.imageProgressRow}>
        {imagePreviewPath && (
          <Image source={{ uri: imagePreviewPath }} style={styles.imagePreview} resizeMode="cover" />
        )}
        <View style={styles.imageProgressContent}>
          <View style={styles.imageProgressHeader}>
            <View style={styles.imageProgressIconContainer}>
              <Icon name="image" size={18} color={colors.primary} />
            </View>
            <View style={styles.imageProgressInfo}>
              <Text style={styles.imageProgressTitle}>
                {imagePreviewPath ? 'Refining Image' : 'Generating Image'}
              </Text>
              {imageGenerationStatus && (
                <Text style={styles.imageProgressStatus}>{imageGenerationStatus}</Text>
              )}
            </View>
            {imageGenerationProgress && (
              <Text style={styles.imageProgressSteps}>
                {imageGenerationProgress.step}/{imageGenerationProgress.totalSteps}
              </Text>
            )}
            <TouchableOpacity style={styles.imageStopButton} onPress={onStop}>
              <Icon name="x" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
          {imageGenerationProgress && (
            <View style={styles.imageProgressBarContainer}>
              <View style={styles.imageProgressBar}>
                <View
                  style={[
                    styles.imageProgressFill,
                    { width: `${(imageGenerationProgress.step / imageGenerationProgress.totalSteps) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  </View>
);

export const ImageViewerModal: React.FC<{
  styles: StylesType;
  colors: ColorsType;
  viewerImageUri: string | null;
  onClose: () => void;
  onSave: () => void;
}> = ({ styles, colors, viewerImageUri, onClose, onSave }) => (
  <Modal visible={!!viewerImageUri} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.imageViewerContainer}>
      <TouchableOpacity style={styles.imageViewerBackdrop} activeOpacity={1} onPress={onClose} />
      {viewerImageUri && (
        <View style={styles.imageViewerContent}>
          <Image source={{ uri: viewerImageUri }} style={styles.fullscreenImage} resizeMode="contain" />
          <View style={styles.imageViewerActions}>
            <TouchableOpacity style={styles.imageViewerButton} onPress={onSave}>
              <Icon name="download" size={24} color={colors.text} />
              <Text style={styles.imageViewerButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageViewerButton} onPress={onClose}>
              <Icon name="x" size={24} color={colors.text} />
              <Text style={styles.imageViewerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  </Modal>
);
