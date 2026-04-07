import React, { useCallback, useMemo } from 'react';
import { Linking, Pressable, Text, StyleSheet } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { useTheme } from '../theme';
import type { ThemeColors } from '../theme';
import { TYPOGRAPHY, SPACING, FONTS } from '../constants';
import { MathRenderer } from './MathRenderer';

/**
 * Escape asterisks used as multiplication operators (digit*digit) so
 * markdown-it doesn't treat them as emphasis markers.
 * Lookahead handles chains like 5*5*5*5 in a single pass.
 */
export function preprocessMarkdown(text: string): string {
  if (!text) return '';
  let processed = text;
  // 1. Convert block math $$...$$ to specialized code fences
  // Absorbe posibles backticks o asteriscos extra que arruinarían el layout.
  processed = processed.replace(/(?:\*\*|__)?[´`']?\$\$\s*([\s\S]+?)\s*\$\$[´`']?(?:\*\*|__)?/g, '\n\n```math-block\n$1\n```\n\n');
  
  // 2. Convert inline math $...$ to specialized code fences as well
  // WebViews cannot be nested inside <Text> nodes reliably in React Native (Android),
  // so we force all LaTeX to be rendered as standalone blocks by ensuring paragraph breaks (`\n\n`).
  processed = processed.replace(/(?:\*\*|__)?[´`']?\$([^\$\n]+?)\$[´`']?(?:\*\*|__)?/g, '\n\n```math-inline\n$1\n```\n\n');

  // 3. Original escape for asterisks
  return processed.replaceAll(/(\d)\*(?=\d)/g, String.raw`$1\*`);
}

const linkWrapperStyles = StyleSheet.create({
  pressable: { flexShrink: 1, paddingBottom: 6 },
});

/** Custom link rule that constrains the Pressable wrapper width */
function createLinkRule(onPress: (url: string) => void) {
  return (node: any, renderChildren: any, _parent: any) => (
    <Pressable
      key={node.key}
      accessibilityRole="link"
      style={linkWrapperStyles.pressable}
      onPress={() => onPress(node.attributes?.href ?? '')}
    >
      <Text>{renderChildren}</Text>
    </Pressable>
  );
}

interface MarkdownTextProps {
  children: string;
  dimmed?: boolean;
}

export function MarkdownText({ children, dimmed }: MarkdownTextProps) {
  const { colors } = useTheme();
  const markdownStyles = useMemo(
    () => createMarkdownStyles(colors, dimmed),
    [colors, dimmed],
  );

  const handleLinkPress = useCallback((url: string) => {
    Linking.openURL(url);
    return false;
  }, []);

  const processed = useMemo(() => preprocessMarkdown(children), [children]);
  
  const rules = useMemo(() => ({ 
    link: createLinkRule(handleLinkPress),
    fence: (node: any, _children: any, _parent: any, styles: any) => {
      // Handle block math
      if (node.content && node.attributes?.language === 'math-block') {
        const latex = node.content.trim();
        return <MathRenderer key={node.key} latex={latex} inline={false} />;
      }
      // Handle inline math forced as blocks
      if (node.content && node.attributes?.language === 'math-inline') {
        const latex = node.content.trim();
        return <MathRenderer key={node.key} latex={latex} inline={true} />;
      }
      // Render normal code blocks explicitly (the library does NOT fallback
      // when a custom rule returns false — it just renders nothing)
      let content = node.content;
      if (typeof content === 'string' && content.endsWith('\n')) {
        content = content.slice(0, -1);
      }
      return (
        <Text key={node.key} style={styles.fence}>
          {content}
        </Text>
      );
    },
  }), [handleLinkPress]);

  return (
    <Markdown style={markdownStyles} onLinkPress={handleLinkPress} rules={rules}>
      {processed}
    </Markdown>
  );
}

function createMarkdownStyles(colors: ThemeColors, dimmed?: boolean) {
  const textColor = dimmed ? colors.textSecondary : colors.text;

  return {
    body: {
      ...TYPOGRAPHY.body,
      color: textColor,
      lineHeight: 20,
      flexShrink: 1,
    },
    heading1: {
      ...TYPOGRAPHY.h1,
      color: textColor,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
    },
    heading2: {
      ...TYPOGRAPHY.h2,
      color: textColor,
      marginTop: SPACING.md,
      marginBottom: SPACING.xs,
    },
    heading3: {
      ...TYPOGRAPHY.h3,
      fontWeight: '600' as const,
      color: textColor,
      marginTop: SPACING.sm,
      marginBottom: 2,
    },
    heading4: {
      ...TYPOGRAPHY.h3,
      color: textColor,
      marginTop: SPACING.sm,
      marginBottom: 2,
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
      fontSize: 13,
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
      fontSize: 12,
      backgroundColor: colors.surfaceLight,
      color: textColor,
      borderRadius: 6,
      padding: SPACING.md,
      marginVertical: SPACING.sm,
      borderWidth: 0,
    },
    code_block: {
      fontFamily: FONTS.mono,
      fontSize: 12,
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
  };
}
