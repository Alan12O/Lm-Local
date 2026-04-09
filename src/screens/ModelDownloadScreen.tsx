import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, ModelCard } from '../components';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { RemoteServerModal } from '../components/RemoteServerModal';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { RECOMMENDED_MODELS, TYPOGRAPHY, SPACING } from '../constants';
import { useAppStore } from '../stores';
import { useRemoteServerStore } from '../stores/remoteServerStore';
import { hardwareService, modelManager, remoteServerManager, backgroundDownloadService } from '../services';
import { discoverLANServers } from '../services/networkDiscovery';
import { ModelFile, DownloadedModel, RemoteServer } from '../types';
import { RootStackParamList } from '../navigation/types';
import { fetchModelFiles, NetworkSection } from './ModelDownloadHelpers';
import logger from '../utils/logger';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'ModelDownload'> };

export const ModelDownloadScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [recommendedModels, setRecommendedModels] = useState<typeof RECOMMENDED_MODELS>([]);
  const [modelFiles, setModelFiles] = useState<Record<string, ModelFile[]>>({});
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const [connectingServerId, setConnectingServerId] = useState<string | null>(null);
  const [connectedServerId, setConnectedServerId] = useState<string | null>(null);
  const [reachableServerIds, setReachableServerIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(true);
  const [showServerModal, setShowServerModal] = useState(false);
  const healthCheckInFlight = useRef(false);

  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { deviceInfo, setDeviceInfo, setModelRecommendation, downloadProgress, setDownloadProgress, addDownloadedModel } = useAppStore();
  const servers = useRemoteServerStore((s) => s.servers);
  const discoveredModels = useRemoteServerStore((s) => s.discoveredModels);

  // Init hardware + model recommendations
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await hardwareService.getDeviceInfo();
        if (cancelled) return;
        setDeviceInfo(info);
        const rec = hardwareService.getModelRecommendation();
        if (cancelled) return;
        setModelRecommendation(rec);
        const ram = hardwareService.getTotalMemoryGB();
        const compat = RECOMMENDED_MODELS.filter((m) => m.minRam <= ram);
        if (cancelled) return;
        setRecommendedModels(compat);
        const files = await fetchModelFiles(compat);
        if (!cancelled) setModelFiles(files);
      } catch (error) {
        logger.error('Error initializing:', error);
        if (!cancelled) setAlertState(showAlert('Error', 'Error al inicializar. Por favor, intenta de nuevo.'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Health-check persisted servers — only show reachable ones
  const refreshServerHealth = useCallback(async (): Promise<Set<string>> => {
    if (healthCheckInFlight.current) return new Set<string>();
    healthCheckInFlight.current = true;
    setIsCheckingNetwork(true);
    const store = useRemoteServerStore.getState();
    const reachable = new Set<string>();
    await Promise.all(
      store.servers.map(async (server) => {
        try {
          const result = await store.testConnection(server.id);
          if (result.success) reachable.add(server.id);
        } catch { /* offline */ }
      }),
    );
    setReachableServerIds(reachable);
    setIsCheckingNetwork(false);
    healthCheckInFlight.current = false;
    return reachable;
  }, []);

  useEffect(() => { refreshServerHealth(); }, [servers.length, refreshServerHealth]);

  // Scan network handler
  const handleScanNetwork = useCallback(async () => {
    setIsScanning(true);
    try {
      const discovered = await discoverLANServers();
      const store = useRemoteServerStore.getState();
      const existing = new Set(store.servers.map(s => s.endpoint.replace(/\/$/, '')));
      for (const d of discovered) {
        if (existing.has(d.endpoint.replace(/\/$/, ''))) continue;
        await remoteServerManager.addServer({ name: d.name, endpoint: d.endpoint, providerType: 'openai-compatible' });
      }
      const reachable = await refreshServerHealth();
      // Only alert if there are truly no reachable servers after the scan
      if (reachable.size === 0) {
        setAlertState(showAlert('No se encontraron servidores', 'Asegúrate de estar en la misma red WiFi que tu servidor y que esté funcionando.'));
      }
    } catch (e) {
      logger.warn('[ModelDownload] Scan failed:', (e as Error).message);
      setAlertState(showAlert('Escaneo fallido', 'No se pudo escanear tu red. Asegúrate de estar conectado a WiFi.'));
    } finally {
      setIsScanning(false);
    }
  }, [refreshServerHealth]);

  const handleDownload = async (modelId: string, file: ModelFile) => {
    const key = `${modelId}/${file.name}`;

    // Fix: Ensure we have permissions and battery optimization sorted before starting
    try {
      await backgroundDownloadService.requestNotificationPermission();
      await backgroundDownloadService.checkAndPromptBatteryOptimization();
    } catch (e) {
      logger.warn('[ModelDownload] Pre-download checks failed:', e);
    }

    setDownloadProgress(key, { progress: 0, bytesDownloaded: 0, totalBytes: file.size || 0 });
    const onError = (error: Error) => { setDownloadProgress(key, null); setAlertState(showAlert('Error de descarga', error.message)); };
    try {
      const info = await modelManager.downloadModelBackground(modelId, file, (p) => setDownloadProgress(key, p));
      modelManager.watchDownload(info.downloadId, (model: DownloadedModel) => {
        setDownloadProgress(key, null);
        addDownloadedModel(model);
        setAlertState(showAlert('¡Descarga completa!', `${model.name} se ha descargado correctamente.`, [{ text: 'OK' }]));
      }, onError);
    } catch (error) { onError(error as Error); }
  };

  const handleOpenRepo = (modelId: string) => {
    if (!modelId) return;

    // Si es un modelo descargado (autor/repo/archivo), extraemos solo autor/repo
    const parts = modelId.split('/');
    const repoSlug = parts.length > 2 ? `${parts[0]}/${parts[1]}` : modelId;

    const url = `https://huggingface.co/${repoSlug}`;
    Linking.openURL(url).catch((err) => {
      logger.error('[ModelDownload] Failed to open repo URL:', err);
      setAlertState(showAlert('Error', 'No se pudo abrir el enlace del repositorio.'));
    });
  };

  const handleConnectServer = async (server: RemoteServer) => {
    setConnectingServerId(server.id);
    try {
      const result = await remoteServerManager.testConnection(server.id);
      if (result.success) {
        setConnectedServerId(server.id);
        const models = discoveredModels[server.id] || result.models || [];
        if (models.length === 0) {
          setAlertState(showAlert(
            'Conectado — No se encontraron modelos',
            `${server.name} es accesible pero no tiene modelos cargados. Inicia un modelo en Ollama/LM Studio y vuelve a conectarte.`,
          ));
          return;
        }
        const textModel = models.find(m => !m.capabilities.supportsVision) || models[0];
        if (textModel) await remoteServerManager.setActiveRemoteTextModel(server.id, textModel.id);
        setAlertState(showAlert(
          '¡Conectado!',
          `${server.name} está listo con ${models.length} modelo${models.length !== 1 ? 's' : ''}. Puedes empezar a chatear ahora.`,
          [{ text: 'Continuar', onPress: () => { setAlertState(hideAlert()); navigation.replace('Main'); } }],
        ));
      } else {
        setAlertState(showAlert('Conexión fallida', result.error || 'No se pudo conectar al servidor.'));
      }
    } catch (e) {
      setAlertState(showAlert('Conexión fallida', (e as Error).message));
    } finally {
      setConnectingServerId(null);
    }
  };

  const handleServerSaved = useCallback(() => {
    setShowServerModal(false);
    refreshServerHealth();
  }, [refreshServerHealth]);

  const totalRamGB = hardwareService.getTotalMemoryGB();
  const liveServers = servers.filter((s) => reachableServerIds.has(s.id));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View testID="model-download-loading" style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analizando tu dispositivo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View testID="model-download-screen" style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Configura tu IA</Text>
            <Text style={styles.subtitle}>
              Conéctate a un servidor de modelos en tu red, o descarga uno para ejecutarlo directamente en tu dispositivo.
            </Text>
          </View>

          <NetworkSection
            servers={liveServers}
            discoveredModels={discoveredModels}
            connectingServerId={connectingServerId}
            connectedServerId={connectedServerId}
            isCheckingNetwork={isCheckingNetwork}
            isScanning={isScanning}
            onConnectServer={handleConnectServer}
            onScanNetwork={handleScanNetwork}
            onAddManually={() => setShowServerModal(true)}
            colors={colors}
          />

          <Text style={styles.sectionTitle}>Descargar a tu dispositivo</Text>

          <Card style={styles.deviceCard}>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Tu dispositivo</Text>
              <Text style={styles.deviceValue}>{deviceInfo?.deviceModel}</Text>
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Memoria disponible</Text>
              <Text style={styles.deviceValue}>{hardwareService.formatBytes(deviceInfo?.availableMemory || 0)}</Text>
            </View>
          </Card>

          {recommendedModels.map((model, index) => {
            const files = modelFiles[model.id] || [];
            const recFile = files[0];
            const key = recFile ? `${model.id}/${recFile.name}` : '';
            const progress = downloadProgress[key];
            return (
              <ModelCard
                key={model.id}
                testID={`recommended-model-${index}`}
                compact
                model={{ id: model.id, name: model.name, author: model.id.split('/')[0], description: model.description, modelType: model.type, paramCount: model.params, minRamGB: model.minRam }}
                file={recFile}
                isDownloading={!!progress}
                downloadProgress={progress?.progress}
                isCompatible={model.minRam <= totalRamGB}
                onPress={() => {}}
                onDownload={recFile ? () => handleDownload(model.id, recFile) : undefined}
                onOpenRepo={() => handleOpenRepo(model.id)}
              />
            );
          })}

          {recommendedModels.length === 0 && (
            <Card style={styles.warningCard}>
              <Text style={styles.warningTitle}>Compatibilidad limitada</Text>
              <Text style={styles.warningText}>
                Tu dispositivo tiene memoria limitada. Aún puedes buscar y descargar modelos más pequeños desde el explorador de modelos.
              </Text>
            </Card>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Omitir por ahora" variant="ghost" onPress={() => navigation.replace('Main')} testID="model-download-skip" />
        </View>

        <CustomAlert visible={alertState.visible} title={alertState.title} message={alertState.message} buttons={alertState.buttons} onClose={() => setAlertState(hideAlert())} />
        <RemoteServerModal visible={showServerModal} onClose={() => setShowServerModal(false)} onSave={handleServerSaved} />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors, _shadows: ThemeShadows) => ({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 16 },
  loadingText: { ...TYPOGRAPHY.body, color: colors.textSecondary, textAlign: 'center' as const },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: SPACING.xl },
  title: { ...TYPOGRAPHY.h2, color: colors.text, marginBottom: 8 },
  subtitle: { ...TYPOGRAPHY.body, color: colors.textSecondary, lineHeight: 24 },
  sectionTitle: { ...TYPOGRAPHY.h2, color: colors.text, marginBottom: SPACING.lg },
  deviceCard: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: SPACING.xl },
  deviceInfo: { flex: 1 },
  deviceLabel: { ...TYPOGRAPHY.meta, color: colors.textMuted, marginBottom: 4 },
  deviceValue: { ...TYPOGRAPHY.body, color: colors.text },
  warningCard: { backgroundColor: `${colors.warning}20`, borderWidth: 1, borderColor: colors.warning },
  warningTitle: { ...TYPOGRAPHY.h3, color: colors.warning, marginBottom: 8 },
  warningText: { ...TYPOGRAPHY.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  footer: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
