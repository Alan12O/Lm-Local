import { CREDIBILITY_LABELS } from '../../constants';
import {
  BackendFilter,
  CredibilityFilter,
  FilterState,
  ModelTypeFilter,
  SizeFilter,
} from './types';

export const VISION_PIPELINE_TAG = 'image-text-to-text';
export const CODE_FALLBACK_QUERY = 'coder';

export const CREDIBILITY_OPTIONS: { key: CredibilityFilter; label: string; color?: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'lmstudio', label: 'LM Studio', color: CREDIBILITY_LABELS.lmstudio.color },
  { key: 'official', label: 'Oficial', color: CREDIBILITY_LABELS.official.color },
  { key: 'verified-quantizer', label: 'Verificado', color: CREDIBILITY_LABELS['verified-quantizer'].color },
  { key: 'community', label: 'Comunidad', color: CREDIBILITY_LABELS.community.color },
];

export const MODEL_TYPE_OPTIONS: { key: ModelTypeFilter; label: string }[] = [
  { key: 'all', label: 'Todos los tipos' },
  { key: 'text', label: 'Texto' },
  { key: 'vision', label: 'Visión' },
  { key: 'code', label: 'Código' },
];

export const SIZE_OPTIONS: { key: SizeFilter; label: string; min: number; max: number }[] = [
  { key: 'all', label: 'Todos los tamaños', min: 0, max: Infinity },
  { key: 'tiny', label: '< 1B', min: 0, max: 1 },
  { key: 'small', label: '1-3B', min: 1, max: 3 },
  { key: 'medium', label: '3-8B', min: 3, max: 8 },
  { key: 'large', label: '8B+', min: 8, max: Infinity },
];

export const QUANT_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'Q4_K_M', label: 'Q4_K_M' },
  { key: 'Q4_K_S', label: 'Q4_K_S' },
  { key: 'Q5_K_M', label: 'Q5_K_M' },
  { key: 'Q6_K', label: 'Q6_K' },
  { key: 'Q8_0', label: 'Q8_0' },
];

export const STYLE_OPTIONS = [
  { key: 'all', label: 'Todos los estilos' },
  { key: 'photorealistic', label: 'Realista' },
  { key: 'anime', label: 'Anime' },
];

export const SD_VERSION_OPTIONS = [
  { key: 'all', label: 'Todas las versiones' },
  { key: 'sd15', label: 'SD 1.5' },
  { key: 'sd21', label: 'SD 2.1' },
  { key: 'sdxl', label: 'SDXL' },
];

export const BACKEND_OPTIONS: { key: BackendFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'mnn', label: 'GPU' },
  { key: 'qnn', label: 'NPU' },
];

export const initialFilterState: FilterState = {
  orgs: [],
  type: 'all',
  source: 'all',
  size: 'all',
  quant: 'all',
  expandedDimension: null,
};
