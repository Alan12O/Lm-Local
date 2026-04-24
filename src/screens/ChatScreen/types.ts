import { Message } from '../../types';

export type ChatMessageItem = {
  id: string;
  role: 'assistant' | 'system';
  content: string;
  reasoningContent?: string;
  timestamp: number;
  isThinking?: boolean;
  isStreaming?: boolean;
  isThinkingBlock?: boolean;
  isCompacting?: boolean;
};

export type StreamingState = {
  isThinking: boolean;
  isThinkingBlock: boolean;
  streamingMessage: string;
  streamingReasoningContent: string;
  isStreamingForThisConversation: boolean;
  isCompacting?: boolean;
};

export function getDisplayMessages(
  allMessages: Message[],
  streaming: StreamingState,
): (Message | ChatMessageItem)[] {
  const validMessages = allMessages.filter(Boolean);
  const { isThinking, isThinkingBlock, streamingMessage, streamingReasoningContent, isStreamingForThisConversation, isCompacting } = streaming;
  
  if (isCompacting && isStreamingForThisConversation) {
    return [
      ...validMessages,
      { id: 'compacting', role: 'system' as const, content: streamingMessage || 'Compactando el contexto de la conversación para ahorrar memoria...', timestamp: Date.now(), isStreaming: true, isCompacting: true, isSystemInfo: true } as any,
    ];
  }

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
