// openai-advanced/src/index.ts

import OpenAI from 'openai';
import { JsonSchemaService } from 'json-schema-service';
import { Chat as OriginalChat } from './chat/chat';

export { OpenAI, JsonSchemaService };

let globalApiKey: string | undefined;

export function setGlobalOpenAIKey(apiKey: string) {
  globalApiKey = apiKey;
}

export function getOpenAI(): OpenAI {
  if (!globalApiKey) {
    return new OpenAI();
  }

  return new OpenAI({ apiKey: globalApiKey });
}

export class Chat extends OriginalChat {
  openai = getOpenAI();
}

export function chat() {
    return new Chat();
}
