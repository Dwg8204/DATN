export interface WritingError {
  sourceKind: "WRITING_CORRECTION" | "WRITING_WEAKNESS";
  part: number;
  key: string;
  criterion: string | null;
  text: string;
}
const text = (v: unknown) =>
  typeof v === "string"
    ? v
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1500)
    : "";
export function writingErrors(result: any): WritingError[] {
  const rows: WritingError[] = [],
    seen = new Set<string>();
  const add = (
    sourceKind: WritingError["sourceKind"],
    part: number,
    key: string,
    finding: any,
    value: unknown,
  ) => {
    const content = text(value);
    if (!content || rows.length >= 10) return;
    const criterion = [
      "TASK",
      "GRAMMAR",
      "VOCABULARY",
      "COHERENCE",
      "REGISTER",
      "MECHANICS",
    ].includes(finding?.criterion)
      ? finding.criterion
      : null;
    const signature = JSON.stringify([part, key, criterion, content]);
    if (seen.has(signature)) return;
    seen.add(signature);
    rows.push({ sourceKind, part, key, criterion, text: content });
  };
  for (const p of Array.isArray(result?.writing?.details?.parts)
    ? result.writing.details.parts
    : []) {
    if (!Number.isInteger(p.partNumber) || p.partNumber < 1 || p.partNumber > 4)
      continue;
    for (const q of Array.isArray(p.questions) ? p.questions : []) {
      if (q.responseStatus === "BLANK") continue;
      const key =
        typeof q.questionKey === "string" ? q.questionKey.slice(0, 80) : "";
      for (const c of Array.isArray(q.corrections) ? q.corrections : [])
        if (c.kind === "ERROR")
          add("WRITING_CORRECTION", p.partNumber, key, c, c.explanation);
      for (const w of Array.isArray(q.weaknesses) ? q.weaknesses : [])
        add("WRITING_WEAKNESS", p.partNumber, key, w, w.comment);
    }
    for (const w of Array.isArray(p.weaknesses) ? p.weaknesses : [])
      add("WRITING_WEAKNESS", p.partNumber, "", w, w.comment);
  }
  // Do not copy original/replacement, evidence quotes, full answers or suggestedRevision.
  return rows;
}
