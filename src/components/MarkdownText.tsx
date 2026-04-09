import React, { useCallback, useMemo } from 'react';
import { Linking, Pressable, Text, StyleSheet, View } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { useTheme } from '../theme';
import type { ThemeColors } from '../theme';
import { TYPOGRAPHY, SPACING, FONTS } from '../constants';
import { MathRenderer } from './MathRenderer';
import { ArtifactCanvas } from './ArtifactCanvas';
import { useTextScale, TextScaleConfig } from '../contexts/TextScalingContext';

/**
 * Types for the math registry
 */
interface MathEntry {
  content: string;
  inline: boolean;
}

/**
 * Tokenization system to protect LaTeX from Markdown engine interference.
 * Returns the masked text and a registry of original math content.
 */
export function tokenizeMath(text: string): { maskedText: string; mathRegistry: Map<string, MathEntry> } {
  const mathRegistry = new Map<string, MathEntry>();
  if (!text) return { maskedText: '', mathRegistry };

  let counter = 0;
  let processed = text;

  // Function to create and register a token
  const register = (content: string, inline: boolean) => {
    const tokenId = `@@MATH_TOKEN_${counter++}@@`;
    mathRegistry.set(tokenId, { content, inline });
    return tokenId;
  };

  // 1. Extract block math
  
  // Standard $$...$$
  processed = processed.replace(/\$\$\s*([\s\S]+?)\s*\$\$/g, (_, content) => {
    return `\n\n${register(content.trim(), false)}\n\n`;
  });
  
  // LaTeX \[...\]
  processed = processed.replace(/\\\[\s*([\s\S]+?)\s*\\\]/g, (_, content) => {
    return `\n\n${register(content.trim(), false)}\n\n`;
  });
  
  // environments \begin{equation}...\end{equation} etc.
  processed = processed.replace(/\\begin\{(?:equation|align|gather|displaymath)\*?\}\s*([\s\S]+?)\s*\\end\{(?:equation|align|gather|displaymath)\*?\}/g, (match) => {
    return `\n\n${register(match.trim(), false)}\n\n`;
  });

  // 2. Extract inline math
  
  // Restrictive regex for $...$ to avoid currency collisions:
  // Requires: No space after first $, no space before last $.
  processed = processed.replace(/(^|[^\$])\$([^\$\s](?:[^\$]*?[^\$\s])?)\$(?!\$)/g, (match, prefix, content) => {
    return `${prefix}${register(content, true)}`;
  });

  // LaTeX \(...\)
  processed = processed.replace(/\\\(\s*([\s\S]+?)\s*\\\)/g, (_, content) => {
    return register(content.trim(), true);
  });

  // 3. Final escape for asterisks in formulas like 5*5 (outside math blocks)
  processed = processed.replaceAll(/(\d)\*(?=\d)/g, String.raw`$1\*`);

  return { maskedText: processed, mathRegistry };
}

const linkWrapperStyles = StyleSheet.create({
  pressable: { flexShrink: 1, paddingBottom: 6 },
});

/** Custom link rule that constrains the Pressable wrapper width */
function createLinkRule(onPress: (url: string) => void, selectable?: boolean) {
  return (node: any, renderChildren: any, _parent: any) => (
    <Pressable
      key={node.key}
      accessibilityRole="link"
      style={linkWrapperStyles.pressable}
      onPress={() => onPress(node.attributes?.href ?? '')}
    >
      <Text selectable={selectable}>{renderChildren}</Text>
    </Pressable>
  );
}

interface MarkdownTextProps {
  children: string;
  dimmed?: boolean;
  selectable?: boolean;
}

