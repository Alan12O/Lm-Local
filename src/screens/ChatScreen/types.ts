import { Message } from '../../types';

export type ChatMessageItem = {
  id: string;
  role: 'assistant';
  content: string;
  reasoningContent?: string;
  timestamp: number;
  isThinking?: boolean;
  isStreaming?: boolean;
  isThinkingBlock?: boolean;
};

export type StreamingState = {
  isThinking: boolean;
  isThinkingBlock: boolean;
  streamingMessage: string;
  streamingReasoningContent: string;
  isStreamingForThisConversation: boolean;
};

export function getDisplayMessages(
  allMessages: Message[],
  streaming: StreamingState,
): (Message | ChatMessageItem)[] {
  const validMessages = allMessages.filter(Boolean);
  const { isThinking, isThinkingBlock, streamingMessage, streamingReasoningContent, isStreamingForThisConversation } = streaming;
  if (isThinking && isStreamingForThisConversation) {
    return [
      ...validMessages,
      { id: 'thinking', role: 'assistant' as const, content: '', timestamp: Date.now(), isThinking: true },
    ];
  }
  if ((streamingMessage || streamingReasoningContent) && isStreamingForThisConversation) {
    return [
      ...validMessages,
      {
        id: 'streaming',
        role: 'assistant' as const,
        content: streamingMessage,
        reasoningContent: streamingReasoningContent || undefined,
        timestamp: Date.now(),
        isStreaming: true,
        isThinkingBlock,
      },
    ];
  }
  return validMessages;
}

export function getPlaceholderText(isModelLoaded: boolean, supportsVision: boolean): string {
  if (!isModelLoaded) return 'Cargando modelo...';
  return supportsVision ? 'Escribe o añade una imagen...' : 'Escribe un mensaje...';
}
