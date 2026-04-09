import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { useTheme, useThemedStyles } from '../theme';
import { SPACING } from '../constants';
import { useAppStore, useChatStore } from '../stores';
import { hardwareService, modelManager } from '../services';
import { OrphanedFilesSection } from './OrphanedFilesSection';
import { createStyles } from './StorageSettingsScreen.styles';

export const StorageSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [storageUsed, setStorageUsed] = useState(0);
  const [availableStorage, setAvailableStorage] = useState(0);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);

  const {
    downloadedModels,
    downloadedImageModels,
    activeBackgroundDownloads,
    setBackgroundDownload,
  } = useAppStore();
  const { conversations } = useChatStore();

  const imageStorageUsed = downloadedImageModels.reduce((total, m) => total + (m.size || 0), 0);

  const staleDownloads = Object.entries(activeBackgroundDownloads).filter(([_, info]) => {
    return !info?.modelId || !info?.fileName || !info?.totalBytes;
  });

  const loadStorageInfo = useCallback(async () => {
    const used = await modelManager.getStorageUsed();
    const available = await modelManager.getAvailableStorage();
    setStorageUsed(used + imageStorageUsed);
    setAvailableStorage(available);
  }, [imageStorageUsed]);

  useEffect(() => {
    loadStorageInfo();
  }, [loadStorageInfo]);

  const handleClearStaleDownload = useCallback(
    (downloadId: number) => {
      setBackgroundDownload(downloadId, null);
    },
    [setBackgroundDownload],
  );

  const handleClearAllStaleDownloads = useCallback(() => {
    setAlertState(
      showAlert(
        'Limpiar descargas obsoletas',
        `¿Limpiar ${staleDownloads.length} entrada(s) de descarga obsoleta(s)?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Limpiar todo',
            style: 'destructive',
            onPress: () => {
              setAlertState(hideAlert());
              for (const [downloadId] of staleDownloads) {
                setBackgroundDownload(Number(downloadId), null);
              }
            },
          },
        ],
      ),
    );
  }, [staleDownloads, setBackgroundDownload]);

  const totalStorage = storageUsed + availableStorage;
  const usedPercentage = totalStorage > 0 ? (storageUsed / totalStorage) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Almacenamiento</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>USO DE ALMACENAMIENTO</Text>
          <View style={styles.card}>
            <View style={styles.storageBar}>
              <View style={[styles.storageUsed, { width: `${Math.min(usedPercentage, 100)}%` }]} />
            </View>
            <View style={styles.storageLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Usado: {hardwareService.formatBytes(storageUsed)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.surfaceLight }]} />
                <Text style={styles.legendText}>Libre: {hardwareService.formatBytes(availableStorage)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DESGLOSE</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Icon name="cpu" size={16} color={colors.primary} />
                <Text style={styles.infoLabel}>Modelos LLM</Text>
              </View>
              <Text style={styles.infoValue}>{downloadedModels.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Icon name="image" size={16} color={colors.primary} />
                <Text style={styles.infoLabel}>Modelos de imagen</Text>
              </View>
              <Text style={styles.infoValue}>{downloadedImageModels.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Icon name="hard-drive" size={16} color={colors.primary} />
                <Text style={styles.infoLabel}>Peso en disco</Text>
              </View>
              <Text style={styles.infoValue}>{hardwareService.formatBytes(storageUsed)}</Text>
            </View>
            <View style={[styles.infoRow, styles.lastRow]}>
              <View style={styles.infoRowLeft}>
                <Icon name="message-circle" size={16} color={colors.primary} />
                <Text style={styles.infoLabel}>Conversaciones</Text>
              </View>
              <Text style={styles.infoValue}>{conversations.length}</Text>
            </View>
          </View>
        </View>

        {downloadedModels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MODELOS LLM</Text>
            <View style={styles.card}>
              {downloadedModels.map((model, index) => (
                <View
                  key={model.id}
                  style={[styles.modelRow, index === downloadedModels.length - 1 && styles.lastRow]}
                >
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelName} numberOfLines={1}>{model.name}</Text>
                    <Text style={styles.modelMeta}>{model.quantization}</Text>
                  </View>
                  <Text style={styles.modelSize}>{hardwareService.formatModelSize(model)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {downloadedImageModels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MODELOS DE IMAGEN</Text>
            <View style={styles.card}>
              {downloadedImageModels.map((model, index) => (
                <View
                  key={model.id}
                  style={[styles.modelRow, index === downloadedImageModels.length - 1 && styles.lastRow]}
                >
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelName} numberOfLines={1}>{model.name}</Text>
                    <Text style={styles.modelMeta}>
                      {(() => {
                        if (model.backend === 'coreml') return 'Core ML';
                        if (model.backend === 'qnn') return 'Qualcomm NPU';
                        return 'GPU';
                      })()}
                    </Text>
                  </View>
                  <Text style={styles.modelSize}>{hardwareService.formatBytes(model.size)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {staleDownloads.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>DESCARGAS OBSOLETAS</Text>
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={handleClearAllStaleDownloads}
              >
                <Text style={styles.clearAllText}>Limpiar todo</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              {staleDownloads.map(([downloadId, info], index) => (
                <View 
                  key={downloadId} 
                  style={[styles.orphanedRow, index === staleDownloads.length - 1 && styles.lastRow]}
                >
                  <View style={styles.orphanedInfo}>
                    <Text style={styles.orphanedName}>Descarga #{downloadId}</Text>
                    <Text style={styles.orphanedMeta}>
                      {info?.fileName ?? 'Archivo desconocido'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleClearStaleDownload(Number(downloadId))}
                  >
                    <Icon name="x" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <OrphanedFilesSection onStorageChange={loadStorageInfo} />

        <Text style={styles.hint}>
          Puedes gestionar tus modelos desde la pestaña principal.
        </Text>
      </ScrollView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={() => setAlertState(hideAlert())}
      />
    </SafeAreaView>

  );
};
