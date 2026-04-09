import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../../theme';
import { FONTS, SPACING, TYPOGRAPHY } from '../../constants';

// ──────────────────────────────────────────────────────────────────────────────
// Template engine: envuelve el código del LLM en un HTML completo con Tailwind
// ──────────────────────────────────────────────────────────────────────────────
function buildMasterTemplate(llmCode: string, isDark: boolean): string {
  const bg = isDark ? '#1A1A1A' : '#FFFFFF';
  const text = isDark ? '#F1EFE8' : '#0A0A0A';

  // Script que mide la altura real del body y se la envía a React Native
  const autoHeightScript = `
    (function() {
      function sendHeight() {
        var h = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: h }));
      }
      // Primera medición
      document.addEventListener('DOMContentLoaded', sendHeight);
      // Repetición por si hay imágenes/animaciones que cambian el tamaño
      window.addEventListener('load', sendHeight);
      // Observa mutaciones del DOM (p.ej. JS que inserta elementos)
      var obs = new MutationObserver(sendHeight);
      obs.observe(document.body, { childList: true, subtree: true, attributes: true });
      // Fallback con timeout por si todo lo demás falla
      setTimeout(sendHeight, 300);
      setTimeout(sendHeight, 800);
      setTimeout(sendHeight, 1500);
    })();
  `;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body {
      margin: 0;
      padding: 12px;
      background-color: ${bg};
      color: ${text};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-text-size-adjust: 100%;
      box-sizing: border-box;
    }
    *, *::before, *::after { box-sizing: border-box; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${llmCode}
  <script>${autoHeightScript}</script>
</body>
</html>
  `.trim();
}

// ──────────────────────────────────────────────────────────────────────────────
// Constantes de UI
// ──────────────────────────────────────────────────────────────────────────────
const MIN_WEBVIEW_HEIGHT = 80;
const DEFAULT_WEBVIEW_HEIGHT = 200;

// ──────────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────────
interface ArtifactCanvasProps {
  /** Código HTML/JS/CSS generado por el LLM */
  code: string;
  /** Lenguaje del bloque de código (html, css, artifact, etc.) */
  language?: string;
}

type ViewMode = 'preview' | 'code';

export function ArtifactCanvas({ code, language }: Readonly<ArtifactCanvasProps>) {
  const { colors, isDark } = useTheme();
  const [mode, setMode] = useState<ViewMode>('preview');
  const [webViewHeight, setWebViewHeight] = useState(DEFAULT_WEBVIEW_HEIGHT);
  const [isLoaded, setIsLoaded] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const htmlContent = buildMasterTemplate(code, isDark);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'height' && typeof data.value === 'number') {
        const clampedHeight = Math.max(MIN_WEBVIEW_HEIGHT, Math.ceil(data.value));
        setWebViewHeight(clampedHeight);
      }
    } catch {
      // Ignora mensajes que no son nuestros
    }
  }, []);

  const styles = createStyles(colors, isDark);

  const headerLabel = language === 'artifact' ? 'Artifact' : 'HTML Preview';

  return (
    <View style={styles.container}>
      {/* ── Barra de encabezado ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.dot} />
          <Text style={styles.headerTitle}>{headerLabel}</Text>
        </View>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, mode === 'preview' && styles.tabActive]}
            onPress={() => setMode('preview')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, mode === 'preview' && styles.tabTextActive]}>
              Vista Previa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'code' && styles.tabActive]}
            onPress={() => setMode('code')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, mode === 'code' && styles.tabTextActive]}>
              Código
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Contenido ── */}
      {mode === 'preview' ? (
        <View style={[styles.webViewWrapper, { height: webViewHeight }]}>
          {!isLoaded && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Cargando vista previa…</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: htmlContent, baseUrl: 'about:blank' }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            allowUniversalAccessFromFileURLs={true}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            onMessage={handleMessage}
            onLoad={() => setIsLoaded(true)}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            // Desactiva scroll interno para que React Native maneje el scroll
            scrollEnabled={false}
            // Android: permite que el contenido se renderice correctamente
            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.codeScroll}
          horizontal={false}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Text style={styles.codeText} selectable={true}>
              {code}
            </Text>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Estilos
// ──────────────────────────────────────────────────────────────────────────────
function createStyles(colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    container: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginVertical: SPACING.sm,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: 8,
      backgroundColor: colors.surfaceLight,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    headerTitle: {
      ...TYPOGRAPHY.label,
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    tabRow: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      borderRadius: 8,
      padding: 2,
      gap: 2,
    },
    tab: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 11,
      fontWeight: '500' as const,
      color: colors.textMuted,
    },
    tabTextActive: {
      color: '#FFFFFF',
      fontWeight: '600' as const,
    },
    webViewWrapper: {
      width: '100%',
      minHeight: MIN_WEBVIEW_HEIGHT,
      backgroundColor: colors.background,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      zIndex: 1,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    codeScroll: {
      maxHeight: 320,
      backgroundColor: colors.surfaceLight,
      padding: SPACING.md,
    },
    codeText: {
      fontFamily: FONTS.mono,
      fontSize: 12,
      color: colors.text,
      lineHeight: 18,
    },
  });
}
