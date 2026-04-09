import React, { useState } from 'react';
import { View, Text, Switch, Platform, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { AdvancedToggle } from '../../components';
import { Button } from '../../components/Button';
import { useTheme, useThemedStyles } from '../../theme';
import { useAppStore } from '../../stores';
import { useClearGpuCache } from '../../hooks/useImageGenerationSettings';
import { createStyles } from './styles';

// ─── Advanced Sub-Components ─────────────────────────────────────────────────

const EnhanceImageToggle: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();
  const trackColor = { false: colors.surfaceLight, true: `${colors.primary}80` };

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>Mejorar Prompts de Imagen</Text>
        <Text style={styles.toggleDesc}>
          {settings?.enhanceImagePrompts
            ? 'El modelo de texto refina tu prompt antes de generar la imagen (más lento pero mejores resultados)'
            : 'Usar tu prompt directamente para generar la imagen (más rápido)'}
        </Text>
      </View>
      <Switch
        value={settings?.enhanceImagePrompts ?? false}
        onValueChange={(value) => updateSettings({ enhanceImagePrompts: value })}
        trackColor={trackColor}
        thumbColor={settings?.enhanceImagePrompts ? colors.primary : colors.textMuted}
      />
    </View>
  );
};

const ImageGpuSection: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();
  const { clearing, handleClearCache } = useClearGpuCache();
  const trackColor = { false: colors.surfaceLight, true: `${colors.primary}80` };
  const isOpenCL = settings?.imageUseOpenCL ?? true;

  return (
    <>
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Aceleración por GPU OpenCL</Text>
          <Text style={styles.toggleDesc}>
            Usa la GPU para una generación de imagen más rápida. La primera ejecución puede ser más lenta mientras se optimiza para tu dispositivo.
          </Text>
        </View>
        <Switch
          value={isOpenCL}
          onValueChange={(value) => updateSettings({ imageUseOpenCL: value })}
          trackColor={trackColor}
          thumbColor={isOpenCL ? colors.primary : colors.textMuted}
        />
      </View>
      {isOpenCL && (
        <TouchableOpacity
          style={[styles.toggleRow, styles.clearCacheRow]}
          onPress={handleClearCache}
          disabled={clearing}
        >
          <Text style={styles.clearCacheText}>
            {clearing ? 'Limpiando...' : 'Limpiar caché de GPU'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const DetectionMethodRow: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();

  if (settings?.imageGenerationMode !== 'auto') return null;

  return (
    <View style={styles.settingSection}>
      <Text style={styles.settingLabel}>Método de detección</Text>
      <Text style={styles.settingDesc}>
        {settings?.autoDetectMethod === 'pattern'
          ? 'Coincidencia rápida de palabras clave'
          : 'Usa el modelo de texto para la clasificación'}
      </Text>
      <View style={styles.buttonRow}>
        <Button
          title="Patrón"
          variant="secondary"
          size="medium"
          active={settings?.autoDetectMethod === 'pattern'}
          onPress={() => updateSettings({ autoDetectMethod: 'pattern' })}
          style={styles.flex1}
        />
        <Button
          title="LLM"
          variant="secondary"
          size="medium"
          active={settings?.autoDetectMethod === 'llm'}
          onPress={() => updateSettings({ autoDetectMethod: 'llm' })}
          style={styles.flex1}
        />
      </View>
    </View>
  );
};

// ─── Advanced Section ────────────────────────────────────────────────────────

const ImageAdvancedSection: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();

  return (
    <>
      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Escala de Guía (Guidance Scale)</Text>
          <Text style={styles.sliderValue}>{(settings?.imageGuidanceScale || 7.5).toFixed(1)}</Text>
        </View>
        <Text style={styles.sliderDesc}>Más alto = sigue el prompt de forma más estricta</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={20}
          step={0.5}
          value={settings?.imageGuidanceScale || 7.5}
          onSlidingComplete={(value) => updateSettings({ imageGuidanceScale: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Hilos de imagen</Text>
          <Text style={styles.sliderValue}>{settings?.imageThreads ?? 4}</Text>
        </View>
        <Text style={styles.sliderDesc}>
          Hilos de CPU usados para la generación de imagen (se aplica en la siguiente carga del modelo)
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={8}
          step={1}
          value={settings?.imageThreads ?? 4}
          onSlidingComplete={(value) => updateSettings({ imageThreads: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <DetectionMethodRow />
      <EnhanceImageToggle />

      {Platform.OS === 'android' && <ImageGpuSection />}
    </>
  );
};

// ─── Main Section ────────────────────────────────────────────────────────────

export const ImageGenerationSection: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isAutoMode = settings?.imageGenerationMode === 'auto';
  const trackColor = { false: colors.surfaceLight, true: `${colors.primary}80` };

  return (
    <View style={styles.card}>
      <Text style={styles.settingHelp}>
        Controla cómo se manejan las solicitudes de generación de imagen en el chat.
      </Text>

      {/* ── Basic Settings ── */}

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Detección automática</Text>
          <Text style={styles.toggleDesc}>
            {isAutoMode
              ? 'El LLM clasificará si tu mensaje solicita una imagen'
              : 'Solo genera imágenes cuando tocas el botón de imagen'}
          </Text>
        </View>
        <Switch
          value={isAutoMode}
          onValueChange={(value) =>
            updateSettings({ imageGenerationMode: value ? 'auto' : 'manual' })
          }
          trackColor={trackColor}
          thumbColor={isAutoMode ? colors.primary : colors.textMuted}
        />
      </View>
      <Text style={styles.toggleNote}>
        {isAutoMode
          ? 'En modo Auto, mensajes como "Dibújame un atardecer" generarán automáticamente una imagen si hay un modelo cargado.'
          : 'En modo Manual, debes tocar el botón IMG en el chat para generar imágenes.'}
      </Text>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Pasos de imagen</Text>
          <Text style={styles.sliderValue}>{settings?.imageSteps || 8}</Text>
        </View>
        <Text style={styles.sliderDesc}>Más pasos = mejor calidad pero más lento (4-8 rápido, 20-50 alta calidad)</Text>
        <Slider
          style={styles.slider}
          minimumValue={4}
          maximumValue={50}
          step={1}
          value={settings?.imageSteps || 8}
          onSlidingComplete={(value) => updateSettings({ imageSteps: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Tamaño de imagen</Text>
          <Text style={styles.sliderValue}>{settings?.imageWidth ?? 256}x{settings?.imageHeight ?? 256}</Text>
        </View>
        <Text style={styles.sliderDesc}>Resolución de salida (más pequeña = más rápido, más grande = más detalle)</Text>
        <Slider
          style={styles.slider}
          minimumValue={128}
          maximumValue={512}
          step={64}
          value={settings?.imageWidth ?? 256}
          onSlidingComplete={(value) => updateSettings({ imageWidth: value, imageHeight: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <AdvancedToggle isExpanded={showAdvanced} onPress={() => setShowAdvanced(!showAdvanced)} testID="image-advanced-toggle" />

      {showAdvanced && <ImageAdvancedSection />}
    </View>

  );
};
