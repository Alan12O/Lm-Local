import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { useAuthStore } from '../stores';
import { authService } from '../services';
import { PassphraseSetupScreen } from './PassphraseSetupScreen';

export const SecuritySettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [showPassphraseSetup, setShowPassphraseSetup] = useState(false);
  const [isChangingPassphrase, setIsChangingPassphrase] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    isEnabled: authEnabled,
    setEnabled: setAuthEnabled,
  } = useAuthStore();

  const handleTogglePassphrase = async () => {
    if (authEnabled) {
      setAlertState(showAlert(
        'Desactivar bloqueo por contraseña',
        '¿Estás seguro de que quieres desactivar la protección por contraseña?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desactivar',
            style: 'destructive',
            onPress: () => {
              setAlertState(hideAlert());
              authService.removePassphrase().then(() => {
                setAuthEnabled(false);
              }).catch(() => {});
            },
          },
        ]
      ));
    } else {
      setIsChangingPassphrase(false);
      setShowPassphraseSetup(true);
    }
  };

  const handleChangePassphrase = () => {
    setIsChangingPassphrase(true);
    setShowPassphraseSetup(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seguridad</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BLOQUEO</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.itemTitle}>Bloqueo por contraseña</Text>
                <Text style={styles.itemDesc}>Requerir contraseña para abrir la aplicación</Text>
              </View>
              <Switch
                value={authEnabled}
                onValueChange={handleTogglePassphrase}
                trackColor={{ false: colors.surfaceLight, true: `${colors.primary}80` }}
                thumbColor={authEnabled ? colors.primary : colors.textMuted}
              />
            </View>

            {authEnabled && (
              <View style={styles.buttonContainer}>
                <Button
                  title="Cambiar contraseña"
                  variant="outline"
                  size="small"
                  onPress={handleChangePassphrase}
                  icon={<Icon name="edit-2" size={14} color={colors.primary} />}
                  style={{ borderColor: colors.primary, borderRadius: 12 }}
                />
              </View>
            )}
          </View>
        </View>

        <View style={styles.infoCard}>
          <Icon name="info" size={16} color={colors.textMuted} style={{ marginTop: 2, marginRight: 12 }} />
          <Text style={styles.infoText}>
            Cuando está activado, la aplicación se bloqueará automáticamente al salir o cerrarla. Tu contraseña se guarda de forma segura en el dispositivo.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showPassphraseSetup}
        animationType="slide"
        onRequestClose={() => setShowPassphraseSetup(false)}
      >
        <PassphraseSetupScreen
          isChanging={isChangingPassphrase}
          onComplete={() => setShowPassphraseSetup(false)}
          onCancel={() => setShowPassphraseSetup(false)}
        />
      </Modal>

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

const createStyles = (colors: ThemeColors) => ({
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
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  settingRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  itemTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
    fontSize: 16,
  },
  itemDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
    alignItems: 'flex-start' as const,
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
