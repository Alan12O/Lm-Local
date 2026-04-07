import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { useChatStore, useAppStore } from '../stores';
import { Conversation } from '../types';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { triggerHaptic } from '../utils/haptics';

export const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { navigation } = props;
  const { conversations, setActiveConversation } = useChatStore();
  
  // Sort conversations by updatedAt
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const handleNewChat = () => {
    const existingEmpty = conversations.find(c => c.messages.length === 0 && !c.isIncognito);
    if (existingEmpty) {
      setActiveConversation(existingEmpty.id);
    } else {
      setActiveConversation(null);
    }
    navigation.navigate('HomeTab');
    navigation.closeDrawer();
  };


  const handleChatPress = (conversation: Conversation) => {
    setActiveConversation(conversation.id);
    navigation.navigate('HomeTab');
    navigation.closeDrawer();
  };

  const { deleteConversation } = useChatStore();
  const handleDeleteChat = (id: string) => {
    triggerHaptic('impactMedium');
    deleteConversation(id);
  };

  const renderRightActions = (id: string, progress: any, dragX: any) => {
    return (
      <TouchableOpacity 
        style={styles.deleteAction}
        onPress={() => handleDeleteChat(id)}
      >
        <Icon name="trash-2" size={16} color={colors.background} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.lg }]}>
        {/* New Chat Button */}
        <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat}>
          <Icon name="plus" size={18} color={colors.background} />
          <Text style={styles.newChatText}>Nuevo chat</Text>
        </TouchableOpacity>

        {/* History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recientes</Text>
          {sortedConversations.length === 0 ? (
            <Text style={styles.emptyText}>Sin chats aún</Text>
          ) : (
            sortedConversations.slice(0, 15).map((chat) => (
              <Swipeable
                key={chat.id}
                renderRightActions={(prog, drag) => renderRightActions(chat.id, prog, drag)}
                friction={2}
                rightThreshold={40}
              >
                <TouchableOpacity
                  style={styles.chatItem}
                  onPress={() => handleChatPress(chat)}
                >
                  <Icon name="message-square" size={14} color={colors.textSecondary} style={{ marginRight: SPACING.sm }} />
                  <Text style={styles.chatTitle} numberOfLines={1}>{chat.title}</Text>
                </TouchableOpacity>
              </Swipeable>
            ))
          )}
        </View>

        {/* Navigation Links */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Projects')}>
            <Icon name="folder" size={16} color={colors.textSecondary} />
            <Text style={styles.navItemText}>Proyectos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ModelsTab')}>
            <Icon name="cpu" size={16} color={colors.textSecondary} />
            <Text style={styles.navItemText}>Modelos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('RemoteServers')}>
            <Icon name="cloud" size={16} color={colors.textSecondary} />
            <Text style={styles.navItemText}>Modelos Remotos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ArtifactsTab')}>
            <Icon name="layers" size={16} color={colors.textSecondary} />
            <Text style={styles.navItemText}>Artefactos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Characters')}>
            <Icon name="users" size={16} color={colors.textSecondary} />
            <Text style={styles.navItemText}>Personajes</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      {/* Footer / User Settings */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('SettingsTab')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>U</Text>
          </View>
          <Text style={styles.footerItemText}>Ajustes y Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  newChatBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xl,
    ...shadows.medium,
  },
  newChatText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500' as const,
    color: colors.background,
    marginLeft: SPACING.sm,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.meta,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  emptyText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic' as const,
    paddingHorizontal: SPACING.xs,
  },
  chatItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  deleteAction: {
    backgroundColor: colors.error,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    width: 60,
    height: '100%' as const,
    borderRadius: 6,
    marginLeft: 8,
  },
  chatTitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.text,
    flex: 1,
  },
  navItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xs,
  },
  navItemText: {
    ...TYPOGRAPHY.body,
    color: colors.text,
    marginLeft: SPACING.md,
  },
  footer: {
    borderTopWidth: 0.5,
    borderColor: colors.borderLight,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  footerItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: SPACING.sm,
  },
  avatarText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: 'bold' as const,
    color: colors.background,
  },
  footerItemText: {
    ...TYPOGRAPHY.body,
    color: colors.text,
    fontWeight: "500" as "500",
  },
});
