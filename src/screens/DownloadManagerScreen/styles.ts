import type { ThemeColors, ThemeShadows } from '../../theme';
import { TYPOGRAPHY, SPACING } from '../../constants';

export const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
  flex1: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    zIndex: 1,
  },
  backButton: { 
    padding: 8, 
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: `${colors.text}08`,
  },
  title: {
    ...TYPOGRAPHY.h1,
    flex: 1,
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: colors.text,
    flex: 1,
    fontWeight: '700' as const,
  },
  countBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    ...TYPOGRAPHY.meta,
    color: colors.primary,
    fontWeight: '700' as const,
  },
  downloadCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: `${colors.text}03`,
    borderWidth: 1,
    borderColor: `${colors.text}08`,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  downloadHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: SPACING.md,
  },
  modelTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${colors.text}08`,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: SPACING.md,
  },
  downloadInfo: {
    flex: 1,
  },
  fileName: {
    ...TYPOGRAPHY.body,
    color: colors.text,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  modelId: {
    ...TYPOGRAPHY.meta,
    color: colors.textMuted,
    fontSize: 11,
  },
  cancelButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${colors.error}10`,
  },
  repairButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${colors.warning}10`,
    marginRight: 8,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${colors.error}10`,
  },
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: `${colors.text}10`,
    borderRadius: 2,
    marginBottom: SPACING.xs,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%' as const,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    ...TYPOGRAPHY.meta,
    color: colors.textMuted,
    fontSize: 10,
  },
  downloadMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.md,
  },
  quantBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quantText: {
    ...TYPOGRAPHY.meta,
    color: colors.primary,
    fontWeight: '700' as const,
    fontSize: 10,
  },
  imageBadge: {
    backgroundColor: `${colors.info}25`,
  },
  imageQuantText: {
    color: colors.info,
  },
  statusText: {
    ...TYPOGRAPHY.meta,
    color: colors.textSecondary,
  },
  sizeText: {
    ...TYPOGRAPHY.meta,
    color: colors.textSecondary,
  },
  dateText: {
    ...TYPOGRAPHY.meta,
    color: colors.textMuted,
  },
  emptyCard: {
    marginHorizontal: SPACING.lg,
    alignItems: 'center' as const,
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: colors.textSecondary,
    marginTop: SPACING.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  storageSection: {
    paddingHorizontal: SPACING.lg,
  },
  storageRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    padding: SPACING.lg,
    borderRadius: 12,
  },
  storageText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
  },
});
