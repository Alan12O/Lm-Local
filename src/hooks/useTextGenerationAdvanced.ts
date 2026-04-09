import { Platform } from 'react-native';
import { useAppStore } from '../stores';
import { CacheType } from '../types';

export const CACHE_TYPE_DESCRIPTIONS: Record<CacheType, string> = {
  f16: 'Precisión completa — mejor calidad, mayor uso de memoria',
  q8_0: 'Cuantización de 8 bits — buen equilibrio entre calidad y memoria',
  q4_0: 'Cuantización de 4 bits — menor uso de memoria, puede reducir la calidad',
};

export const GPU_LAYERS_MAX = 99;
export const CACHE_TYPE_OPTIONS: CacheType[] = ['f16', 'q8_0', 'q4_0'];

export function useTextGenerationAdvanced() {
  const { settings, updateSettings } = useAppStore();

  const isFlashAttnOn = settings?.flashAttn ?? true;
  const isQuantizedCache = (settings?.cacheType ?? 'q8_0') !== 'f16';
  const currentCacheType: CacheType = settings?.cacheType ?? 'q8_0';
  const gpuLayersEffective = Math.min(settings?.gpuLayers ?? 1, GPU_LAYERS_MAX);
  const isGpuEnabled = settings?.enableGpu !== false;
  const isAndroid = Platform.OS === 'android';
  const gpuForcesF16 = false; // El backend de Hexagon en Snapdragon 8 Gen 3 soporta caché cuantizada
  const cacheDisabled = gpuForcesF16;
  const displayCacheType = cacheDisabled ? 'f16' : currentCacheType;

  const handleGpuToggle = (enableGpu: boolean) => {
    updateSettings({ enableGpu: enableGpu });
  };

  const handleFlashAttnToggle = (flashAttn: boolean) => {
    if (!flashAttn && isQuantizedCache) {
      updateSettings({ flashAttn: false, cacheType: 'f16' });
    } else {
      updateSettings({ flashAttn: flashAttn });
    }
  };

  const handleCacheTypeChange = (ct: CacheType) => {
    if (cacheDisabled) return;
    const updates: Partial<typeof settings> = { cacheType: ct };
    if (ct !== 'f16' && !isFlashAttnOn) {
      updates.flashAttn = true;
    }
    updateSettings(updates);
  };

  return {
    // State
    settings,
    updateSettings,
    isFlashAttnOn,
    isQuantizedCache,
    currentCacheType,
    displayCacheType,
    gpuLayersEffective,
    isGpuEnabled,
    isAndroid,
    gpuForcesF16,
    cacheDisabled,

    // Handlers
    handleGpuToggle,
    handleFlashAttnToggle,
    handleCacheTypeChange,
  };
}
