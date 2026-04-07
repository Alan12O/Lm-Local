import { StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../constants';
import type { ThemeColors, ThemeShadows } from '../../theme';

export const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: colors.text,
  },
  scrollContent: {
    padding: 20,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    minHeight: 120,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    position: 'absolute' as const,
    top: 8,
    left: 12,
    ...TYPOGRAPHY.labelSmall,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    ...TYPOGRAPHY.body,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  toolbarTitle: {
    ...TYPOGRAPHY.labelSmall,
    color: colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
  },
  symbolGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 24,
  },
  symbolButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 50,
    alignItems: 'center' as const,
  },
  symbolText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  actionRow: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.background,
  },
  secondaryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.body,
    color: colors.textSecondary,
  },
});
