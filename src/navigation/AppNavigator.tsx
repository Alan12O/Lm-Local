import React, { useEffect, useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import { SpotlightTourProvider } from 'react-native-spotlight-tour';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { triggerHaptic } from '../utils/haptics';
import { useAppStore } from '../stores';
import { createSpotlightSteps } from '../components/onboarding/spotlightConfig';
import {
  OnboardingScreen,
  ModelDownloadScreen,
  ModelsScreen,
  ChatScreen,
  SettingsScreen,
  ProjectsScreen,
  ChatsListScreen,
  ProjectDetailScreen,
  ProjectEditScreen,
  ProjectChatsScreen,
  KnowledgeBaseScreen,
  DocumentPreviewScreen,
  DownloadManagerScreen,
  ModelSettingsScreen,
  VoiceSettingsScreen,
  DeviceInfoScreen,
  StorageSettingsScreen,
  SecuritySettingsScreen,
  GalleryScreen,
  RemoteServersScreen,
  ArtifactsScreen,
  MathScreen,
  CharactersScreen,
  CharacterDetailScreen,
  CharacterEditScreen,
  CharacterChatsScreen,
  ImageStudioScreen,
} from '../screens';
import {
  RootStackParamList,
  MainTabParamList,
} from './types';

import { CustomDrawerContent } from './CustomDrawerContent';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<MainTabParamList>();

const SCREEN_WIDTH = Dimensions.get('window').width;

// Animated tab icon with scale spring on focus
const TAB_ICON_MAP: Record<string, string> = {
  HomeTab: 'home',
  ChatsTab: 'message-circle',
  ArtifactsTab: 'layers',
  ModelsTab: 'cpu',
  SettingsTab: 'settings',
};

const TabBarIcon: React.FC<{ name: string; focused: boolean }> = ({ name, focused }) => {
  const { colors } = useTheme();
  const tabStyles = useThemedStyles(createTabBarStyles);
  const scale = useSharedValue(focused ? 1.1 : 1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, { damping: 15, stiffness: 150 });

  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={tabStyles.iconContainer}>
      <Animated.View style={animatedStyle}>
        <Icon
          name={TAB_ICON_MAP[name] || 'circle'}
          size={22}
          color={focused ? colors.primary : colors.textMuted}
        />
      </Animated.View>
      {focused && <View style={tabStyles.focusDot} />}
    </View>
  );
};

const createTabBarStyles = (colors: ThemeColors, _shadows: ThemeShadows) => ({
  iconContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  focusDot: {
    position: 'absolute' as const,
    top: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});

const mainTabsStyles = StyleSheet.create({
  container: { flex: 1 },
});

const MainTabs: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={mainTabsStyles.container}>
      <Drawer.Navigator
        backBehavior="history"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: SCREEN_WIDTH >= 768 ? 'permanent' : 'front',
          drawerStyle: {
            backgroundColor: colors.surface,
            width: Math.min(SCREEN_WIDTH * 0.8, 320),
            borderRightWidth: 0.5,
            borderRightColor: colors.borderLight,
          },
          overlayColor: 'rgba(0,0,0,0.4)',
        }}
      >
        <Drawer.Screen name="HomeTab" component={ChatScreen} />
        <Drawer.Screen name="ChatsTab" component={ChatsListScreen} />
        <Drawer.Screen name="ArtifactsTab" component={ArtifactsScreen} />
        <Drawer.Screen name="ModelsTab" component={ModelsScreen} />
        <Drawer.Screen name="SettingsTab" component={SettingsScreen} />
      </Drawer.Navigator>
    </View>
  );
};

// Root Navigator — SpotlightTourProvider wraps entire stack so all screens
// (both tab screens and RootStack screens) can use useSpotlightTour()
export const AppNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const downloadedModels = useAppStore((s) => s.downloadedModels);
  const steps = useMemo(() => createSpotlightSteps(), []);

  // Determine initial route
  let initialRoute: keyof RootStackParamList = 'Onboarding';
  if (hasCompletedOnboarding) {
    initialRoute = downloadedModels.length > 0 ? 'Main' : 'ModelDownload';
  }

  return (
    <SpotlightTourProvider
      steps={steps}
      overlayColor="black"
      overlayOpacity={isDark ? 0.78 : 0.62}
      onBackdropPress="stop"
      motion="fade"
      shape={{ type: 'rectangle', padding: 8 }}
    >
      <RootStack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="ModelDownload" component={ModelDownloadScreen} />
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen name="Chat" component={ChatScreen} />
        <RootStack.Screen name="Math" component={MathScreen} />
        <RootStack.Screen name="Projects" component={ProjectsScreen} />
        <RootStack.Screen name="Characters" component={CharactersScreen} />
        <RootStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
        <RootStack.Screen name="ProjectChats" component={ProjectChatsScreen} />
        <RootStack.Screen
          name="ProjectEdit"
          component={ProjectEditScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <RootStack.Screen name="CharacterDetail" component={CharacterDetailScreen} />
        <RootStack.Screen name="CharacterChats" component={CharacterChatsScreen} />
        <RootStack.Screen
          name="CharacterEdit"
          component={CharacterEditScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <RootStack.Screen name="KnowledgeBase" component={KnowledgeBaseScreen} />
        <RootStack.Screen name="DocumentPreview" component={DocumentPreviewScreen} />
        <RootStack.Screen name="ModelSettings" component={ModelSettingsScreen} />
        <RootStack.Screen name="RemoteServers" component={RemoteServersScreen} />
        <RootStack.Screen name="VoiceSettings" component={VoiceSettingsScreen} />
        <RootStack.Screen name="DeviceInfo" component={DeviceInfoScreen} />
        <RootStack.Screen name="StorageSettings" component={StorageSettingsScreen} />
        <RootStack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
        <RootStack.Screen
          name="DownloadManager"
          component={DownloadManagerScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <RootStack.Screen
          name="Gallery"
          component={GalleryScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <RootStack.Screen
          name="ImageStudio"
          component={ImageStudioScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </RootStack.Navigator>
    </SpotlightTourProvider>
  );
};
