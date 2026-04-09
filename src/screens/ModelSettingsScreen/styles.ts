import type { ThemeColors, ThemeShadows } from '../../theme';
import { TYPOGRAPHY, SPACING } from '../../constants';
import { StyleSheet } from 'react-native';

export const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
  flex1: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  backButton: {
    marginRight: SPACING.md,
    padding: 4,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: 12,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: SPACING.lg,
    overflow: 'hidden' as const,
  },
  settingHelp: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  textArea: {
    ...TYPOGRAPHY.bodySmall,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: SPACING.md,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top' as const,
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  toggleLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
  },
  toggleDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  sliderHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  sliderLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
  },
  sliderValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  sliderDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  slider: {
    width: '100%' as const,
    height: 40,
  },
  accordionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: SPACING.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  accordionTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
  },
  resetButton: {
    alignSelf: 'center' as const,
    marginTop: SPACING.xl,
  },
  advancedToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
    gap: 8,
  },
  advancedToggleText: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    color: colors.textMuted,
  },
  levelSelector: {
    flexDirection: 'row' as const,
    backgroundColor: colors.surfaceLight,
    padding: 2,
    borderRadius: 10,
    marginTop: SPACING.sm,
  },
  levelOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center' as const,
    borderRadius: 8,
  },
  levelOptionActive: {
    backgroundColor: colors.primary,
    ...shadows.small,
  },
  levelOptionText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
  levelOptionTextActive: {
    color: '#FFF',
  },
});
