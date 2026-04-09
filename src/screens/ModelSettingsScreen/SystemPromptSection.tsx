import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { useAppStore } from '../../stores';
import { createStyles } from './styles';

export const SystemPromptSection: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();
  const systemPrompt = settings?.systemPrompt ?? 'Eres un asistente de IA servicial.';

  return (
    <View style={[styles.card, styles.systemPromptContainer]}>
      <Text style={styles.settingHelp}>
        Instrucciones dadas al modelo antes de cada conversación. Se utilizan al chatear sin un proyecto seleccionado.
      </Text>
      <TextInput
        style={styles.textArea}
        value={systemPrompt}
        onChangeText={(text) => updateSettings({ systemPrompt: text })}
        multiline
        numberOfLines={4}
        placeholder="Introduce el system prompt..."
        placeholderTextColor={colors.textMuted}
      />
    </View>

  );
};
