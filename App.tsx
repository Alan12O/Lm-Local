/**
  LM-Local la aplicacion para correr modelos de forma local
  Provacidad total, no se requiere internet para funcionar
 */

import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet, LogBox, PermissionsAndroid, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation';
import { useTheme } from './src/theme';
import { hardwareService, modelManager, authService, ragService, remoteServerManager, activeModelService } from './src/services';
import { localDreamGeneratorService } from './src/services/localDreamGenerator';
import logger from './src/utils/logger';
import { useAppStore, useAuthStore, useRemoteServerStore } from './src/stores';
import { LockScreen } from './src/screens';
import { useAppState } from './src/hooks/useAppState';

LogBox.ignoreAllLogs(); // Suppress all logs

const ensureRemoteServerStoreHydrated = async () => {
  const persistApi = useRemoteServerStore.persist;
  if (!persistApi?.hasHydrated || !persistApi.rehydrate) return;
  if (!persistApi.hasHydrated()) {
    await persistApi.rehydrate();
  }
};

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);
  const setModelRecommendation = useAppStore((s) => s.setModelRecommendation);
  const setDownloadedModels = useAppStore((s) => s.setDownloadedModels);
  const setDownloadedImageModels = useAppStore((s) => s.setDownloadedImageModels);
  const clearImageModelDownloading = useAppStore((s) => s.clearImageModelDownloading);

  const { colors, isDark } = useTheme();

  const {
    isEnabled: authEnabled,
    isLocked,
    setLocked,
    setLastBackgroundTime,
  } = useAuthStore();

  // Handle app state changes for auto-lock and model lifecycle
  useAppState({
    onBackground: useCallback(() => {
      if (authEnabled) {
        setLastBackgroundTime(Date.now());
        setLocked(true);
      }

      // Liberar el contexto GPU de memoria cuando pasamos a background (Android fix)
      const currentModelId = useAppStore.getState().activeModelId;
      if (currentModelId) {
        logger.log('[App] App background: Evicting text model to prevent GPU context crash.');
        // evictTextModel removes from memory without changing activeModelId in store
        activeModelService.evictTextModel().catch((e: Error) => {
          logger.error('[App] Failed to evict model in background:', e.message);
        });
      }

      // Descargar el servidor de imágenes al pasar a background.
      // Android mata el proceso hijo C++ cuando la app pasa a background,
      // por lo que debemos hacer unloadModel() explícitamente para que
      // localDreamGeneratorService limpie su estado interno (loadedThreads=null).
      // Sin esto, al volver, JS cree que el servidor sigue vivo y no lo recarga.
      // IMPORTANT: We must await this to ensure the DSP/FastRPC handles are fully
      // released before the OS freezes our process. Fire-and-forget causes the
      // Hexagon DSP to be left in a corrupted state (DMA abort on next use).
      (async () => {
        try {
          await localDreamGeneratorService.unloadModel();
          logger.log('[App] Image backend fully stopped before background.');
        } catch (e: any) {
          logger.log('[App] Image model cleanup on background (expected):', e.message);
        }
      })();
    }, [authEnabled, setLastBackgroundTime, setLocked]),

    onForeground: useCallback(() => {
      // Autoreload disabled to prevent GPU context crashes on Android.
      // The user will be prompted to reload manually via the UI.
      logger.log('[App] App foreground: Skipping auto-restore to ensure GPU stability.');
    }, []),
  });

  useEffect(() => {
    initializeApp();

  }, []);

  const ensureAppStoreHydrated = async () => {
    const persistApi = useAppStore.persist;
    if (!persistApi?.hasHydrated || !persistApi.rehydrate) return;
    if (!persistApi.hasHydrated()) {
      await persistApi.rehydrate();
    }
  };

  const initializeApp = async () => {
    try {
      // Ensure persisted download metadata is loaded before restore logic reads it.
      await ensureAppStoreHydrated();

      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        } catch (err) {
          logger.error('[App] Failed to request POST_NOTIFICATIONS:', err);
        }
      }

      // Phase 1: Quick initialization - get app ready to show UI
      // Initialize hardware detection
      const deviceInfo = await hardwareService.getDeviceInfo();
      setDeviceInfo(deviceInfo);

      const recommendation = hardwareService.getModelRecommendation();
      setModelRecommendation(recommendation);

      // Initialize model manager and load downloaded models list
      await modelManager.initialize();

      // Clean up any mmproj files that were incorrectly added as standalone models
      await modelManager.cleanupMMProjEntries();

      // Wire up background download metadata persistence
      const {
        setBackgroundDownload,
        activeBackgroundDownloads,
        addDownloadedModel,
        setDownloadProgress,
      } = useAppStore.getState();
      modelManager.setBackgroundDownloadMetadataCallback((downloadId, info) => {
        setBackgroundDownload(downloadId, info);
      });

      // Recover any background downloads that completed while app was dead
      try {
        const recoveredModels = await modelManager.syncBackgroundDownloads(
          activeBackgroundDownloads,
          (downloadId) => setBackgroundDownload(downloadId, null)
        );
        for (const model of recoveredModels) {
          addDownloadedModel(model);
          logger.log('[App] Recovered background download:', model.name);
        }
      } catch (err) {
        logger.error('[App] Failed to sync background downloads:', err);
      }

      // Recover completed image downloads (zip unzip / multifile finalization)
      try {
        const recoveredImageModels = await modelManager.syncCompletedImageDownloads(
          activeBackgroundDownloads,
          (downloadId) => setBackgroundDownload(downloadId, null),
        );
        for (const model of recoveredImageModels) {
          logger.log('[App] Recovered image download:', model.name);
        }
      } catch (err) {
        logger.error('[App] Failed to sync completed image downloads:', err);
      }

      // Re-wire event listeners for downloads that were still running when the
      // app was killed (running/pending status in Android DownloadManager).
      try {
        const restoredDownloadIds = await modelManager.restoreInProgressDownloads(
          activeBackgroundDownloads,
          (progress) => {
            const key = `${progress.modelId}/${progress.fileName}`;
            setDownloadProgress(key, {
              progress: progress.progress,
              bytesDownloaded: progress.bytesDownloaded,
              totalBytes: progress.totalBytes,
            });
          },
        );
        for (const downloadId of restoredDownloadIds) {
          const metadata = activeBackgroundDownloads[downloadId];
          const progressKey = metadata ? `${metadata.modelId}/${metadata.fileName}` : null;
          modelManager.watchDownload(
            downloadId,
            (model) => {
              if (progressKey) setDownloadProgress(progressKey, null);
              addDownloadedModel(model);
              logger.log('[App] Restored in-progress download completed:', model.name);
            },
            (error) => {
              if (progressKey) setDownloadProgress(progressKey, null);
              logger.error('[App] Restored in-progress download failed:', error);
            },
          );
        }
      } catch (err) {
        logger.error('[App] Failed to restore in-progress downloads:', err);
      }

      // Clear any stale imageModelDownloading entries — if the app was killed
      // mid-download these would be persisted as "downloading" forever.
      clearImageModelDownloading();

      // Carga inicial de modelos desde AsyncStorage (sin scan del filesystem)
      // — solo para tener algo en pantalla lo antes posible.
      // El scan completo del filesystem ocurre más tarde de forma no-bloqueante.
      const fastTextModels = await modelManager.getDownloadedModels();
      const fastImageModels = await modelManager.getDownloadedImageModels();
      setDownloadedModels(fastTextModels);
      setDownloadedImageModels(fastImageModels);

      // Ensure remote server store is hydrated before initializing providers,
      // so getServers() / activeServerId reads see persisted data.
      await ensureRemoteServerStoreHydrated();

      // Initialize remote server providers in the background — don't block
      // the home screen while fetching models from potentially unreachable servers.
      remoteServerManager.initializeProviders().catch((err) => {
        logger.error('[App] Failed to initialize remote server providers:', err);
      });

      // Check if passphrase is set and lock app if needed
      const hasPassphrase = await authService.hasPassphrase();
      if (hasPassphrase && authEnabled) {
        setLocked(true);
      }

      // Initialize RAG database tables
      ragService.ensureReady().catch((err) => logger.error('Failed to initialize RAG service on startup', err));

      // Bug #2 fix: Mostrar la UI inmediatamente despues de la inicializacion basica
      // El scan de modelos locales se ejecuta en background para no bloquear la pantalla
      setIsInitializing(false);

      // Scan en background — no bloquea el arranque
      modelManager.refreshModelLists()
        .then(({ textModels, imageModels }) => {
          setDownloadedModels(textModels);
          setDownloadedImageModels(imageModels);
        })
        .catch((err) => {
          logger.error('[App] Failed to refresh model lists (non-blocking):', err);
        });

      // Models are loaded on-demand when the user opens a chat,
      // not eagerly on startup, to avoid freezing the UI.
    } catch (error) {
      logger.error('[App] Error initializing app:', error);
      setIsInitializing(false);
    }
  };

  const handleUnlock = useCallback(() => {
    setLocked(false);
  }, [setLocked]);

  if (isInitializing) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]} testID="app-loading">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Show lock screen if auth is enabled and app is locked
  if (authEnabled && isLocked) {
    return (
      <GestureHandlerRootView style={styles.flex} testID="app-locked">
        <SafeAreaProvider>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
          <LockScreen onUnlock={handleUnlock} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <NavigationContainer
          theme={{
            dark: isDark,
            colors: {
              primary: colors.primary,
              background: colors.background,
              card: colors.surface,
              text: colors.text,
              border: colors.border,
              notification: colors.primary,
            },
            fonts: {
              regular: {
                fontFamily: 'System',
                fontWeight: '400',
              },
              medium: {
                fontFamily: 'System',
                fontWeight: '500',
              },
              bold: {
                fontFamily: 'System',
                fontWeight: '700',
              },
              heavy: {
                fontFamily: 'System',
                fontWeight: '900',
              },
            },
          }}
        >
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
