import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from '../components/Button';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { AnimatedEntry } from '../components/AnimatedEntry';
import { AnimatedListItem } from '../components/AnimatedListItem';
import { useFocusTrigger } from '../hooks/useFocusTrigger';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { useCharacterStore, useChatStore } from '../stores';
import { AICharacter } from '../types';
import { RootStackParamList, MainTabParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Characters'>;

export const CharactersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const focusTrigger = useFocusTrigger();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { characters, deleteCharacter } = useCharacterStore();
  const { conversations } = useChatStore();
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);

  // Get chat count for a character (uses projectId under the hood)
  const getChatCount = (characterId: string) => {
    return conversations.filter((c) => c.projectId === characterId).length;
  };

  const handleCharacterPress = (character: AICharacter) => {
    navigation.navigate('CharacterDetail', { characterId: character.id });
  };

  const handleDeleteCharacter = (character: AICharacter) => {
    setAlertState(showAlert(
      'Eliminar Personaje',
      `¿Deseas eliminar a "${character.name}"? Los chats asociados permanecerán.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setAlertState(hideAlert());
            deleteCharacter(character.id);
          },
        },
      ]
    ));
  };

  const renderRightActions = (character: AICharacter) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleDeleteCharacter(character)}
    >
      <Icon name="trash-2" size={16} color={colors.error} />
    </TouchableOpacity>
  );

  const handleNewCharacter = () => {
    navigation.navigate('CharacterEdit', {});
  };

  const renderCharacter = ({ item, index }: { item: AICharacter; index: number }) => {
    const chatCount = getChatCount(item.id);

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        containerStyle={styles.swipeableContainer}
      >
        <AnimatedListItem
          index={index}
          trigger={focusTrigger}
          style={styles.characterItem}
          onPress={() => handleCharacterPress(item)}
        >
          <View style={[styles.characterIcon, { backgroundColor: (item.themeColor?.startsWith('#') ? item.themeColor : (item.icon?.startsWith('#') ? item.icon : colors.primary)) + '20' }]}>
            <Text style={[styles.characterIconText, { color: (item.themeColor?.startsWith('#') ? item.themeColor : (item.icon?.startsWith('#') ? item.icon : colors.primary)) }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.characterContent}>
            <View style={styles.characterNameRow}>
              <Text style={styles.characterName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.chatCountTag}>
                <Icon name="message-circle" size={8} color={colors.textMuted} />
                <Text style={styles.chatCountText}>{chatCount}</Text>
              </View>
            </View>
            <Text style={styles.characterDescription} numberOfLines={1}>
              {item.description || 'Sin descripción'}
            </Text>
          </View>
          <Icon name="chevron-right" size={14} color={colors.textMuted} />
        </AnimatedListItem>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Personajes IA</Text>
        <Button
          title="Nuevo"
          variant="primary"
          size="small"
          onPress={handleNewCharacter}
          icon={<Icon name="plus" size={16} color={colors.primary} />}
        />
      </View>

      <Text style={styles.subtitle}>
        Crea personajes con personalidades únicas para hacer roleplay.
      </Text>

      {characters.length === 0 ? (
        <View style={styles.emptyState}>
          <AnimatedEntry index={0} staggerMs={60} trigger={focusTrigger}>
            <View style={styles.emptyIcon}>
              <Icon name="users" size={20} color={colors.textMuted} />
            </View>
          </AnimatedEntry>
          <AnimatedEntry index={1} staggerMs={60} trigger={focusTrigger}>
            <Text style={styles.emptyTitle}>Sin personajes virtuales</Text>
          </AnimatedEntry>
          <AnimatedEntry index={2} staggerMs={60} trigger={focusTrigger}>
            <Text style={styles.emptyText}>
              Crea tu primer personaje de IA definiendo su rol, saludo y reglas.
            </Text>
          </AnimatedEntry>
          <AnimatedEntry index={3} staggerMs={60} trigger={focusTrigger}>
            <TouchableOpacity style={styles.emptyButton} onPress={handleNewCharacter}>
              <Icon name="plus" size={14} color={colors.primary} />
              <Text style={styles.emptyButtonText}>Crear Personaje</Text>
            </TouchableOpacity>
          </AnimatedEntry>
        </View>
      ) : (
        <FlatList
          data={characters}
          renderItem={renderCharacter}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS !== 'android'}
        />
      )}
      <CustomAlert {...alertState} onClose={() => setAlertState(hideAlert())} />
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  swipeableContainer: {
    overflow: 'visible' as const,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.small,
    zIndex: 1,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: colors.text,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  list: {
    padding: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  characterItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    marginBottom: SPACING.md,
    ...shadows.small,
  },
  characterIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: SPACING.md,
  },
  characterIconText: {
    ...TYPOGRAPHY.h3,
    color: colors.textMuted,
    lineHeight: 32, // to center properly
  },
  characterContent: {
    flex: 1,
  },
  characterNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  characterName: {
    ...TYPOGRAPHY.body,
    color: colors.text,
    fontWeight: '600' as const,
    flexShrink: 1,
  },
  characterDescription: {
    ...TYPOGRAPHY.meta,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chatCountTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: SPACING.sm,
    flexShrink: 0,
  },
  chatCountText: {
    ...TYPOGRAPHY.metaSmall,
    color: colors.textMuted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.xxl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    color: colors.text,
    fontWeight: '400' as const,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 18,
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 6,
    gap: SPACING.sm,
  },
  emptyButtonText: {
    ...TYPOGRAPHY.body,
    color: colors.primary,
    fontWeight: '400' as const,
  },
  deleteAction: {
    backgroundColor: colors.errorBackground,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    width: 60,
    borderRadius: 10,
    marginBottom: 16,
    marginLeft: 10,
  },
});
