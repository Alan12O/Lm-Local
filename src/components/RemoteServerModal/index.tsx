/**
 * Remote Server Configuration Modal
 *
 * Modal for adding and editing remote LLM server configurations.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { AppSheet } from '../AppSheet';
import { CustomAlert } from '../CustomAlert';
import { RemoteServer } from '../../types';
import { createStyles } from './styles';
import { useRemoteServerForm } from './useRemoteServerForm';

interface RemoteServerModalProps {
  visible: boolean;
  onClose: () => void;
  server?: RemoteServer; // For editing existing server
  onSave?: (server: RemoteServer) => void;
}

interface TestResultSectionProps {
  testResult: { success: boolean; message: string } | null;
  discoveredModels: Array<{ id: string; name: string }>;
  styles: ReturnType<typeof createStyles>;
}

const TestResultSection: React.FC<TestResultSectionProps> = ({ testResult, discoveredModels, styles }) => (
  <>
    {testResult && (
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, testResult.success ? styles.statusDotSuccess : styles.statusDotError]} />
        <Text style={styles.statusText}>{testResult.message}</Text>
      </View>
    )}
    {discoveredModels.length > 0 && (
      <View style={styles.modelList}>
        <Text style={styles.sectionHeader}>Modelos descubiertos</Text>
        <ScrollView style={styles.modelScroll} nestedScrollEnabled>
          {discoveredModels.map((model) => (
            <View key={model.id} style={styles.modelItem}>
              <Text style={styles.modelName}>{model.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    )}
  </>
);

export const RemoteServerModal: React.FC<RemoteServerModalProps> = ({
  visible,
  onClose,
  server,
  onSave,
}) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    name, setName,
    endpoint, setEndpoint,
    notes, setNotes,
    errors,
    isTesting,
    testResult,
    discoveredModels,
    handleTestConnection,
    handleSave,
    isPublicNetwork,
    alertState,
    dismissAlert,
  } = useRemoteServerForm({ server, visible, onSave, onClose });

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={server ? 'Editar servidor' : 'Añadir servidor remoto'}
      snapPoints={['80%']}
      enableDynamicSizing
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Nombre del servidor</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="ej. Ollama Desktop"
          placeholderTextColor={theme.colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
|
        <Text style={styles.label}>URL del Endpoint</Text>
        <TextInput
          style={[styles.input, errors.endpoint && styles.inputError]}
          placeholder="http://192.168.1.50:11434"
          placeholderTextColor={theme.colors.textMuted}
          value={endpoint}
          onChangeText={setEndpoint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {errors.endpoint && <Text style={styles.errorText}>{errors.endpoint}</Text>}
        {isPublicNetwork && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ Este endpoint está en la internet pública. Tus datos se enviarán a un servidor remoto.
            </Text>
          </View>
        )}
        <Text style={styles.helperText}>
          Introduce la URL base de tu servidor LLM (Ollama, LM Studio, etc.)
        </Text>

        <Text style={styles.label}>Notas (Opcional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Añade notas sobre este servidor..."
          placeholderTextColor={theme.colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <TestResultSection testResult={testResult} discoveredModels={discoveredModels} styles={styles} />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.testButton, isTesting && styles.testButtonDisabled]}
            onPress={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <Text style={[styles.testButtonText, isTesting && styles.testButtonTextDisabled]}>
                Probar conexión
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, !testResult?.success && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!testResult?.success}
          >
            <Text style={[styles.saveButtonText, !testResult?.success && styles.saveButtonTextDisabled]}>
              {server ? 'Actualizar servidor' : 'Añadir servidor'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomAlert {...alertState} onClose={dismissAlert} />
    </AppSheet>
  );
};

export default RemoteServerModal;
