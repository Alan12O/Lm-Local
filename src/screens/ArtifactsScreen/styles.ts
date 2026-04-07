import { StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../constants';
import type { ThemeColors, ThemeShadows } from '../../theme';

export const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: colors.text,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: colors.textMuted,
    marginTop: 8,
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  info: {
    flex: 1,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700' as const,
    color: colors.text,
  },
  cardDescription: {
    ...TYPOGRAPHY.meta,
    color: colors.textMuted,
    marginTop: 2,
  },
});
