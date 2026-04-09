import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { AdvancedToggle } from '../../components';
import { useTheme, useThemedStyles } from '../../theme';
import { useAppStore } from '../../stores';
import { createStyles } from './styles';
import { TextGenerationAdvanced } from './TextGenerationAdvanced';

const FALLBACK_MAX_CONTEXT = 32768;
const HIGH_CONTEXT_THRESHOLD = 8192;

export const TextGenerationSection: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();
  const modelMaxContext = useAppStore((s) => s.modelMaxContext);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const trackColor = { false: colors.surfaceLight, true: `${colors.primary}80` };
  const maxTokens = settings?.maxTokens || 512;
  const maxTokensLabel = maxTokens >= 1024
    ? `${(maxTokens / 1024).toFixed(1)}K`
    : String(maxTokens);
  const contextLength = settings?.contextLength || 2048;
  const contextLengthLabel = contextLength >= 1024
    ? `${(contextLength / 1024).toFixed(0)}K`
    : String(contextLength);
  const ctxSliderMax = modelMaxContext || FALLBACK_MAX_CONTEXT;

  return (
    <View style={styles.card}>
      <Text style={styles.settingHelp}>Configura el comportamiento del LLM para respuestas de texto.</Text>

      {/* ── Basic Settings ── */}

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Temperatura</Text>
          <Text style={styles.sliderValue}>{(settings?.temperature || 0.7).toFixed(2)}</Text>
        </View>
        <Text style={styles.sliderDesc}>Más alto = más creativo, más bajo = más enfocado</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={2}
          step={0.05}
          value={settings?.temperature || 0.7}
          onSlidingComplete={(value) => updateSettings({ temperature: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Tokens máximos</Text>
          <Text style={styles.sliderValue}>{maxTokensLabel}</Text>
        </View>
        <Text style={styles.sliderDesc}>Longitud máxima de la respuesta</Text>
        <Slider
          style={styles.slider}
          minimumValue={64}
          maximumValue={8192}
          step={64}
          value={maxTokens}
          onSlidingComplete={(value) => updateSettings({ maxTokens: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Longitud de contexto</Text>
          <Text style={styles.sliderValue}>{contextLengthLabel}</Text>
        </View>
        <Text style={styles.sliderDesc}>Tamaño de la caché KV — valores mayores usan más RAM (requiere recarga)</Text>
        {contextLength > HIGH_CONTEXT_THRESHOLD && (
          <Text style={[styles.sliderDesc, { color: colors.error }]}>
            Un contexto alto usa mucha RAM y puede cerrar la app en algunos dispositivos
          </Text>
        )}
        <Slider
          style={styles.slider}
          minimumValue={512}
          maximumValue={ctxSliderMax}
          step={1024}
          value={contextLength}
          onSlidingComplete={(value) => updateSettings({ contextLength: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Activar Pensamiento (Thinking)</Text>
          <Text style={styles.toggleDesc}>
            Permite que el modelo razone antes de responder (o1, DeepSeek-R1, etc.)
          </Text>
        </View>
        <Switch
          value={settings?.thinkingEnabled ?? false}
          onValueChange={(value) => updateSettings({ thinkingEnabled: value })}
          trackColor={trackColor}
          thumbColor={settings?.thinkingEnabled ? colors.primary : colors.textMuted}
        />
      </View>

      {settings?.thinkingEnabled && (
        <View style={styles.levelSelectorContainer}>
          <Text style={styles.levelLabel}>Nivel de Pensamiento</Text>
          <View style={styles.levelSelector}>
            {([
              { id: 'super_lite' as const, label: 'Lite' },
              { id: 'reduced' as const, label: 'Reducido' },
              { id: 'medium' as const, label: 'Medio' },
              { id: 'normal' as const, label: 'Normal' },
              { id: 'super_extended' as const, label: 'S-Ext' },
            ]).map((lvl) => (
              <TouchableOpacity
                key={lvl.id}
                style={[
                  styles.levelOption,
                  settings?.thinkingLevel === lvl.id && styles.levelOptionActive,
                ]}
                onPress={() => updateSettings({ thinkingLevel: lvl.id })}
              >
                <Text
                  style={[
                    styles.levelOptionText,
                    settings?.thinkingLevel === lvl.id && styles.levelOptionTextActive,
                    { fontSize: 10 }, // Ajuste para que quepan 5
                  ]}
                  numberOfLines={1}
                >
                  {lvl.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.toggleDesc, { marginTop: 8 }]}>
            {settings?.thinkingLevel === 'super_lite'
              ? 'Pensamiento ultrarrápido (64 tokens)'
              : settings?.thinkingLevel === 'reduced'
                ? 'Pensamiento breve (256 tokens)'
                : settings?.thinkingLevel === 'medium'
                  ? 'Balance entre razonamiento y velocidad (1K)'
                  : settings?.thinkingLevel === 'super_extended'
                    ? 'Modo Experto: Optimización de prompt + Razonamiento máximo (8K)'
                    : 'Razonamiento profundo completo (4K)'}
          </Text>
        </View>
      )}

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Mostrar Detalles de Generación</Text>
          <Text style={styles.toggleDesc}>
            Muestra tokens/seg, tiempo y uso de memoria en las respuestas
          </Text>
        </View>
        <Switch
          value={settings?.showGenerationDetails ?? false}
          onValueChange={(value) => updateSettings({ showGenerationDetails: value })}
          trackColor={trackColor}
          thumbColor={settings?.showGenerationDetails ? colors.primary : colors.textMuted}
        />
      </View>

      <AdvancedToggle isExpanded={showAdvanced} onPress={() => setShowAdvanced(!showAdvanced)} testID="text-advanced-toggle" />

      {showAdvanced && <TextGenerationAdvanced />}
    </View>
  );
};
