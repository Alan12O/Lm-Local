import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { AttachStep } from 'react-native-spotlight-tour';
import { useNavigation, CommonActions, CompositeNavigationProp, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AnimatedEntry } from '../components/AnimatedEntry';
import { AnimatedListItem } from '../components/AnimatedListItem';

import { useFocusTrigger } from '../hooks/useFocusTrigger';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import packageJson from '../../package.json';
import { useAppStore } from '../stores';
import { RootStackParamList, MainTabParamList } from '../navigation/types';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'SettingsTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const focusTrigger = useFocusTrigger();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const completeChecklistStep = useAppStore((s) => s.completeChecklistStep);
  const resetChecklist = useAppStore((s) => s.resetChecklist);

  useEffect(() => {
    completeChecklistStep('exploredSettings');
  }, []);

  const handleResetOnboarding = () => {
    setOnboardingComplete(false);
    navigation.getParent()?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      })
    );
  };

  const navItems = [
    { icon: 'sliders', title: 'Ajustes de Modelo', desc: 'Prompts y rendimiento de generación', screen: 'ModelSettings' as const },
    { icon: 'wifi', title: 'Servidores Remotos', desc: 'Conectar a Ollama, LM Studio...', screen: 'RemoteServers' as const },
    { icon: 'mic', title: 'Ajustes de Voz', desc: 'Transcripción de texto a voz local', screen: 'VoiceSettings' as const },
    { icon: 'lock', title: 'Seguridad', desc: 'Contraseña y bloqueo de app', screen: 'SecuritySettings' as const },
    { icon: 'smartphone', title: 'Dispositivo', desc: 'Hardware y compatibilidad', screen: 'DeviceInfo' as const },
    { icon: 'hard-drive', title: 'Almacenamiento', desc: 'Modelos descargados y chats', screen: 'StorageSettings' as const },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Icon name="menu" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajustes</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Appearance Group */}
        <AnimatedEntry index={0} staggerMs={40} trigger={focusTrigger}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>APARIENCIA</Text>
            <View style={styles.appearanceCard}>
              <View style={styles.appearanceRow}>
                <View style={styles.appearanceLabelContainer}>
                  <Text style={styles.itemTitle}>Tema</Text>
                  <Text style={styles.itemDesc}>Cambia el aspecto visual del sistema</Text>
                </View>
                <View style={styles.themeSelector}>
                  {([
                    { mode: 'system' as const, icon: 'monitor' },
                    { mode: 'light' as const, icon: 'sun' },
                    { mode: 'dark' as const, icon: 'moon' },
                  ]).map(({ mode, icon }) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.themeOption,
                        themeMode === mode && styles.themeOptionActive,
                      ]}
                      onPress={() => setThemeMode(mode)}
                    >
                      <Icon
                        name={icon}
                        size={14}
                        color={themeMode === mode ? '#FFF' : colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </AnimatedEntry>

        {/* Navigation Group */}
        <AttachStep index={5} fill>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PREFERENCIAS</Text>
            <View style={styles.navGroup}>
              {navItems.map((item, index) => (
                <AnimatedListItem
                  key={item.screen}
                  index={index + 1}
                  staggerMs={40}
                  trigger={focusTrigger}
                  style={[
                    styles.navItem,
                    index === navItems.length - 1 && styles.navItemLast
                  ]}
                  onPress={() => navigation.navigate(item.screen)}
                >
                  <View style={styles.navItemIconContainer}>
                    <Icon name={item.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.navItemTextContainer}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDesc}>{item.desc}</Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.textDisabled} />
                </AnimatedListItem>
              ))}
            </View>
          </View>
        </AttachStep>

        {/* Support & Privacy */}
        <AnimatedEntry index={7} staggerMs={40} trigger={focusTrigger}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACERCA DE</Text>
            <View style={styles.navGroup}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Versión</Text>
                <Text style={styles.infoValue}>{packageJson.version}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.privacyCard}>
                <Icon name="shield" size={16} color={colors.primary} style={{ marginRight: 12, marginTop: 2 }} />
                <Text style={styles.privacyText}>
                  LM Local procesa toda la información localmente. Tu privacidad es nuestra prioridad.
                </Text>
              </View>
            </View>
          </View>
        </AnimatedEntry>

        {/* Development Group */}
        <AnimatedEntry index={9} staggerMs={40} trigger={focusTrigger}>
          <View style={styles.devSection}>
            <TouchableOpacity style={styles.devLink} onPress={handleResetOnboarding}>
              <Text style={styles.devLinkText}>Reiniciar Tutorial</Text>
            </TouchableOpacity>
            <Text style={styles.devSeparator}>•</Text>
            <TouchableOpacity style={styles.devLink} onPress={resetChecklist}>
              <Text style={styles.devLinkText}>Reiniciar Checklist</Text>
            </TouchableOpacity>
          </View>
        </AnimatedEntry>

      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
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
  menuButton: {
    marginRight: SPACING.md,
    padding: 4,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    fontSize: 28,
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
    marginBottom: 32,
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: 12,
    paddingLeft: 4,
  },
  appearanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  appearanceRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  appearanceLabelContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  itemTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
    fontSize: 16,
  },
  itemDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  themeSelector: {
    flexDirection: 'row' as const,
    backgroundColor: colors.surfaceLight,
    padding: 4,
    borderRadius: 12,
  },
  themeOption: {
    width: 36,
    height: 32,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderRadius: 8,
  },
  themeOptionActive: {
    backgroundColor: colors.primary,
    ...shadows.small,
  },
  navGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden' as const,
  },
  navItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  navItemLast: {
    borderBottomWidth: 0,
  },
  navItemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: SPACING.md,
  },
  navItemTextContainer: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    padding: SPACING.lg,
  },
  infoLabel: {
    ...TYPOGRAPHY.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: SPACING.lg,
  },
  privacyCard: {
    flexDirection: 'row' as const,
    padding: SPACING.lg,
    alignItems: 'flex-start' as const,
  },
  privacyText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  devSection: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  devLink: {
    padding: 8,
  },
  devLinkText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    textDecorationLine: 'underline' as const,
  },
  devSeparator: {
    marginHorizontal: 4,
    color: colors.textMuted,
  },
});
