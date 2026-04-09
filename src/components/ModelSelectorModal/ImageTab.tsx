import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme, useThemedStyles } from '../../theme';
import { ONNXImageModel, RemoteModel } from '../../types';
import { hardwareService } from '../../services';
import { createAllStyles } from './styles';

export interface ImageTabProps {
  downloadedImageModels: ONNXImageModel[];
  remoteVisionModels: Array<{ serverId: string; serverName: string; models: RemoteModel[] }>;
  activeImageModelId: string | null;
  activeRemoteImageModelId: string | null;
  isAnyLoading: boolean;
  isLoadingImage: boolean;
  onSelectImageModel: (model: ONNXImageModel) => void;
  onSelectRemoteVisionModel: (model: RemoteModel, serverId: string) => void;
  onUnloadImageModel: () => void;
  onImportLocalModel?: () => void;
}

export const ImageTab: React.FC<ImageTabProps> = ({
  downloadedImageModels, remoteVisionModels, activeImageModelId, activeRemoteImageModelId, isAnyLoading, isLoadingImage,
  onSelectImageModel, onUnloadImageModel, onSelectRemoteVisionModel, onImportLocalModel,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createAllStyles);
  const hasLoaded = !!activeImageModelId || !!activeRemoteImageModelId;
  const activeModel = downloadedImageModels.find(m => m.id === activeImageModelId);

  const activeRemoteModelInfo = useMemo(() => {
    if (!activeRemoteImageModelId) return null;
    for (const group of remoteVisionModels) {
      const model = group.models.find(m => m.id === activeRemoteImageModelId);
      if (model) return { model, serverName: group.serverName };
    }
    return null;
  }, [remoteVisionModels, activeRemoteImageModelId]);

  return (
    <>
      {onImportLocalModel && (
        <TouchableOpacity 
          style={styles.importModelItem} 
          onPress={onImportLocalModel}
          disabled={isAnyLoading}
        >
          <View style={styles.importModelIcon}>
            <Icon name="plus" size={18} color={colors.info} />
          </View>
          <Text style={styles.importModelText}>Importar Modelo Local (.zip, .safetensors...)</Text>
        </TouchableOpacity>
      )}

      {hasLoaded && (
        <View style={[styles.loadedSection, styles.loadedSectionImage]}>
          <View style={styles.loadedHeader}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.loadedLabel}>Modelo Cargado</Text>
          </View>
          <View style={styles.loadedModelItem}>
            <View style={styles.loadedModelInfo}>
              <Text style={styles.loadedModelName} numberOfLines={1}>
                {activeModel?.name || activeRemoteModelInfo?.model?.name || 'Desconocido'}
              </Text>
              <Text style={styles.loadedModelMeta}>
                {activeModel
                  ? `${activeModel.style || 'Imagen'} • ${hardwareService.formatBytes(activeModel.size ?? 0)}`
                  : `Remoto • ${activeRemoteModelInfo?.serverName ?? 'Servidor'}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.unloadButton} onPress={onUnloadImageModel} disabled={isAnyLoading}>
              {isLoadingImage ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Icon name="power" size={14} color={colors.error} />
                  <Text style={styles.unloadButtonText}>Liberar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>{hasLoaded ? 'Cambiar Modelo' : 'Modelos Disponibles'}</Text>

      {downloadedImageModels.length === 0 && remoteVisionModels.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="image" size={48} color={`${colors.text}10`} />
          <Text style={styles.emptyTitle}>Sin Modelos de Imagen</Text>
          <Text style={styles.emptyText}>Descarga modelos desde la pestaña de Modelos</Text>
        </View>
      )}

      {downloadedImageModels.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Icon name="hard-drive" size={14} color={colors.textMuted} />
            <Text style={styles.sectionSubTitle}>Locales</Text>
          </View>
          {downloadedImageModels.map((model) => {
            const isCurrent = activeImageModelId === model.id;
            return (
              <TouchableOpacity
                key={model.id}
                style={[styles.modelItem, isCurrent && styles.modelItemSelectedImage]}
                onPress={() => onSelectImageModel(model)}
                disabled={isAnyLoading || isCurrent}
              >
                <View style={styles.modelInfo}>
                  <Text style={[styles.modelName, isCurrent && styles.modelNameSelectedImage]} numberOfLines={1}>
                    {model.name}
                  </Text>
                  <View style={styles.modelMeta}>
                    <Text style={styles.modelSize}>{hardwareService.formatBytes(model.size)}</Text>
                    {!!model.style && (
                      <>
                        <Text style={styles.metaSeparator}>•</Text>
                        <Text style={styles.modelQuant}>{model.style}</Text>
                      </>
                    )}
                  </View>
                </View>
                {isCurrent && (
                  <View style={styles.checkmarkImage}>
                    <Icon name="check" size={14} color={colors.background} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {remoteVisionModels.map(({ serverId, serverName, models }) => (
        <View key={serverId} style={{ marginTop: 12 }}>
          <View style={styles.sectionHeaderRow}>
            <Icon name="globe" size={14} color={colors.textMuted} />
            <Text style={styles.sectionSubTitle}>{serverName}</Text>
          </View>
          {models.map((model) => {
            const isCurrent = activeRemoteImageModelId === model.id;
            return (
              <TouchableOpacity
                key={model.id}
                style={[styles.modelItem, isCurrent && styles.modelItemSelectedImage]}
                onPress={() => onSelectRemoteVisionModel(model, serverId)}
                disabled={isAnyLoading || isCurrent}
              >
                <View style={styles.modelInfo}>
                  <Text style={[styles.modelName, isCurrent && styles.modelNameSelectedImage]} numberOfLines={1}>
                    {model.name}
                  </Text>
                  <View style={styles.modelMeta}>
                    <Text style={styles.remoteBadge}>Remoto</Text>
                    <View style={styles.visionBadge}>
                      <Icon name="eye" size={10} color={colors.info} />
                      <Text style={styles.visionBadgeText}>Vision</Text>
                    </View>
                  </View>
                </View>
                {isCurrent && (
                  <View style={styles.checkmarkImage}>
                    <Icon name="check" size={14} color={colors.background} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </>
  );
};
