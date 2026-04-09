import React from 'react';
import { View, Text, Switch, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { Button } from '../../components/Button';
import { useTheme, useThemedStyles } from '../../theme';
import { useAppStore } from '../../stores';
import { CacheType } from '../../types';
import {
  useTextGenerationAdvanced,
  CACHE_TYPE_DESCRIPTIONS,
  GPU_LAYERS_MAX,
  CACHE_TYPE_OPTIONS,
} from '../../hooks/useTextGenerationAdvanced';
import { createStyles } from './styles';

// ─── GPU Section ──────────────────────────────────────────────────────────────

interface GpuSectionProps {
  isGpuEnabled: boolean;
  gpuLayersEffective: number;
  trackColor: { false: string; true: string };
  onGpuChange: (value: boolean) => void;
}

const GpuSection: React.FC<GpuSectionProps> = ({
  isGpuEnabled,
  gpuLayersEffective,
  trackColor,
  onGpuChange,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { updateSettings } = useAppStore();

  return (
    <>
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Aceleración por GPU</Text>
          <Text style={styles.toggleDesc}>
            Delegar capas del modelo a la GPU. Requiere recarga del modelo.
          </Text>
        </View>
        <Switch
          testID="gpu-acceleration-switch"
          value={isGpuEnabled}
          onValueChange={onGpuChange}
          trackColor={trackColor}
          thumbColor={isGpuEnabled ? colors.primary : colors.textMuted}
        />
      </View>

      {isGpuEnabled && (
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Capas de GPU</Text>
            <Text style={styles.sliderValue}>{gpuLayersEffective}</Text>
          </View>
          <Text style={styles.sliderDesc}>
            Capas delegadas a la GPU. Valores más altos = más rápido, pero puede fallar en dispositivos con poca VRAM.
          </Text>
          <Slider
            testID="gpu-layers-slider"
            style={styles.slider}
            minimumValue={1}
            maximumValue={GPU_LAYERS_MAX}
            step={1}
            value={gpuLayersEffective}
            onSlidingComplete={(value) => updateSettings({ gpuLayers: value })}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.surface}
            thumbTintColor={colors.primary}
          />
        </View>
      )}
    </>
  );
};

// ─── Flash Attention ──────────────────────────────────────────────────────────

const FlashAttentionSection: React.FC<{ trackColor: { false: string; true: string } }> = ({ trackColor }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isFlashAttnOn, handleFlashAttnToggle } = useTextGenerationAdvanced();

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>Flash Attention</Text>
        <Text style={styles.toggleDesc}>
          Inferencia más rápida y menor uso de memoria. Requerido para caché KV cuantizada (q8_0/q4_0). Requiere recarga del modelo.
        </Text>
      </View>
      <Switch
        testID="flash-attn-switch"
        value={isFlashAttnOn}
        onValueChange={handleFlashAttnToggle}
        trackColor={trackColor}
        thumbColor={isFlashAttnOn ? colors.primary : colors.textMuted}
      />
    </View>
  );
};

// ─── KV Cache Section ─────────────────────────────────────────────────────────

const KvCacheSection: React.FC<{ cacheDisabled: boolean }> = ({ cacheDisabled }) => {
  const styles = useThemedStyles(createStyles);
  const { displayCacheType, isFlashAttnOn, handleCacheTypeChange } = useTextGenerationAdvanced();

  return (
    <>
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Tipo de caché KV</Text>
          <Text style={styles.toggleDesc}>
            {CACHE_TYPE_DESCRIPTIONS[displayCacheType]}
          </Text>
        </View>
      </View>
      <View style={styles.strategyButtons}>
        {CACHE_TYPE_OPTIONS.map((ct: CacheType) => (
          <Button
            key={ct}
            title={ct}
            variant="secondary"
            size="small"
            active={displayCacheType === ct}
            disabled={cacheDisabled && ct !== 'f16'}
            onPress={() => handleCacheTypeChange(ct)}
            style={styles.flex1}
          />
        ))}
      </View>
      {cacheDisabled && (
        <Text style={styles.warningText}>
          La aceleración por GPU en Android requiere caché KV f16.
        </Text>
      )}
      {!cacheDisabled && !isFlashAttnOn && (
        <Text style={styles.warningText}>
          La caché cuantizada (q8_0/q4_0) activará automáticamente Flash Attention.
        </Text>
      )}
    </>
  );
};

