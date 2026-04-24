export interface HFImageModel {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  defaultPrompt?: string;
  defaultNegativePrompt?: string;
  backend: 'mnn' | 'qnn' | 'upscaler';
  variant?: string;
  downloadUrl: string;
  fileName: string;
  size: number;
  repo: string;
}

interface HFTreeEntry {
  type: string;
  path: string;
  size: number;
  lfs?: { oid: string; size: number; pointerSize: number };
}

const REPOS = {
  mnn: 'xororz/sd-mnn',
  qnn: 'xororz/sd-qnn',
  upscaler: 'xororz/upscaler',
} as const;

const VARIANT_LABELS: Record<string, string> = {
  min: 'For non-flagship Snapdragon chips',
  '8gen1': 'For Snapdragon 8 Gen 1',
  '8gen2': 'For Snapdragon 8 Gen 2/3/4/5',
};

const LOCAL_DREAM_METADATA: Record<string, { desc: string, prompt: string, nump: string }> = {
  anythingv5: {
    desc: "A versatile anime and illustration model for high quality and beautiful outputs.",
    prompt: "masterpiece, best quality, 1girl, solo, cute, white hair,",
    nump: "lowres, bad anatomy, bad hands, missing fingers, extra fingers, bad arms, missing legs, missing arms, poorly drawn face, bad face, fused face, cloned face, three crus, fused feet, fused thigh, extra crus, ugly fingers, horn, realistic photo, huge eyes, worst face, 2girl, long fingers, disconnected limbs,"
  },
  qteamix: {
    desc: "Chibi and cute style anime model, great for adorable characters.",
    prompt: "chibi, best quality, 1girl, solo, cute, pink hair,",
    nump: "lowres, bad anatomy, bad hands, missing fingers, extra fingers, bad arms, missing legs, missing arms, poorly drawn face, bad face, fused face, cloned face, three crus, fused feet, fused thigh, extra crus, ugly fingers, horn, realistic photo, huge eyes, worst face, 2girl, long fingers, disconnected limbs,"
  },
  absolutereality: {
    desc: "Highly realistic model optimized for photography and lifelike subjects.",
    prompt: "masterpiece, best quality, ultra-detailed, realistic, 8k, a cat on grass,",
    nump: "worst quality, low quality, normal quality, poorly drawn, lowres, low resolution, signature, watermarks, ugly, out of focus, error, blurry, unclear photo, bad photo, unrealistic, semi realistic, pixelated, cartoon, anime, cgi, drawing, 2d, 3d, censored, duplicate,"
  },
  chilloutmix: {
    desc: "Popular model for highly detailed and realistic portraits and characters.",
    prompt: "RAW photo, best quality, realistic, photo-realistic, masterpiece, 1girl, upper body, facing front, portrait, white shirt",
    nump: "paintings, cartoon, anime, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, skin spots, acnes, skin blemishes"
  }
};

