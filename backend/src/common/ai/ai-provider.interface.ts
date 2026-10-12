export type JsonSchema = {
  type: 'object' | 'array' | 'string' | 'number' | 'integer';
  nullable?: boolean;
  enum?: Array<string | number>;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  maxLength?: number;
  minLength?: number;
  maxItems?: number;
  minItems?: number;
};

export interface AiProvider {
  generateStructured(request: {
    model: string;
    systemInstruction: string;
    input: unknown;
    outputSchema: JsonSchema;
    maxOutputTokens: number;
    signal: AbortSignal;
  }): Promise<unknown>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
