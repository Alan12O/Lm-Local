import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme, useThemedStyles } from '../../theme';
import { ImageModeState, MediaAttachment } from '../../types';
import { VoiceRecordButton } from '../VoiceRecordButton';
import { AttachStep } from 'react-native-spotlight-tour';
import { triggerHaptic } from '../../utils/haptics';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../CustomAlert';
import { createStyles, PILL_ICONS_WIDTH, ANIM_DURATION_IN, ANIM_DURATION_OUT } from './styles';
import { QueueRow } from './Toolbar';
import { AttachmentPreview, useAttachments } from './Attachments';
import { useVoiceInput } from './Voice';
import {
  QuickSettingsPopover,
  AttachPickerPopover,
  CharacterActionsPopover,
  popoverStyles,
} from './Popovers';
import { useKeyboardAwarePopover } from './useKeyboardAwarePopover';

interface ChatInputProps {
  onSend: (message: string, attachments?: MediaAttachment[], imageMode?: ImageModeState) => void;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  placeholder?: string;
  supportsVision?: boolean;
  conversationId?: string | null;
  imageModelLoaded?: boolean;
  onImageModeChange?: (mode: ImageModeState) => void;
  onOpenSettings?: () => void;
  queueCount?: number;
  queuedTexts?: string[];
  onClearQueue?: () => void;
  onToolsPress?: () => void;
  enabledToolCount?: number;
  supportsToolCalling?: boolean;
  supportsThinking?: boolean;
  /** When set, mounts a single AttachStep for that index. Only one at a time to avoid waypoint dots. */
  activeSpotlight?: number | null;
  /** Whether we are chatting with a character (enables RP tools) */
  isCharacterMode?: boolean;
}

const IMAGE_MODE_CYCLE: ImageModeState[] = ['auto', 'force', 'disabled'];

