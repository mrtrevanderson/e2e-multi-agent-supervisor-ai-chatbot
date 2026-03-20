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

/**
 * Normalizes a single ChatMessage so that any `dynamic-tool` parts
 * missing `callProviderMetadata.databricks.itemId` get it populated
 * from `toolCallId` as a fallback.
 *
 * The @databricks/ai-sdk-provider reads `providerOptions.itemId`
 * (sourced from `callProviderMetadata.databricks.itemId`) when building
 * function_call output items. Without it, `id` is undefined and the
 * Databricks endpoint rejects the request.
 *
 * This normalization must be applied to BOTH messages loaded from the DB
 * and messages sent by the client on MCP tool continuations, because
 * neither source preserves the original provider metadata.
 */
export function normalizeUIMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    parts: (message.parts as any[]).map((part) => {
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
  };
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) =>
    normalizeUIMessage({
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
      metadata: {
        createdAt: formatISO(message.createdAt),
      },
    }),
  );
}
