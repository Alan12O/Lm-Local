import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
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
  <View style={styles.container}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Icon name="menu" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Nuevo Chat</Text>
        </View>
        <View style={styles.headerActions} />
      </View>
    </View>
    <View style={styles.noModelContainer}>
      <View style={styles.noModelIconContainer}>
        <Icon name="cpu" size={32} color={colors.textMuted} />
      </View>
      <Text style={styles.noModelTitle}>Ningún modelo seleccionado</Text>
      <Text style={styles.noModelText}>
        {downloadedModelsCount > 0
          ? 'Selecciona un modelo para empezar a chatear.'
          : 'Descarga un modelo desde la pestaña de Modelos para empezar a chatear.'}
      </Text>
      {downloadedModelsCount > 0 && (
        <TouchableOpacity style={styles.selectModelButton} onPress={() => setShowModelSelector(true)}>
          <Text style={styles.selectModelButtonText}>Seleccionar modelo</Text>
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
  </View>
);

export const LoadingScreen: React.FC<{
  styles: StylesType;
  colors: ColorsType;
  navigation: any;
  loadingModelName: string;
  modelSize: string;
  hasVision: boolean;
}> = ({ styles, colors, navigation, loadingModelName, modelSize, hasVision }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Icon name="menu" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Cargando modelo</Text>
        </View>
        <View style={styles.headerActions} />
      </View>
    </View>
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Cargando {loadingModelName}</Text>
      {modelSize ? <Text style={styles.loadingSubtext}>{modelSize}</Text> : null}
      <Text style={styles.loadingHint}>
        Preparando el modelo para la inferencia. Esto puede tardar un momento para modelos grandes.
      </Text>
      {hasVision && <Text style={styles.loadingHint}>Las capacidades de visión serán habilitadas.</Text>}
    </View>
  </View>
);

export const ChatHeader: React.FC<{
  styles: StylesType;
  colors: ColorsType;
  activeConversation: any;
  activeModel: any;
  activeModelName?: string;
  activeImageModel: any;
  navigation: any;
  setShowModelSelector: (v: boolean) => void;
  setShowSettingsPanel: (v: boolean) => void;
  isRemote?: boolean;
  isIncognito?: boolean;
  setIsIncognito?: (v: boolean) => void;
}> = ({ styles, colors, activeConversation, activeModel, activeModelName, activeImageModel, navigation, setShowModelSelector, setShowSettingsPanel, isRemote, isIncognito, setIsIncognito }) => (
  <View style={[styles.header, isIncognito && { backgroundColor: '#1A1A1A', borderBottomColor: '#333' }]}>
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Icon name="menu" size={24} color={isIncognito ? '#FFF' : colors.text} />
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
          <Text 
            style={[styles.headerTitle, { fontSize: 16, flexShrink: 1 }, isIncognito && { color: '#FFF' }]} 
            numberOfLines={1} 
            testID="model-loaded-indicator"
          >
            {activeModelName || activeModel?.name || '⚠️ Ningún modelo'}
          </Text>
          {activeImageModel && (
            <View style={styles.headerImageBadge}>
              <Icon name="image" size={10} color={colors.primary} />
            </View>
          )}
          <Icon name="chevron-down" size={16} color={isIncognito ? '#888' : colors.textMuted} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          onPress={() => setIsIncognito?.(!isIncognito)}
          style={{ marginRight: 12, padding: 4 }}
          testID="toggle-incognito-header"
        >
          <Icon name="eye-off" size={20} color={isIncognito ? "#FFD700" : colors.textMuted} />
        </TouchableOpacity>
        <AttachStep index={16}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettingsPanel(true)} testID="chat-settings-icon">
            <Icon name="sliders" size={16} color={isIncognito ? '#DDD' : colors.textSecondary} />
          </TouchableOpacity>
        </AttachStep>
      </View>
    </View>
  </View>
);

export const EmptyChat: React.FC<{
  styles: StylesType;
  colors: ColorsType;
  activeProject: any;
  setShowProjectSelector: (v: boolean) => void;
  onQuickAction?: (text: string) => void;
}> = ({ styles, colors, activeProject, setShowProjectSelector, onQuickAction }) => {
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
    <View style={[styles.emptyChat, { flex: 1, paddingHorizontal: 20 }]}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        {/* Saludo Principal */}
        <AnimatedEntry index={0} staggerMs={60}>
          <Text style={[styles.emptyChatTitle, { fontSize: 28, fontWeight: '300', marginBottom: 32 }]}>
            {getGreeting()}
          </Text>
        </AnimatedEntry>

        {/* Quick Actions */}
        <AnimatedEntry index={1} staggerMs={60}>
          <View style={{ height: 60, width: '100%', alignItems: 'center' }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 }}
              style={{ flexGrow: 0 }}
            >
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
            </ScrollView>
          </View>
        </AnimatedEntry>

      </View>

      {/* Indicador de Personaje / Proyecto (si aplica) */}
      {activeProject && (
        <AnimatedEntry index={2} staggerMs={60}>
          <TouchableOpacity 
            style={[styles.projectHint, { marginBottom: 20 }]} 
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
                {imagePreviewPath ? 'Refinando imagen' : 'Generando imagen'}
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
              <Text style={styles.imageViewerButtonText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageViewerButton} onPress={onClose}>
              <Icon name="x" size={24} color={colors.text} />
              <Text style={styles.imageViewerButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  </Modal>
);
