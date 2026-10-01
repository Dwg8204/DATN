import { AssessableItem } from '../../types/attempt.type';

export type PaperAssembly = { parts: Record<string, unknown>; items: AssessableItem[] };
export type PaperAdapter = (snapshot: Record<string, unknown>) => PaperAssembly;