// ─── Main Component ─────────────────────────────────────────────────────────

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  disabled,
  isGenerating,
  placeholder = 'Message',
  supportsVision = false,
  conversationId,
  imageModelLoaded = false,
  onImageModeChange,
  onOpenSettings: _onOpenSettings,
  queueCount = 0,
  queuedTexts = [],
  onClearQueue,
  onToolsPress,
  enabledToolCount = 0,
  supportsToolCalling = false,
  supportsThinking = false,
  activeSpotlight = null,
  isCharacterMode = false,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [message, setMessage] = useState('');
  const [imageMode, setImageMode] = useState<ImageModeState>('auto');
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const quickSettings = useKeyboardAwarePopover();
  const attachPicker = useKeyboardAwarePopover();
  const charActions = useKeyboardAwarePopover();
  const inputRef = useRef<TextInput>(null);
  const hasText = message.length > 0;
  const iconsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(iconsAnim, {
      toValue: hasText ? 1 : 0,
      duration: hasText ? ANIM_DURATION_IN : ANIM_DURATION_OUT,
      useNativeDriver: false,
    }).start();
  }, [hasText, iconsAnim]);

  const { attachments, removeAttachment, clearAttachments, handlePickImage, handlePickDocument } = useAttachments(setAlertState);

  const { isRecording, isModelLoading, isTranscribing, partialResult, error, voiceAvailable, startRecording, stopRecording, clearResult } = useVoiceInput({
    conversationId,
    onTranscript: (text) => {
      setMessage(prev => {
        const prefix = prev.trim() ? `${prev.trim()} ` : '';
        return prefix + text;
      });
    },
  });

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    triggerHaptic('impactMedium');
    onSend(message.trim(), attachments.length > 0 ? attachments : undefined, imageMode);
    setMessage('');
    clearAttachments();
    inputRef.current?.focus();
    if (imageMode === 'force') {
      setImageMode('auto');
      onImageModeChange?.('auto');
    }
  };

  const handleImageModeToggle = () => {
    if (!imageModelLoaded) { setAlertState(showAlert('No Image Model', 'Download an image generation model from the Models screen to enable this feature.', [{ text: 'OK' }])); quickSettings.hide(); return; }
    const newMode = IMAGE_MODE_CYCLE[(IMAGE_MODE_CYCLE.indexOf(imageMode) + 1) % IMAGE_MODE_CYCLE.length];
    setImageMode(newMode);
    onImageModeChange?.(newMode);
  };

  const handleVisionPress = () => {
    if (!supportsVision) { setAlertState(showAlert('Vision Not Supported', 'Load a vision-capable model (with mmproj) to enable image input.', [{ text: 'OK' }])); return; }
    handlePickImage();
  };

  const handleStop = () => {
    if (onStop && isGenerating) {
      triggerHaptic('impactLight');
      onStop();
    }
  };

  const handleQuickSettingsPress = () => quickSettings.show();
  const handleAttachPress = () => attachPicker.show();
  const handleCharActionsPress = () => charActions.show();
  const insertText = (text: string) => setMessage(prev => prev + text);

  const actionButton = canSend ? (
    <TouchableOpacity
      testID="send-button"
      style={styles.circleButton}
      onPress={handleSend}
    >
      <Icon name="arrow-up" size={18} color={colors.background} />
    </TouchableOpacity>
  ) : isGenerating && onStop ? (
    <TouchableOpacity
      testID="stop-button"
      style={[styles.circleButton, styles.circleButtonStop, { backgroundColor: 'transparent' }]}
      onPress={handleStop}
    >
      <Icon name="square" size={18} color={colors.error} />
    </TouchableOpacity>
  ) : (
    <VoiceRecordButton
      isRecording={isRecording}
      isAvailable={voiceAvailable}
      isModelLoading={isModelLoading}
      isTranscribing={isTranscribing}
      partialResult={partialResult}
      error={error}
      disabled={disabled}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onCancelRecording={() => { stopRecording(); clearResult(); }}
      asSendButton
    />
  );

  const content = (
    <View style={styles.container}>
      <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />
      <QueueRow
        queueCount={queueCount}
        queuedTexts={queuedTexts}
        onClearQueue={onClearQueue}
      />
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 12,
        paddingTop: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
      }}>
        <TextInput
            ref={inputRef}
            testID="chat-input"
            style={[styles.pillInput, { minHeight: 48, paddingBottom: 16 }]}
            value={message}
            onChangeText={setMessage}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            scrollEnabled
            editable={!disabled}
            blurOnSubmit={false}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleAttachPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="paperclip" size={18} color={disabled ? colors.textMuted : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleQuickSettingsPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="settings" size={18} color={disabled ? colors.textMuted : colors.textSecondary} />
            </TouchableOpacity>
            {isCharacterMode && (
              <TouchableOpacity onPress={handleCharActionsPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="zap" size={18} color={disabled ? colors.textMuted : colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          <View>
            {activeSpotlight === 12 ? (
              <AttachStep index={12} style={spotlightStyles.centered}>{actionButton}</AttachStep>
            ) : actionButton}
          </View>
        </View>
      </View>

      <AttachPickerPopover
        visible={attachPicker.visible}
        onClose={attachPicker.hide}
        anchorY={attachPicker.anchor.y}
        anchorX={attachPicker.anchor.x}
        supportsVision={supportsVision}
        onPhoto={handleVisionPress}
        onDocument={handlePickDocument}
      />

      <QuickSettingsPopover
        visible={quickSettings.visible}
        onClose={quickSettings.hide}
        anchorY={quickSettings.anchor.y}
        anchorX={quickSettings.anchor.x}
        imageMode={imageMode}
        onImageModeToggle={handleImageModeToggle}
        imageModelLoaded={imageModelLoaded}
        supportsThinking={supportsThinking}
        supportsToolCalling={supportsToolCalling}
        enabledToolCount={enabledToolCount}
        onToolsPress={onToolsPress}
      />

      <CharacterActionsPopover
        visible={charActions.visible}
        onClose={charActions.hide}
        anchorY={charActions.anchor.y}
        anchorX={charActions.anchor.x}
        onAction={insertText}
      />

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={() => setAlertState(hideAlert())}
      />
    </View>
  );

  return content;
};

const spotlightStyles = StyleSheet.create({
  centered: { alignSelf: 'center' },
});

