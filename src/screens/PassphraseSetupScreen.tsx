import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Button, Card } from '../components';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import logger from '../utils/logger';

interface PassphraseSetupScreenProps {
  isChanging?: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export const PassphraseSetupScreen: React.FC<PassphraseSetupScreenProps> = ({
  isChanging = false,
  onComplete,
  onCancel,
}) => {
  const [currentPassphrase, setCurrentPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { setEnabled } = useAuthStore();

  const validatePassphrase = (passphrase: string): string | null => {
    if (passphrase.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    if (passphrase.length > 50) {
      return 'La contraseña debe tener 50 caracteres o menos';
    }
    return null;
  };

  const handleSubmit = async () => {
    // Validate new passphrase
    const error = validatePassphrase(newPassphrase);
    if (error) {
      setAlertState(showAlert('Contraseña no válida', error));
      return;
    }

    // Check confirmation matches
    if (newPassphrase !== confirmPassphrase) {
      setAlertState(showAlert('No coincide', 'Las contraseñas no coinciden'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (isChanging) {
        // Verify current passphrase and change
        const success = await authService.changePassphrase(currentPassphrase, newPassphrase);
        if (!success) {
          setAlertState(showAlert('Error', 'La contraseña actual es incorrecta'));
          setIsSubmitting(false);
          return;
        }
        setAlertState(showAlert('Éxito', 'Contraseña cambiada con éxito'));
      } else {
        // Set new passphrase
        const success = await authService.setPassphrase(newPassphrase);
        if (!success) {
          setAlertState(showAlert('Error', 'Error al establecer la contraseña'));
          setIsSubmitting(false);
          return;
        }
        setEnabled(true);
        setAlertState(showAlert('Éxito', 'Bloqueo por contraseña activado'));
      }

      onComplete();
    } catch (err) {
      logger.warn('[PassphraseSetup] Operation failed:', err);
      setAlertState(showAlert('Error', 'Ocurrió un error. Por favor, inténtalo de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isChanging ? 'Cambiar contraseña' : 'Configurar contraseña'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBox}>
              <Icon name="lock" size={48} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.description}>
            {isChanging
              ? 'Introduce tu contraseña actual y luego configura una nueva.'
              : 'Crea una contraseña para bloquear la aplicación. Deberás introducirla cada vez que abras la aplicación.'}
          </Text>

          <Card style={styles.inputCard}>
            {isChanging && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contraseña actual</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassphrase}
                  onChangeText={setCurrentPassphrase}
                  placeholder="Introduce la contraseña actual"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isChanging ? 'Nueva contraseña' : 'Contraseña'}
              </Text>
              <TextInput
                style={styles.input}
                value={newPassphrase}
                onChangeText={setNewPassphrase}
                placeholder="Introduce la contraseña (mín. 6 caracteres)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar contraseña</Text>
              <TextInput
                style={styles.input}
                value={confirmPassphrase}
                onChangeText={setConfirmPassphrase}
                placeholder="Vuelve a introducir la contraseña"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </Card>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Consejos para una buena contraseña:</Text>
            <Text style={styles.tipItem}>• Usa una mezcla de palabras y números</Text>
            <Text style={styles.tipItem}>• Hazla memorable pero no obvia</Text>
            <Text style={styles.tipItem}>• Evita información personal</Text>
          </View>

          <Button
            title={(() => {
              if (isSubmitting) return 'Guardando...';
              return isChanging ? 'Cambiar contraseña' : 'Activar bloqueo';
            })()}
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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

const createStyles = (colors: ThemeColors, _shadows: ThemeShadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSpacer: {
    width: 50,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    ...TYPOGRAPHY.body,
    color: colors.textSecondary,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  iconContainer: {
    alignItems: 'center' as const,
    marginVertical: SPACING.xl,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  inputCard: {
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.text,
    marginBottom: SPACING.sm,
  },
  input: {
    ...TYPOGRAPHY.body,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    color: colors.text,
  },
  tips: {
    marginBottom: SPACING.xl,
  },
  tipsTitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginBottom: SPACING.sm,
  },
  tipItem: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
  },
  submitButton: {
    marginBottom: 32,
  },
});
