/**
 * pathResolver.ts
 *
 * Utilidades para resolver URIs content:// de Android a rutas reales del
 * sistema de archivos, evitando copiar archivos que ya viven en el almacenamiento
 * externo del dispositivo (p. ej. /storage/emulated/0/Download/).
 */

import { Platform, NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Resultado de la resolución de una URI de documento.
 */
export interface ResolvedPath {
  /** Ruta real en el sistema de archivos si se pudo resolver, de lo contrario null. */
  realPath: string | null;
  /** Indica que la ruta apunta a un archivo ya accesible directamente (no necesita copia). */
  isDirectAccess: boolean;
}

/**
 * Lista de prefijos de directorios que son accesibles directamente por la app
 * sin necesidad de copiar (almacenamiento externo compartido).
 */
const EXTERNAL_PREFIXES = [
  '/storage/emulated/',
  '/sdcard/',
  '/mnt/sdcard/',
];

function isExternalPath(p: string): boolean {
  return EXTERNAL_PREFIXES.some(prefix => p.startsWith(prefix));
}

/**
 * Intenta extraer una ruta de filesystem real desde una URI content:// de Android.
 *
 * Estrategias (en orden):
 * 1. Si la URI ya es una ruta de archivo (`file://` o ruta absoluta) → devuelve directamente.
 * 2. Intenta resolver mediante el módulo nativo `RNFSManager.getRealPathFromURI` si está disponible.
 * 3. Intenta hacer stat del archivo vía `react-native-fs` con la URI original (RNFS soporta
 *    algunas content URIs en Android directamente desde Android 11+).
 * 4. Devuelve null si ninguna estrategia funcionó → el caller debe hacer copia.
 */
export async function resolveContentUri(uri: string, _hint?: string): Promise<ResolvedPath> {
  if (Platform.OS !== 'android') {
    // En iOS las URIs son file:// o paths directos tras el security-scoped bookmark
    const resolved = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
    return { realPath: resolved, isDirectAccess: true };
  }

  // ── Estrategia 1: URI ya es path absoluto ───────────────────────────────
  if (uri.startsWith('/')) {
    return { realPath: uri, isDirectAccess: isExternalPath(uri) };
  }

  if (uri.startsWith('file://')) {
    const path = uri.replace('file://', '');
    return { realPath: path, isDirectAccess: isExternalPath(path) };
  }

  // ── Estrategia 2: Módulo nativo RNFS (getRealPathFromURI) ────────────────
  try {
    // react-native-fs expone esto en algunas versiones
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rnfsManager = NativeModules.RNFSManager as any;
    if (typeof rnfsManager?.getRealPathFromURI === 'function') {
      const real: string = await rnfsManager.getRealPathFromURI(uri);
      if (real && real.startsWith('/')) {
        const exists = await RNFS.exists(real);
        if (exists) {
          return { realPath: real, isDirectAccess: isExternalPath(real) };
        }
      }
    }
  } catch {
    // No disponible o error
  }

  // ── Estrategia 3: stat directo de la content URI ─────────────────────────
  // RNFS puede leer content:// URIs directamente en Android moderno
  try {
    const stat = await RNFS.stat(uri);
    // Si RNFS resolvió la URI y devolvió un path real
    if (stat.path && stat.path.startsWith('/') && stat.path !== uri) {
      const exists = await RNFS.exists(stat.path);
      if (exists) {
        return { realPath: stat.path, isDirectAccess: isExternalPath(stat.path) };
      }
    }
  } catch {
    // No soportado
  }

  // ── Sin resolución → el caller debe copiar ───────────────────────────────
  return { realPath: null, isDirectAccess: false };
}
