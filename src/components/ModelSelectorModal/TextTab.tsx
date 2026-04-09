import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme, useThemedStyles } from '../../theme';
import { DownloadedModel, RemoteModel } from '../../types';
import { hardwareService } from '../../services';
import { createAllStyles } from './styles';

export interface TextTabProps {
  downloadedModels: DownloadedModel[];
  remoteModels: Array<{ serverId: string; serverName: string; models: RemoteModel[] }>;
  currentModelPath: string | null;
  currentRemoteModelId: string | null;
  isAnyLoading: boolean;
  onSelectModel: (model: DownloadedModel) => void;
  onSelectRemoteModel: (model: RemoteModel, serverId: string) => void;
  onUnloadModel: () => void;
  onAddServer: () => void;
}

export const TextTab: React.FC<TextTabProps> = ({
  downloadedModels, remoteModels, currentModelPath, currentRemoteModelId, isAnyLoading, onSelectModel, onUnloadModel, onSelectRemoteModel, onAddServer,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createAllStyles);
  const hasLoaded = currentModelPath !== null || currentRemoteModelId !== null;
  const activeLocalModel = downloadedModels.find(m => m.filePath === currentModelPath);

  const activeRemoteModelInfo = useMemo(() => {
    if (!currentRemoteModelId) return null;
    for (const group of remoteModels) {
      const model = group.models.find(m => m.id === currentRemoteModelId);
      if (model) return { model, serverName: group.serverName };
    }
    return null;
  }, [remoteModels, currentRemoteModelId]);

  return (
    <>
      {hasLoaded && (
        <View style={styles.loadedSection}>
          <View style={styles.loadedHeader}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.loadedLabel}>Modelo Cargado</Text>
          </View>
          <View style={styles.loadedModelItem}>
            <View style={styles.loadedModelInfo}>
              <Text style={styles.loadedModelName} numberOfLines={1}>
                {activeLocalModel?.name || activeRemoteModelInfo?.model?.name || 'Desconocido'}
              </Text>
              <Text style={styles.loadedModelMeta}>
                {activeLocalModel
                  ? `${activeLocalModel.quantization} • ${hardwareService.formatModelSize(activeLocalModel)}`
                  : `Remoto • ${activeRemoteModelInfo?.serverName ?? 'Servidor'}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.unloadButton} onPress={onUnloadModel} disabled={isAnyLoading}>
              <Icon name="power" size={14} color={colors.error} />
              <Text style={styles.unloadButtonText}>Liberar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.switchModelRow}>
        <Text style={styles.sectionTitle}>{hasLoaded ? 'Cambiar Modelo' : 'Modelos Disponibles'}</Text>
        <TouchableOpacity style={styles.addServerInline} onPress={onAddServer} disabled={isAnyLoading}>
          <Icon name="plus" size={12} color={colors.primary} />
          <Text style={styles.addServerInlineText}>Añadir Servidor</Text>
        </TouchableOpacity>
      </View>

      {downloadedModels.length === 0 && remoteModels.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="package" size={48} color={`${colors.text}10`} />
          <Text style={styles.emptyTitle}>Sin Modelos</Text>
          <Text style={styles.emptyText}>Descarga modelos desde la pestaña de Modelos</Text>
        </View>
      )}

      {downloadedModels.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Icon name="hard-drive" size={14} color={colors.textMuted} />
            <Text style={styles.sectionSubTitle}>Modelos Locales</Text>
          </View>
          {downloadedModels.map((model) => {
            const isCurrent = currentModelPath === model.filePath;
            return (
              <TouchableOpacity
                key={model.id}
                style={[styles.modelItem, isCurrent && styles.modelItemSelected]}
                onPress={() => onSelectModel(model)}
                disabled={isAnyLoading || isCurrent}
              >
                <View style={styles.modelInfo}>
                  <Text style={[styles.modelName, isCurrent && styles.modelNameSelected]} numberOfLines={1}>
                    {model.name}
                  </Text>
                  <View style={styles.modelMeta}>
                    <Text style={styles.modelSize}>{hardwareService.formatModelSize(model)}</Text>
                    {!!model.quantization && (
                      <>
                        <Text style={styles.metaSeparator}>•</Text>
                        <Text style={styles.modelQuant}>{model.quantization}</Text>
                      </>
                    )}
                    {model.isVisionModel && (
                      <View style={styles.visionBadge}>
                        <Icon name="eye" size={10} color={colors.info} />
                        <Text style={styles.visionBadgeText}>Vision</Text>
                      </View>
                    )}
                  </View>
                </View>
                {isCurrent && (
                  <View style={styles.checkmark}>
                    <Icon name="check" size={14} color={colors.background} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {remoteModels.map(({ serverId, serverName, models }) => (
        <View key={serverId} style={{ marginTop: 12 }}>
          <View style={styles.sectionHeaderRow}>
            <Icon name="wifi" size={14} color={colors.textMuted} />
            <Text style={styles.sectionSubTitle}>{serverName}</Text>
          </View>
          {models.map((model) => {
            const isCurrent = currentRemoteModelId === model.id;
            return (
              <TouchableOpacity
                key={model.id}
                style={[styles.modelItem, isCurrent && styles.modelItemSelectedRemote]}
                onPress={() => onSelectRemoteModel(model, serverId)}
                disabled={isAnyLoading || isCurrent}
              >
                <View style={styles.modelInfo}>
                  <Text style={[styles.modelName, isCurrent && styles.modelNameSelectedRemote]} numberOfLines={1}>
                    {model.name}
                  </Text>
                  <View style={styles.modelMeta}>
                    <Text style={styles.remoteBadge}>Remoto</Text>
                    {model.capabilities.supportsVision && (
                      <View style={styles.visionBadge}>
                        <Icon name="eye" size={10} color={colors.info} />
                        <Text style={styles.visionBadgeText}>Vision</Text>
                      </View>
                    )}
                    {model.capabilities.supportsToolCalling && (
                      <View style={styles.toolBadge}>
                        <Icon name="tool" size={10} color={colors.warning} />
                      </View>
                    )}
                    {model.capabilities.supportsThinking && (
                      <View style={styles.thinkingBadge}>
                        <Icon name="zap" size={10} color="#8B5CF6" />
                        <Text style={styles.thinkingBadgeText}>Thinking</Text>
                      </View>
                    )}
                  </View>
                </View>
                {isCurrent && (
                  <View style={styles.checkmarkRemote}>
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