// ─── Model Loading Strategy ───────────────────────────────────────────────────

const ModelLoadingStrategySection: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();

  return (
    <>
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Estrategia de carga de modelo</Text>
          <Text style={styles.toggleDesc}>
            {settings?.modelLoadingStrategy === 'performance'
              ? 'Mantener modelos cargados para respuestas más rápidas'
              : 'Cargar modelos bajo demanda para ahorrar memoria'}
          </Text>
        </View>
      </View>
      <View style={styles.strategyButtons}>
        <Button
          title="Ahorrar memoria"
          variant="secondary"
          size="small"
          testID="strategy-memory-button"
          active={settings?.modelLoadingStrategy === 'memory'}
          onPress={() => updateSettings({ modelLoadingStrategy: 'memory' })}
          style={styles.flex1}
        />
        <Button
          title="Rápido"
          variant="secondary"
          size="small"
          testID="strategy-performance-button"
          active={settings?.modelLoadingStrategy === 'performance'}
          onPress={() => updateSettings({ modelLoadingStrategy: 'performance' })}
          style={styles.flex1}
        />
      </View>
    </>
  );
};

// ─── Main Advanced Component ─────────────────────────────────────────────────

export const TextGenerationAdvanced: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();
  const {
    gpuLayersEffective,
    isGpuEnabled,
    cacheDisabled,
    handleGpuToggle,
  } = useTextGenerationAdvanced();

  const trackColor = { false: colors.surfaceLight, true: `${colors.primary}80` };

  return (
    <>
      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Top P</Text>
          <Text style={styles.sliderValue}>{(settings?.topP || 0.9).toFixed(2)}</Text>
        </View>
        <Text style={styles.sliderDesc}>Umbral de muestreo nucleus (Nucleus sampling)</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.1}
          maximumValue={1.0}
          step={0.05}
          value={settings?.topP || 0.9}
          onSlidingComplete={(value) => updateSettings({ topP: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Repeat Penalty</Text>
          <Text style={styles.sliderValue}>{(settings?.repeatPenalty || 1.1).toFixed(2)}</Text>
        </View>
        <Text style={styles.sliderDesc}>Penaliza la repetición de tokens</Text>
        <Slider
          style={styles.slider}
          minimumValue={1.0}
          maximumValue={2.0}
          step={0.05}
          value={settings?.repeatPenalty || 1.1}
          onSlidingComplete={(value) => updateSettings({ repeatPenalty: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Hilos de CPU</Text>
          <Text style={styles.sliderValue}>{settings?.nThreads || 6}</Text>
        </View>
        <Text style={styles.sliderDesc}>Hilos paralelos para la inferencia</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={12}
          step={1}
          value={settings?.nThreads || 6}
          onSlidingComplete={(value) => updateSettings({ nThreads: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Tamaño de lote (Batch Size)</Text>
          <Text style={styles.sliderValue}>{settings?.nBatch || 256}</Text>
        </View>
        <Text style={styles.sliderDesc}>Tokens procesados por lote</Text>
        <Slider
          style={styles.slider}
          minimumValue={32}
          maximumValue={512}
          step={32}
          value={settings?.nBatch || 256}
          onSlidingComplete={(value) => updateSettings({ nBatch: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      {Platform.OS !== 'ios' && (
        <GpuSection
          isGpuEnabled={isGpuEnabled}
          gpuLayersEffective={gpuLayersEffective}
          trackColor={trackColor}
          onGpuChange={handleGpuToggle}
        />
      )}

      <FlashAttentionSection trackColor={trackColor} />
      <KvCacheSection cacheDisabled={cacheDisabled} />
      <ModelLoadingStrategySection />
    </>
  );
};
