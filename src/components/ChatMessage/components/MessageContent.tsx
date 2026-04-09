import React from 'react';
import { View, Text } from 'react-native';
import { ThinkingIndicator } from '../../ThinkingIndicator';
import { MarkdownText } from '../../MarkdownText';
import { BlinkingCursor } from './BlinkingCursor';
import { ThinkingBlock } from './ThinkingBlock';
import { TextScalingProvider } from '../../../contexts/TextScalingContext';
import type { ParsedContent } from '../types';

interface MessageContentProps {
  isUser: boolean;
  isThinking?: boolean;
  content: string;
  isStreaming?: boolean;
  parsedContent: ParsedContent;
  showThinking: boolean;
  onToggleThinking: () => void;
  styles: any;
  themeColor?: string;
}

export function MessageContent({
  isUser,
  isThinking,
  content,
  isStreaming,
  parsedContent,
  showThinking,
  onToggleThinking,
  styles,
  themeColor,
}: Readonly<MessageContentProps>) {
  if (isThinking) {
    return (
      <View testID="thinking-indicator">
        <ThinkingIndicator text={content} themeColor={themeColor} />
      </View>
    );
  }

  if (!content) {
    if (isStreaming) {
      return (
        <Text testID="message-text" style={[styles.text, styles.assistantText]}>
          <BlinkingCursor />
        </Text>
      );
    }
    return null;
  }

  return (
    <View>
      {!!parsedContent.thinking && (
        <ThinkingBlock
          parsedContent={parsedContent}
          showThinking={showThinking}
          onToggle={onToggleThinking}
          styles={styles}
        />
      )}

      {(() => {
        if (parsedContent.response) {
          if (isUser) {
            return (
              <Text
                testID="message-text"
                style={[styles.text, styles.userText]}
                selectable={true}
              >
                {parsedContent.response}
              </Text>
            );
          }
          return (
            <View testID="message-text">
              <TextScalingProvider>
                <MarkdownText selectable={true}>{parsedContent.response}</MarkdownText>
              </TextScalingProvider>
              {isStreaming && <BlinkingCursor />}
            </View>
          );
        }
        if (isStreaming && !parsedContent.isThinkingComplete) {
          return (
            <View testID="streaming-thinking-hint" style={styles.streamingThinkingHint}>
              <ThinkingIndicator themeColor={themeColor} />
            </View>
          );
        }
        if (isStreaming) {
          return (
            <Text
              testID="message-text"
              style={[styles.text, styles.assistantText]}
              selectable={true}
            >
              <BlinkingCursor />
            </Text>
          );
        }
        return null;
      })()}
    </View>
  );
}
