import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { useWhisperStore } from '../stores';
import { WHISPER_MODELS } from '../services';

export const VoiceSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const {
    downloadedModelId: whisperModelId,
    isDownloading: isWhisperDownloading,
    downloadProgress: whisperProgress,
    downloadModel: downloadWhisperModel,
    deleteModel: deleteWhisperModel,
    error: whisperError,
    clearError: clearWhisperError,
  } = useWhisperStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voz</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MODELO WHISPER</Text>
          <View style={styles.card}>
            <Text style={styles.description}>
              Habilita la transcripción de voz local. No se envían datos a servidores externos.
            </Text>

            {(() => {
              if (whisperModelId) {
                return (
                  <View style={styles.activeModelContainer}>
                    <View style={styles.modelHeader}>
                      <View>
                        <Text style={styles.activeModelName}>
                          {WHISPER_MODELS.find(m => m.id === whisperModelId)?.name || whisperModelId}
                        </Text>
                        <Text style={styles.activeModelStatus}>INSTALADO</Text>
                      </View>
                      <Icon name="check-circle" size={20} color={colors.primary} />
                    </View>
                    <Button
                      title="Eliminar modelo"
                      variant="outline"
                      size="small"
                      onPress={() => {
                        setAlertState(showAlert(
                          'Eliminar modelo Whisper',
                          'Esto desactivará la entrada de voz hasta que descargues un modelo de nuevo.',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Eliminar',
                              style: 'destructive',
                              onPress: () => {
                                setAlertState(hideAlert());
                                deleteWhisperModel();
                              },
                            },
                          ]
                        ));
                      }}
                      style={styles.removeButton}
                    />
                  </View>
                );
              }
              if (isWhisperDownloading) {
                return (
                  <View style={styles.downloading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.downloadingText}>
                      Descargando... {Math.round(whisperProgress * 100)}%
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${whisperProgress * 100}%` }]}
                      />
                    </View>
                  </View>
                );
              }
              return (
                <View style={styles.modelList}>
                  {WHISPER_MODELS.slice(0, 3).map((model, index) => (
                    <TouchableOpacity
                      key={model.id}
                      style={[
                        styles.modelOption,
                        index === 2 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => downloadWhisperModel(model.id)}
                    >
                      <View style={styles.modelOptionHeader}>
                        <Text style={styles.modelOptionName}>{model.name}</Text>
                        <Text style={styles.modelOptionSize}>{model.size} MB</Text>
                      </View>
                      <Text style={styles.modelOptionDesc}>{model.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}

            {whisperError && (
              <TouchableOpacity onPress={clearWhisperError}>
                <Text style={styles.errorText}>{whisperError}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.infoCard}>
          <Icon name="shield" size={16} color={colors.primary} style={{ marginTop: 2, marginRight: 12 }} />
          <Text style={styles.infoText}>
            La transcripción ocurre enteramente en tu dispositivo. Tu audio nunca se envía a ningún servidor.
          </Text>
        </View>
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

const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  backButton: {
    marginRight: SPACING.md,
    padding: 4,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: 12,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: SPACING.lg,
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  activeModelContainer: {
    padding: SPACING.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
  },
  modelHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: SPACING.md,
  },
  activeModelName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
  },
  activeModelStatus: {
    ...TYPOGRAPHY.meta,
    fontSize: 10,
    color: colors.primary,
    marginTop: 2,
  },
  removeButton: {
    borderColor: colors.error,
    borderRadius: 12,
  },
  downloading: {
    alignItems: 'center' as const,
    paddingVertical: SPACING.md,
  },
  downloadingText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginTop: SPACING.sm,
  },
  progressBar: {
    width: '100%' as const,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: SPACING.md,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%' as const,
    backgroundColor: colors.primary,
  },
  modelList: {
    marginTop: -SPACING.md,
  },
  modelOption: {
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modelOptionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  modelOptionName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
  },
  modelOptionSize: {
    ...TYPOGRAPHY.meta,
    color: colors.primary,
  },
  modelOptionDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    lineHeight: 16,
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.error,
    marginTop: SPACING.md,
    textAlign: 'center' as const,
  },
  infoCard: {
    flexDirection: 'row' as const,
    padding: SPACING.lg,
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    alignItems: 'flex-start' as const,
  },
  infoText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
});
