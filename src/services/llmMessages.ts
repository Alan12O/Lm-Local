import { RNLlamaOAICompatibleMessage, RNLlamaMessagePart } from 'llama.rn';
import { Message } from '../types';

export function formatLlamaMessages(messages: Message[], supportsVision: boolean): string {
  let prompt = '';
  const filtered = messages.filter(m => !m.isSystemInfo);
  const sysContent = filtered.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  let firstUserInjected = false;

  for (const message of filtered) {
    if (message.role === 'system') continue;
    
    if (message.role === 'user') {
      let content = message.content;
      if (!firstUserInjected && sysContent) {
        content = `${sysContent}\n\n${content}`;
        firstUserInjected = true;
      }
      if (message.attachments && message.attachments.length > 0 && supportsVision) {
        const imageMarkers = message.attachments
          .filter(a => a.type === 'image')
          .map(() => '<__media__>')
          .join('');
        content = imageMarkers + content;
      }
      prompt += `<start_of_turn>user\n${content}<end_of_turn>\n`;
    } else if (message.role === 'assistant') {
      prompt += `<start_of_turn>model\n${message.content}<end_of_turn>\n`;
    } else if (message.role === 'tool') {
      prompt += `<start_of_turn>user\n[Tool Result: ${message.toolName || 'tool'}]\n${message.content}\n[End Tool Result]<end_of_turn>\n`;
    }
  }
  prompt += '<start_of_turn>model\n';
  return prompt;
}

export function extractImageUris(messages: Message[]): string[] {
  const uris: string[] = [];
  for (const message of messages) {
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (attachment.type === 'image') {
          uris.push(attachment.uri);
        }
      }
    }
  }
  return uris;
}

/**
 * Format a tool call as plain text for the assistant message.
 * Avoids structured tool_calls which cause Jinja template errors
 * (C++ wants arguments as string, Jinja wants dict — can't satisfy both).
 */
function formatToolCallAsText(tc: { name: string; arguments: string }): string {
  const escapedName = JSON.stringify(tc.name);
  return `<tool_call>{"name":${escapedName},"arguments":${tc.arguments}}</tool_call>`;
}

export function buildOAIMessages(messages: Message[]): RNLlamaOAICompatibleMessage[] {
  const filtered = messages.filter(m => !m.isSystemInfo);
  const sysContent = filtered.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  
  const oaiMessages: RNLlamaOAICompatibleMessage[] = [];
  let firstUserInjected = false;

  for (const message of filtered) {
    if (message.role === 'system') continue;

    if (message.role === 'tool') {
      const label = message.toolName || 'tool';
      oaiMessages.push({
        role: 'user',
        content: `[Tool Result: ${label}]\n${message.content}\n[End Tool Result]`,
      });
      continue;
    }

    if (message.role === 'assistant' && message.toolCalls?.length) {
      const toolCallText = message.toolCalls.map(formatToolCallAsText).join('\n');
      const content = message.content
        ? `${message.content}\n${toolCallText}`
        : toolCallText;
      oaiMessages.push({ role: 'assistant', content });
      continue;
    }

    const imageAttachments = message.attachments?.filter(a => a.type === 'image') || [];
    let textContent = message.content || '';
    
    // Inyectar contexto system solo en el turno inicial
    if (message.role === 'user' && !firstUserInjected && sysContent) {
      textContent = `${sysContent}\n\n${textContent}`;
      firstUserInjected = true;
    }

    if (imageAttachments.length === 0 || message.role !== 'user') {
      oaiMessages.push({ role: message.role as any, content: textContent });
      continue;
    }

    const contentParts: RNLlamaMessagePart[] = [];
    for (const attachment of imageAttachments) {
      let imagePath = attachment.uri;
      if (!imagePath.startsWith('file://') && !imagePath.startsWith('http')) {
        imagePath = `file://${imagePath}`;
      }
      contentParts.push({ type: 'image_url', image_url: { url: imagePath } });
    }
    if (textContent) {
      contentParts.push({ type: 'text', text: textContent });
    }
    oaiMessages.push({ role: message.role as any, content: contentParts });
  }

  return oaiMessages;
}
