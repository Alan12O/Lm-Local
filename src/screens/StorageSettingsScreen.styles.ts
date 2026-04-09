import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { StyleSheet } from 'react-native';

export const createStyles = (colors: ThemeColors, _shadows: ThemeShadows) => ({
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
  sectionTitle: {
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
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden' as const,
  },
  storageBar: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden' as const,
    marginBottom: SPACING.md,
  },
  storageUsed: {
    height: '100%' as const,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  storageLegend: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    ...TYPOGRAPHY.meta,
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  infoRowLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
  },
  infoLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    color: colors.text,
  },
  infoValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  modelRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modelInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  modelName: {
    ...TYPOGRAPHY.body,
    fontWeight: '500' as const,
    color: colors.text,
  },
  modelMeta: {
    ...TYPOGRAPHY.meta,
    color: colors.textMuted,
    marginTop: 2,
  },
  modelSize: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
  },
  hint: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 18,
    marginTop: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  clearAllButton: {
    padding: 4,
  },
  clearAllText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  orphanedRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  orphanedInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  orphanedName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500' as const,
    color: colors.text,
  },
  orphanedMeta: {
    ...TYPOGRAPHY.meta,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  deleteAllButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
  },
  deleteAllText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600' as const,
    color: colors.error,
  },
});
