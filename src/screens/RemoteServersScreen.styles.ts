import type { ThemeColors, ThemeShadows } from '../theme/palettes';
import { TYPOGRAPHY, SPACING } from '../constants';

export function createStyles(colors: ThemeColors, shadows: ThemeShadows) {
  return {
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
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xxl,
    },
    emptyState: {
      alignItems: 'center' as const,
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 24,
    },
    emptyTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      paddingHorizontal: 32,
      marginBottom: 32,
    },
    serverItem: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: SPACING.lg,
      marginBottom: 16,
    },
    serverHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    serverInfo: {
      flex: 1,
    },
    serverName: {
      ...TYPOGRAPHY.body,
      fontWeight: '600' as const,
      color: colors.text,
      fontSize: 16,
    },
    serverEndpoint: {
      ...TYPOGRAPHY.meta,
      color: colors.textMuted,
      marginTop: 2,
    },
    statusContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginTop: 12,
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusDotActive: {
      backgroundColor: colors.success,
    },
    statusDotInactive: {
      backgroundColor: colors.error,
    },
    statusDotUnknown: {
      backgroundColor: colors.textMuted,
    },
    statusText: {
      ...TYPOGRAPHY.meta,
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    serverActions: {
      flexDirection: 'row' as const,
      marginTop: 20,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      gap: 8,
    },
    actionButtonText: {
      ...TYPOGRAPHY.meta,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    deleteButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.error,
    },
    deleteButtonText: {
      color: colors.error,
    },
    addButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      marginTop: 8,
      gap: 10,
      ...shadows.small,
    },
    addButtonText: {
      ...TYPOGRAPHY.body,
      fontWeight: '700' as const,
      color: '#FFF',
    },
    scanButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: 'transparent',
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 12,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scanButtonText: {
      ...TYPOGRAPHY.bodySmall,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    infoCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 16,
      padding: SPACING.lg,
      marginTop: 24,
    },
    infoTitle: {
      ...TYPOGRAPHY.bodySmall,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 8,
    },
    infoText: {
      ...TYPOGRAPHY.bodySmall,
      color: colors.textMuted,
      lineHeight: 20,
    },
  };
}
