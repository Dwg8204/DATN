import { ApplicationError } from '../errors/application.error';

// Drafts may contain blank text/answers, but their collections must remain safe to persist.
export function assertDraftCollection(value: unknown, size: number, label: string, objects = true): asserts value is any[] {
  if (!Array.isArray(value) || value.length !== size || value.some(item => objects
    ? !item || typeof item !== 'object' || Array.isArray(item)
    : typeof item !== 'string')) {
    throw new ApplicationError('VALIDATION_FAILED', `${label} has an invalid draft structure.`, 400);
  }
}

export function assertDraftParts(parts: unknown): asserts parts is Record<string, any> {
  if (!parts || typeof parts !== 'object' || Array.isArray(parts)
    || Object.entries(parts).some(([key, value]) => !['1', '2', '3', '4'].includes(key)
      || !value || typeof value !== 'object' || Array.isArray(value))) {
    throw new ApplicationError('VALIDATION_FAILED', 'Invalid draft parts.', 400);
  }
}
