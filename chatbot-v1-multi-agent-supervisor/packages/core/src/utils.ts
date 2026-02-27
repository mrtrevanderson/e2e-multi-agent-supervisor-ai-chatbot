import type { UIMessagePart } from 'ai';
import type { DBMessage } from '@chat-template/db';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';
import { formatISO } from 'date-fns';

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: (message.parts as any[]).map((part) => {
      // Normalize tool call parts loaded from DB.
      // The @databricks/ai-sdk-provider reads callProviderMetadata.databricks.itemId
      // to populate the `id` field on function_call output items. When parts are
      // persisted and reloaded, this metadata is missing — use toolCallId as fallback.
      if (part.type === 'dynamic-tool' && part.toolCallId) {
        const hasItemId = part.callProviderMetadata?.databricks?.itemId;
        if (!hasItemId) {
          return {
            ...part,
            id: part.id ?? part.toolCallId,
            callProviderMetadata: {
              ...part.callProviderMetadata,
              databricks: {
                ...part.callProviderMetadata?.databricks,
                itemId: part.toolCallId,
              },
            },
          };
        }
      }
      return part;
    }) as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}
