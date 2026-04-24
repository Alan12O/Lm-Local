import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from '../components/Button';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { useTheme, useThemedStyles } from '../theme';
import { createStyles } from './ProjectDetailScreen.styles';
import { useChatStore, useCharacterStore, useAppStore, useRemoteServerStore } from '../stores';
import { Conversation } from '../types';
import { RootStackParamList } from '../navigation/types';
import { KnowledgeBaseSection } from './ProjectDetailKnowledgeBaseSection';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'CharacterDetail'>;

export const CharacterDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { characterId } = route.params;
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const { colors } = useTheme();
  // We reuse ProjectDetailScreen styles to maintain UI consistency
  const styles = useThemedStyles(createStyles);

  const { getCharacter, deleteCharacter } = useCharacterStore();
  const { conversations, deleteConversation, setActiveConversation, createConversation, addMessage } = useChatStore();
  const { downloadedModels, activeModelId } = useAppStore();

  const activeServerId = useRemoteServerStore((s) => s.activeServerId);
  const activeRemoteTextModelId = useRemoteServerStore((s) => s.activeRemoteTextModelId);

  const character = getCharacter(characterId);
  const hasLocalModels = downloadedModels.length > 0;
  const hasRemoteModel = !!(activeServerId && activeRemoteTextModelId);
  const hasModels = hasLocalModels || hasRemoteModel;

  // Get chats for this character
  const characterChats = conversations
    .filter((c) => c.projectId === characterId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleChatPress = (conversation: Conversation) => {
    setActiveConversation(conversation.id);
    navigation.navigate('Main', { 
      screen: 'HomeTab', 
      params: { conversationId: conversation.id } 
    } as any);
  };

  const handleNewChat = () => {
    if (!hasModels) {
      setAlertState(showAlert('Sin Modelo', 'Por favor descarga un modelo local o configura uno remoto en Ajustes.'));
      return;
    }
    
    // Prioritize active model, then first local model, then remote
    const modelId = activeModelId || (hasLocalModels ? downloadedModels[0].id : activeRemoteTextModelId);
    
    if (modelId) {
      const newConversationId = createConversation(modelId, undefined, characterId);
      
      // Perform initial message injection immediately
      if (character?.firstMessage) {
        addMessage(newConversationId, { 
          role: 'assistant', 
          content: character.firstMessage, 
          isSystemInfo: true 
        });
      }
      
      // Ensure state is synced before navigation
      setActiveConversation(newConversationId);
      navigation.navigate('Main', { 
        screen: 'HomeTab', 
        params: { conversationId: newConversationId, projectId: characterId } 
      } as any);
    }
  };

  const handleDeleteCharacter = () => {
    setAlertState(showAlert(
      'Eliminar Personaje',
      `¿Eliminar "${character?.name}"? Esto no eliminará los chats asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteCharacter(characterId);
            navigation.goBack();
          },
        },
      ]
    ));
  };

  const handleDeleteChat = (conversation: Conversation) => {
    setAlertState(showAlert(
      'Eliminar Chat',
      `¿Deseas eliminar "${conversation.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteConversation(conversation.id),
        },
      ]
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderChatRightActions = (conversation: Conversation) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleDeleteChat(conversation)}
    >
      <Icon name="trash-2" size={16} color={colors.error} />
    </TouchableOpacity>
  );

  const renderChat = ({ item }: { item: Conversation }) => {
    const lastMessage = item.messages[item.messages.length - 1];

    return (
      <Swipeable
        renderRightActions={() => renderChatRightActions(item)}
        overshootRight={false}
        containerStyle={styles.swipeableContainer}
      >
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => handleChatPress(item)}
        >
          <View style={styles.chatIcon}>
            <Icon name="message-circle" size={14} color={colors.textMuted} />
          </View>
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.chatDate}>{formatDate(item.updatedAt)}</Text>
            </View>
            {lastMessage && (
              <Text style={styles.chatPreview} numberOfLines={1}>
                {lastMessage.role === 'user' ? 'Tú: ' : ''}{lastMessage.content}
              </Text>
            )}
          </View>
          <Icon name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (!character) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Personaje no encontrado</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.errorLink}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.projectIcon, { backgroundColor: (character.themeColor?.startsWith('#') ? character.themeColor : (character.icon?.startsWith('#') ? character.icon : colors.primary)) + '30' }]}>
            <Text style={[styles.projectIconText, { color: (character.themeColor?.startsWith('#') ? character.themeColor : (character.icon?.startsWith('#') ? character.icon : colors.primary)) }]}>
              {character.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>{character.name}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CharacterEdit', { characterId })} style={styles.editButton}>
          <Icon name="edit-2" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionsContainer}>
        {/* Knowledge Base Section */}
        <View style={styles.sectionHalf}>
          <KnowledgeBaseSection
            projectId={characterId}
            colors={colors}
            styles={styles}
            setAlertState={setAlertState}
            onNavigateToKb={() => navigation.navigate('KnowledgeBase', { projectId: characterId })}
            onDocumentPress={(doc) => navigation.navigate('DocumentPreview', { filePath: doc.path, fileName: doc.name, fileSize: doc.size })}
          />
        </View>

        {/* Chats Section */}
        <View style={styles.sectionHalf}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => navigation.navigate('CharacterChats', { characterId })}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Chats</Text>
              {characterChats.length > 0 && (
                <Text style={styles.sectionCount}>{characterChats.length}</Text>
              )}
            </View>
            <View style={styles.sectionActions}>
              <Button
                title="Nuevo"
                variant="primary"
                size="small"
                onPress={handleNewChat}
                disabled={!hasModels}
                icon={<Icon name="plus" size={16} color={hasModels ? colors.primary : colors.textDisabled} />}
              />
              <Icon
                name="chevron-right"
                size={16}
                color={colors.textMuted}
                style={styles.navIcon}
              />
            </View>
          </TouchableOpacity>

          <ScrollView style={styles.sectionList} nestedScrollEnabled>
            {characterChats.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="message-circle" size={24} color={colors.textMuted} />
                <Text style={styles.emptyStateText}>Sin chats aún</Text>
                {hasModels && (
                  <Button
                    title="Iniciar Chat"
                    variant="primary"
                    size="small"
                    onPress={handleNewChat}
                    style={styles.emptyStateButton}
                  />
                )}
              </View>
            ) : (
              characterChats.map((chat) => (
                <View key={chat.id} style={styles.chatItemWrapper}>
                  {renderChat({ item: chat })}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      {/* Delete Project Button */}
      <View style={styles.footer}>
        <Button
          title="Eliminar Personaje"
          variant="ghost"
          size="medium"
          onPress={handleDeleteCharacter}
          icon={<Icon name="trash-2" size={16} color={colors.error} />}
          textStyle={{ color: colors.error }}
        />
      </View>
      <CustomAlert {...alertState} onClose={() => setAlertState(hideAlert())} />
    </SafeAreaView>
  );
};
