export { MODEL_RECOMMENDATIONS, RECOMMENDED_MODELS, MODEL_ORGS, QUANTIZATION_INFO } from './models';

// Hugging Face API configuration
export const HF_API = {
  baseUrl: 'https://huggingface.co',
  apiUrl: 'https://huggingface.co/api',
  modelsEndpoint: '/models',
  searchParams: {
    filter: 'gguf',
    sort: 'downloads',
    direction: '-1',
    limit: 30,
  },
};

// Model credibility configuration
// LM Studio community - highest credibility for GGUF models
export const LMSTUDIO_AUTHORS: string[] = [];

// Official model creators - these are the original model authors
export const OFFICIAL_MODEL_AUTHORS: Record<string, string> = {};

// Verified quantizers - trusted community members who quantize models
export const VERIFIED_QUANTIZERS: Record<string, string> = {};

// Credibility level labels
export const CREDIBILITY_LABELS = {
  lmstudio: {
    label: 'LM Studio',
    description: 'Cuantización oficial de LM Studio - GGUF de máxima calidad',
    color: '#22D3EE', // cyan
  },
  official: {
    label: 'Oficial',
    description: 'Del creador original del modelo',
    color: '#3B82F6', // blue
  },
  'verified-quantizer': {
    label: 'Verificado',
    description: 'De un proveedor de cuantización de confianza',
    color: '#A78BFA', // purple
  },
  community: {
    label: 'Comunidad',
    description: 'Modelo contribuido por la comunidad',
    color: '#64748B', // gray
  },
};

// App configuration
export const APP_CONFIG = {
  modelStorageDir: 'models',
  whisperStorageDir: 'whisper-models',
  maxConcurrentDownloads: 1,
  defaultSystemPrompt: `Eres un asistente de IA útil que se ejecuta localmente en el dispositivo del usuario. Tus respuestas deben ser:
- Precisas y factuales - nunca inventes información.
- Concisas pero completas - responde la pregunta totalmente sin rodeos innecesarios.
- Útiles y amigables - enfócate en resolver la necesidad real del usuario.
- Honesto sobre las limitaciones - si no sabes algo, dilo.

Si te preguntan sobre ti, puedes mencionar que eres un asistente de IA local que prioriza la privacidad del usuario.`,
  streamingEnabled: true,
  maxContextLength: 2048, // Balanced for speed and context (increase to 4096 if you need more history)
};

// Onboarding slides
export const ONBOARDING_SLIDES = [
  {
    id: 'welcome',
    keyword: 'HOLA',
    title: 'Conoce a tu\nnuevo asistente.',
    description: 'Todo el poder de la Inteligencia Artificial, directamente en tus manos. Rápido, inteligente y sin complicaciones.',
  },
  {
    id: 'privacy',
    keyword: 'SEGURO',
    title: 'Tus datos\nson solo tuyos.',
    description: 'El procesamiento ocurre 100% en tu dispositivo. Nadie más tiene acceso a tus conversaciones, fotos o documentos.',
  },
  {
    id: 'creative',
    keyword: 'CREA',
    title: 'Imagina y\nhazlo realidad.',
    description: 'Escribe, resume o genera imágenes increíbles en segundos. Pide lo que necesites y la IA lo creará para ti.',
  },
  {
    id: 'ready',
    keyword: 'LISTO',
    title: 'Comienza la\nexperiencia.',
    description: 'Configuraremos todo automáticamente para aprovechar al máximo el hardware de tu dispositivo. ¿Empezamos?',
  },
];

// Fonts
export const FONTS = {
  mono: 'Menlo',
};

// Typography Scale - Centralized font sizes and styles
export const TYPOGRAPHY = {
  // Display / Hero numbers
  display: {
    fontSize: 22,
    fontFamily: FONTS.mono,
    fontWeight: '200' as const,
    letterSpacing: -0.5,
  },

  // Headings
  h1: {
    fontSize: 28,
    fontFamily: FONTS.mono,
    fontWeight: '300' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontFamily: FONTS.mono,
    fontWeight: '500' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 18,
    fontFamily: FONTS.mono,
    fontWeight: '500' as const,
    letterSpacing: -0.1,
  },

  // Body text
  body: {
    fontSize: 15,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 13,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
  },

  // Labels (whispers)
  label: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontSize: 9,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
    letterSpacing: 0.3,
  },

  // Metadata / Details
  meta: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    fontWeight: '300' as const,
  },
  metaSmall: {
    fontSize: 9,
    fontFamily: FONTS.mono,
    fontWeight: '300' as const,
  },
};

// Spacing Scale - Consistent whitespace
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