let cachedModels: HFImageModel[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function insertSpaces(name: string): string {
  return name.replaceAll(/([a-z\d])([A-Z])/g, '$1 $2');
}

function parseFileName(fileName: string, backend: 'mnn' | 'qnn' | 'upscaler'): Omit<HFImageModel, 'downloadUrl' | 'size' | 'repo'> | null {
  if (backend === 'upscaler') {
    if (!fileName.endsWith('.bin')) return null;
    const match = fileName.match(/^(.+?)\/upscaler_(.+)\.bin$/);
    if (!match) return null;
    const [, folderName, variant] = match;
    const isAnime = folderName.includes('anime');
    return {
      id: `upscaler_${isAnime ? 'anime' : 'realistic'}_${variant}`,
      name: isAnime ? 'Anime Upscaler' : 'Realistic Upscaler',
      displayName: isAnime ? 'RealESRGAN x4 (Anime)' : 'UltraSharp V2 (Realistic)',
      description: isAnime ? 'Upscaler optimized for 2D/Anime images.' : 'Upscaler optimized for realistic photos.',
      backend: 'upscaler',
      variant,
      fileName,
    };
  }

  if (!fileName.endsWith('.zip')) return null;

  const baseName = fileName.replace('.zip', '');
  const lowerBase = baseName.toLowerCase();

  if (backend === 'qnn') {
    const match = baseName.match(/^(.+?)_qnn[\d.]+_(.+)$/);
    if (!match) return null;
    const [, name, variant] = match;
    const displayVariant = variant === 'min' ? 'non-flagship' : variant;
    const meta = LOCAL_DREAM_METADATA[name.toLowerCase()];
    return {
      id: `${name.toLowerCase()}_npu_${variant}`,
      name,
      displayName: `${insertSpaces(name)} (NPU ${displayVariant})`,
      description: meta?.desc,
      defaultPrompt: meta?.prompt,
      defaultNegativePrompt: meta?.nump,
      backend: 'qnn',
      variant,
      fileName,
    };
  }

  const meta = LOCAL_DREAM_METADATA[lowerBase];
  return {
    id: `${baseName.toLowerCase()}_cpu`,
    name: baseName,
    displayName: `${insertSpaces(baseName)} (GPU)`,
    description: meta?.desc,
    defaultPrompt: meta?.prompt,
    defaultNegativePrompt: meta?.nump,
    backend: 'mnn',
    fileName,
  };
}

async function fetchRepoFiles(repo: string, recursive: boolean = false): Promise<HFTreeEntry[]> {
  const url = `https://huggingface.co/api/models/${repo}/tree/main${recursive ? '?recursive=true' : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${repo}: HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchAvailableModels(forceRefresh = false, opts?: { skipQnn?: boolean }): Promise<HFImageModel[]> {
  if (!forceRefresh && cachedModels && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedModels;
  }

  const fetchQnn = !opts?.skipQnn;
  const [mnnFiles, qnnFiles, upscalerFiles] = await Promise.all([
    fetchRepoFiles(REPOS.mnn),
    fetchQnn ? fetchRepoFiles(REPOS.qnn) : Promise.resolve([] as HFTreeEntry[]),
    fetchRepoFiles(REPOS.upscaler, true).catch(() => [] as HFTreeEntry[]), // recursive to find .bin
  ]);

  const models: HFImageModel[] = [];

  for (const entry of mnnFiles) {
    if (entry.type !== 'file') continue;
    const parsed = parseFileName(entry.path, 'mnn');
    if (!parsed) continue;
    models.push({
      ...parsed,
      downloadUrl: `https://huggingface.co/${REPOS.mnn}/resolve/main/${entry.path}`,
      size: entry.lfs?.size ?? entry.size,
      repo: REPOS.mnn,
    });
  }

  for (const entry of qnnFiles) {
    if (entry.type !== 'file') continue;
    const parsed = parseFileName(entry.path, 'qnn');
    if (!parsed) continue;
    models.push({
      ...parsed,
      downloadUrl: `https://huggingface.co/${REPOS.qnn}/resolve/main/${entry.path}`,
      size: entry.lfs?.size ?? entry.size,
      repo: REPOS.qnn,
    });
  }

  for (const entry of upscalerFiles) {
    if (entry.type !== 'file' || !entry.path.endsWith('.bin')) continue;
    const parsed = parseFileName(entry.path, 'upscaler');
    if (!parsed) continue;
    models.push({
      ...parsed,
      downloadUrl: `https://huggingface.co/${REPOS.upscaler}/resolve/main/${entry.path}`,
      size: entry.lfs?.size ?? entry.size,
      repo: REPOS.upscaler,
    });
  }

  // Sort: GPU first, then NPU, then Upscalers
  models.sort((a, b) => {
    if (a.backend !== b.backend) {
      if (a.backend === 'upscaler') return 1;
      if (b.backend === 'upscaler') return -1;
      return a.backend === 'mnn' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  cachedModels = models;
  cacheTimestamp = Date.now();
  return models;
}

export function getVariantLabel(variant?: string): string | undefined {
  return variant ? VARIANT_LABELS[variant] : undefined;
}

export function guessStyle(name: string): string {
  const lower = name.toLowerCase();
  if (
    lower.includes('reality') ||
    lower.includes('realistic') ||
    lower.includes('chillout') ||
    lower.includes('photo')
  ) {
    return 'photorealistic';
  }
  if (lower.includes('upscaler')) {
    return 'utility';
  }
  return 'anime';
}
