import { Platform } from 'react-native';
import { DownloadedModel, ONNXImageModel } from '../../types';

export type ModelType = 'text' | 'image';

export type MemoryCheckSeverity = 'safe' | 'warning' | 'critical' | 'blocked';

export interface MemoryCheckResult {
  canLoad: boolean;
  severity: MemoryCheckSeverity;
  availableMemoryGB: number;
  requiredMemoryGB: number;
  currentlyLoadedMemoryGB: number;
  totalRequiredMemoryGB: number;
  remainingAfterLoadGB: number;
  message: string;
}

export interface ActiveModelInfo {
  text: {
    model: DownloadedModel | null;
    isLoaded: boolean;
    isLoading: boolean;
  };
  image: {
    model: ONNXImageModel | null;
    isLoaded: boolean;
    isLoading: boolean;
  };
}

export interface ResourceUsage {
  memoryUsed: number;
  memoryTotal: number;
  memoryAvailable: number;
  memoryUsagePercent: number;
  /** Estimated memory used by loaded models (from file sizes) */
  estimatedModelMemory: number;
}

export type ModelChangeListener = (info: ActiveModelInfo) => void;

// Memory safety thresholds — dynamic budget based on device total RAM.
// Bug #9 fix: Se eliminó el límite artificial del 60%. Ahora se usa hasta el 80%
// del total disponible en dispositivos de gama media-alta (>6GB), lo que permite
// cargar modelos de 7B+ en dispositivos con 12GB de RAM sin bloqueos.
//
//   ≤4 GB (gama baja): 55% — margen de seguridad para el OS
//   4–6 GB (gama media): 70% — balance rendimiento/estabilidad
//   >6 GB (gama alta / 12GB+): 80% — aprovecha la RAM disponible
export const getMemoryBudgetPercent = (totalMemoryGB: number): number => {
  if (totalMemoryGB <= 4) return 0.55;
  if (totalMemoryGB <= 6) return 0.70;
  return 0.80;
};
export const getMemoryWarningPercent = (totalMemoryGB: number): number => {
  if (totalMemoryGB <= 4) return 0.40;
  if (totalMemoryGB <= 6) return 0.55;
  return 0.65;
};
export const TEXT_MODEL_OVERHEAD_MULTIPLIER = 1.2; // KV cache, activations — ajustado a overhead real
// Core ML es más eficiente que ONNX runtime
export const IMAGE_MODEL_OVERHEAD_MULTIPLIER = Platform.OS === 'ios' ? 1.3 : 1.5;
