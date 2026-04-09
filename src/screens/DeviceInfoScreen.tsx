import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { useAppStore } from '../stores';
import { hardwareService } from '../services';

export const DeviceInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const { deviceInfo } = useAppStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const totalRamGB = hardwareService.getTotalMemoryGB();
  const deviceTier = hardwareService.getDeviceTier();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispositivo</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ESPECIFICACIONES</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Modelo</Text>
              <Text style={styles.infoValue}>{deviceInfo?.deviceModel}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sistema</Text>
              <Text style={styles.infoValue}>
                {deviceInfo?.systemName} {deviceInfo?.systemVersion}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>RAM Total</Text>
              <Text style={styles.infoValue}>{totalRamGB.toFixed(1)} GB</Text>
            </View>
            <View style={[styles.infoRow, styles.lastRow]}>
              <Text style={styles.infoLabel}>Nivel</Text>
              <Text style={styles.tierBadge}>
                {deviceTier === 'low' ? 'Bajo' : deviceTier === 'medium' ? 'Medio' : deviceTier === 'high' ? 'Alto' : 'Flagship'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COMPATIBILIDAD</Text>
          <View style={styles.card}>
            <Text style={styles.description}>
              Tu nivel de dispositivo determina qué modelos funcionarán mejor. Una RAM mayor permite modelos más complejos.
            </Text>

            <View style={styles.tierList}>
              {[
                { key: 'low', name: 'Bajo', desc: '< 4GB RAM', sub: 'Modelos básicos' },
                { key: 'medium', name: 'Medio', desc: '4-6GB RAM', sub: 'La mayoría' },
                { key: 'high', name: 'Alto', desc: '> 6GB RAM', sub: 'Todos los modelos' },
                { key: 'flagship', name: 'Flagship', desc: '8GB+ RAM', sub: 'Modelos grandes' },
              ].map((item, index, arr) => (
                <View 
                  key={item.key} 
                  style={[
                    styles.tierItem, 
                    deviceTier === item.key && styles.tierItemActive,
                    index === arr.length - 1 && { borderBottomWidth: 0 }
                  ]}
                >
                  <View style={styles.tierTextContainer}>
                    <Text style={[styles.tierName, deviceTier === item.key && styles.tierNameActive]}>
                      {item.name}
                    </Text>
                    <Text style={styles.tierDesc}>{item.desc}</Text>
                  </View>
                  <Text style={styles.tierSub}>{item.sub}</Text>
                  {deviceTier === item.key && <Icon name="check" size={16} color={colors.primary} />}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) => ({
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
  headerTitle: {
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
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.lg,
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
  infoLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  infoValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
  },
  tierBadge: {
    ...TYPOGRAPHY.meta,
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.primary,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierList: {
    marginTop: -SPACING.md,
  },
  tierItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tierItemActive: {
    backgroundColor: 'transparent',
  },
  tierTextContainer: {
    flex: 1,
  },
  tierName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
  },
  tierNameActive: {
    color: colors.primary,
  },
  tierDesc: {
    ...TYPOGRAPHY.meta,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  tierSub: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginRight: 12,
  },
});
