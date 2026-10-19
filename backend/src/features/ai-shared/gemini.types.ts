export interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  [key: string]: unknown;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number;
}

export interface GeminiResponse {
  candidates?: Array<{ finishReason?: string; content?: GeminiContent }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: GeminiUsage;
  embedding?: { values: number[] };
  embeddings?: Array<{ values: number[] }>;
  totalTokens?: number;
}

export type GeminiMethod =
  'generateContent' | 'embedContent' | 'batchEmbedContents' | 'countTokens';

export interface GeminiGenerationInput {
  model: string;
  system: string;
  contents: GeminiContent[];
  responseSchema: Record<string, unknown>;
  tools?: Record<string, unknown>[];
  temperature?: number;
  maxOutputTokens?: number;
  context: {
    userId: string;
    purpose: string;
    promptVersion: string;
    chatMessageId?: string;
    errorCodePrefix?: string;
  };
}