export function MarkdownText({ children, dimmed, selectable = true }: MarkdownTextProps) {
  const { colors } = useTheme();
  const scale = useTextScale();
  const textColor = dimmed ? colors.textMuted : colors.text;
  
  const markdownStyles = useMemo(
    () => createMarkdownStyles(colors, scale, dimmed),
    [colors, scale, dimmed],
  );

  const handleLinkPress = useCallback((url: string) => {
    Linking.openURL(url);
    return false;
  }, []);

  // Tokenize before Markdown sees it
  const { maskedText, mathRegistry } = useMemo(() => tokenizeMath(children), [children]);
  
  const rules = useMemo(() => ({ 
    link: createLinkRule(handleLinkPress, selectable),
    text: (node: any, _children: any, _parent: any, _styles: any) => {
      const content = node.content as string;
      const tokenRegex = /(@@MATH_TOKEN_\d+@@)/g;
      const parts = content.split(tokenRegex);
      
      if (parts.length === 1) {
        return (
          <Text 
            key={node.key} 
            style={[markdownStyles.body, { color: textColor }]} 
            selectable={selectable}
          >
            {content}
          </Text>
        );
      }

      // If we have math tokens, we MUST NOT nest them inside a <Text> node on Android
      // because it causes the WebView dimensions to collapse.
      return (
        <View key={node.key} style={markdownStyles.inlineMathWrapper}>
          {parts.map((p, i) => {
            const math = mathRegistry.get(p);
            if (math) {
              return <MathRenderer key={`${node.key}-${i}`} latex={math.content} inline={math.inline} />;
            }
            if (p === '') return null;
            return (
              <Text 
                key={`${node.key}-${i}`} 
                style={[markdownStyles.body, { color: textColor }]} 
                selectable={selectable}
              >
                {p}
              </Text>
            );
          })}
        </View>
      );
    },
    list_item: (node: any, children: any, _parent: any, styles: any) => {
      // Custom List Item Layout to fix bullet alignment and text overlap
      return (
        <View key={node.key} style={styles.listItemContainer}>
          <Text style={[styles.body, { marginRight: 8, color: textColor }]}>•</Text>
          <View style={styles.listItemContent}>
            {children}
          </View>
        </View>
      );
    },
    bullet_list: (node: any, children: any, _parent: any, styles: any) => (
      <View key={node.key} style={styles.listContainer}>
        {children}
      </View>
    ),
    ordered_list: (node: any, children: any, _parent: any, styles: any) => (
      <View key={node.key} style={styles.listContainer}>
        {children.map((child: any, index: number) => (
          <View key={`${node.key}-${index}`} style={styles.listItemContainer}>
            <Text style={[styles.body, { marginRight: 8, color: textColor }]}>{`${index + 1}.`}</Text>
            <View style={styles.listItemContent}>
              {child}
            </View>
          </View>
        ))}
      </View>
    ),
    textgroup: (node: any, children: any, _parent: any, styles: any) => (
      <View key={node.key} style={styles.textgroup}>
        {children}
      </View>
    ),
    paragraph: (node: any, children: any, _parent: any, styles: any) => (
      <View key={node.key} style={styles.paragraph}>
        {children}
      </View>
    ),
    heading1: (node: any, children: any, _parent: any, styles: any) => (
      <Text key={node.key} style={[styles.heading1, { color: textColor }]} selectable={selectable}>
        {children}
      </Text>
    ),
    heading2: (node: any, children: any, _parent: any, styles: any) => (
      <Text key={node.key} style={[styles.heading2, { color: textColor }]} selectable={selectable}>
        {children}
      </Text>
    ),
    heading3: (node: any, children: any, _parent: any, styles: any) => (
      <Text key={node.key} style={[styles.heading3, { color: textColor }]} selectable={selectable}>
        {children}
      </Text>
    ),
    heading4: (node: any, children: any, _parent: any, styles: any) => (
      <Text key={node.key} style={[styles.heading4, { color: textColor }]} selectable={selectable}>
        {children}
      </Text>
    ),
    fence: (node: any, _children: any, _parent: any, styles: any) => {
      let content = node.content as string;
      if (typeof content === 'string' && content.endsWith('\n')) {
        content = content.slice(0, -1);
      }
      // Lenguajes que deben renderizarse como artefactos visuales interactivos
      const lang: string = (node.sourceInfo ?? node.lang ?? '').toLowerCase().trim();
      const isArtifact = lang === 'html' || lang === 'artifact' || lang === 'html+css' || lang === 'svg';
      if (isArtifact) {
        return <ArtifactCanvas key={node.key} code={content} language={lang} />;
      }
      return (
        <Text key={node.key} style={styles.fence} selectable={selectable}>
          {content}
        </Text>
      );
    },
  }), [handleLinkPress, selectable, textColor, mathRegistry, markdownStyles]);

  return (
    <Markdown style={markdownStyles} onLinkPress={handleLinkPress} rules={rules}>
      {maskedText}
    </Markdown>
  );
}

