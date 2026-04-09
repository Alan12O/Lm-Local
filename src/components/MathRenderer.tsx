import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Katex from 'react-native-katex';
import { useTheme } from '../theme';

interface MathRendererProps {
  latex: string;
  inline?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Renders LaTeX using react-native-katex (WebView-based).
 * Robust and compatible with React Native 0.83.1 architecture.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ latex, inline = false }) => {
  const { colors } = useTheme();

  // Inject \displaystyle for block math to ensure full-size fractions/integrals
  const finalLatex = !inline && !latex.includes('\\displaystyle') 
    ? `\\displaystyle ${latex}` 
    : latex;

  // Inline Math setup
  if (inline) {
    return (
      <View style={styles.inlineContainer}>
        <Katex
          expression={finalLatex}
          displayMode={false}
          style={styles.katexInline}
          inlineStyle={`
            html, body { 
              margin: 0;
              padding: 0;
              background-color: transparent !important;
            }
            body { 
              color: ${colors.primary};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 72px !important; /* Escalado masivo para compensar DPI */
            }
            .katex { 
              font-size: 1.2em !important; 
            }
          `}
        />
      </View>
    );
  }

  // Block Math setup
  return (
    <View 
      style={[
        styles.blockWrapper, 
        { 
          backgroundColor: colors.surfaceLight,
          borderColor: colors.border
        }
      ]}
    >
      <Katex
        expression={finalLatex}
        displayMode={true}
        style={styles.katexBlock}
        inlineStyle={`
          html, body { 
            margin: 0;
            padding: 0;
            background-color: transparent !important;
          }
          body { 
            color: ${colors.text};
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 100px !important; /* Escalado masivo para bloques */
            padding: 20px;
          }
          .katex-display { margin: 0; }
          .katex { font-size: 1.25em !important; }
        `}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inlineContainer: {
    height: 35, // Aumentado para evitar recortes con la nueva fuente masiva
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  katexInline: {
    width: 250, // Más ancho para prevenir recortes de WebViews pequeños
    height: '100%',
    backgroundColor: 'transparent',
  },
  blockWrapper: {
    marginVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    minHeight: 180, // Mucho más espacio vertical
  },
  katexBlock: {
    width: '100%',
    height: 250, // Altura drástica para fórmulas gigantes
    backgroundColor: 'transparent',
  },
});