function createMarkdownStyles(colors: ThemeColors, scale: TextScaleConfig, dimmed?: boolean) {
  const textColor = dimmed ? colors.textMuted : colors.text;

  return {
    body: {
      ...TYPOGRAPHY.body,
      color: textColor,
      lineHeight: scale.body.lineHeight,
      flexShrink: 1,
      fontStyle: dimmed ? ('italic' as const) : ('normal' as const),
      fontSize: dimmed ? scale.small.fontSize : scale.body.fontSize,
    },
    text: {
      color: textColor,
    },
    textgroup: {
      color: textColor,
    },
    heading1: {
      ...TYPOGRAPHY.h1,
      color: textColor,
      fontSize: scale.heading.fontSize + 4,
      fontWeight: scale.heading.fontWeight,
      marginTop: SPACING.md,
      marginBottom: scale.heading.marginBottom + 4,
    },
    heading2: {
      ...TYPOGRAPHY.h2,
      color: textColor,
      fontSize: scale.heading.fontSize + 2,
      fontWeight: scale.heading.fontWeight,
      marginTop: SPACING.md,
      marginBottom: scale.heading.marginBottom + 2,
    },
    heading3: {
      ...TYPOGRAPHY.h3,
      fontSize: scale.heading.fontSize,
      fontWeight: scale.heading.fontWeight,
      color: textColor,
      marginTop: SPACING.sm,
      marginBottom: scale.heading.marginBottom,
    },
    heading4: {
      ...TYPOGRAPHY.h3,
      fontSize: scale.heading.fontSize - 2,
      fontWeight: scale.heading.fontWeight,
      color: textColor,
      marginTop: SPACING.sm,
      marginBottom: scale.heading.marginBottom,
    },
    strong: {
      fontWeight: '700' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
    s: {
      textDecorationLine: 'line-through' as const,
    },
    code_inline: {
      fontFamily: FONTS.mono,
      fontSize: scale.small.fontSize,
      backgroundColor: colors.surfaceLight,
      color: colors.primary,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
      // Override default border
      borderWidth: 0,
    },
    fence: {
      fontFamily: FONTS.mono,
      fontSize: scale.small.fontSize - 1,
      backgroundColor: colors.surfaceLight,
      color: textColor,
      borderRadius: 6,
      padding: SPACING.md,
      marginVertical: SPACING.sm,
      borderWidth: 0,
    },
    code_block: {
      fontFamily: FONTS.mono,
      fontSize: scale.small.fontSize - 1,
      backgroundColor: colors.surfaceLight,
      color: textColor,
      borderRadius: 6,
      padding: SPACING.md,
      marginVertical: SPACING.sm,
      borderWidth: 0,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: SPACING.md,
      marginLeft: 0,
      marginVertical: SPACING.sm,
      backgroundColor: colors.surfaceLight,
      borderRadius: 0,
      paddingVertical: SPACING.xs,
    },
    bullet_list: {
      marginVertical: SPACING.xs,
    },
    ordered_list: {
      marginVertical: SPACING.xs,
    },
    list_item: {
      marginVertical: 4,
    },
    // Tables
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      marginVertical: SPACING.sm,
    },
    thead: {
      backgroundColor: colors.surfaceLight,
    },
    th: {
      padding: SPACING.sm,
      borderWidth: 0.5,
      borderColor: colors.border,
      fontWeight: '600' as const,
    },
    td: {
      padding: SPACING.sm,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    tr: {
      borderBottomWidth: 0.5,
      borderColor: colors.border,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: SPACING.md,
    },
    link: {
      color: colors.primary,
      textDecorationLine: 'underline' as const,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: SPACING.sm,
    },
    // Image (unlikely in LLM text but handle gracefully)
    image: {
      borderRadius: 6,
    },
    // Flex Layout Helpers
    inlineMathWrapper: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
    },
    listItemContainer: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      marginVertical: 4,
    },
    listItemContent: {
      flex: 1,
    },
    listContainer: {
      marginVertical: SPACING.xs,
    },
  };
}
