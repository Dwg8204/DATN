import { CEFR_LEVELS } from "../../ai-shared/ability-profile";
export interface StateClaims {
  statusEcho: "AHEAD" | "ON_TRACK" | "BEHIND";
  bandClaim: "NONE" | "CURRENT" | "TARGET_REACHED";
}
export const CLAIM_PROPERTIES = {
  statusEcho: { type: "STRING", enum: ["AHEAD", "ON_TRACK", "BEHIND"] },
  bandClaim: { type: "STRING", enum: ["NONE", "CURRENT", "TARGET_REACHED"] },
};
export const CLAIM_SYSTEM = `Thêm hai trường bắt buộc statusEcho và bandClaim. statusEcho sao chép goal.status (AHEAD/ON_TRACK/BEHIND); nếu không có goal thì dùng ON_TRACK như giá trị quy ước, không kết luận về tiến độ.
bandClaim=NONE khi không khẳng định band hiện tại; CURRENT khi mô tả band ước lượng có dữ liệu; TARGET_REACHED chỉ khi validationContext.bandTargetStatus=REACHED. Đủ số bài không có nghĩa là đạt band. Không viết "đã đạt B2" chỉ vì B2 là mục tiêu.`;
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export function claimContext(
  snapshot: Record<string, unknown>,
  outcome?: { bandTargetStatus?: string },
) {
  const goal = record(snapshot.goal),
    band = record(snapshot.band);
  const current = band.overallEstimate,
    target = band.target;
  const valid = (value: unknown) =>
    typeof value === "string" && Object.hasOwn(CEFR_LEVELS, value);
  const bandTargetStatus =
    outcome?.bandTargetStatus ??
    record(snapshot.outcome).bandTargetStatus ??
    (!valid(current) || !valid(target)
      ? "INSUFFICIENT_DATA"
      : CEFR_LEVELS[current as keyof typeof CEFR_LEVELS] >=
          CEFR_LEVELS[target as keyof typeof CEFR_LEVELS]
        ? "REACHED"
        : "NOT_REACHED");
  return {
    statusEcho: goal.status ?? "ON_TRACK",
    bandTargetStatus,
    hasCurrent:
      valid(current) ||
      (Array.isArray(band.bySkill) &&
        band.bySkill.some((s: unknown) => valid(record(s).band))),
    hasGoal: !!snapshot.goal,
    target,
  };
}
const STATUS_PHRASES: Record<string, RegExp> = {
  AHEAD:
    /(?:vượt|nhanh hơn|sớm hơn)\s+(?:tiến độ|kế hoạch)|ahead of (?:schedule|plan)/giu,
  ON_TRACK:
    /(?:đúng|theo kịp|bám sát)\s+(?:tiến độ|kế hoạch)|on track|on schedule/giu,
  BEHIND:
    /(?:chậm|trễ|tụt lại|chưa theo kịp)\s*(?:so với\s*)?(?:tiến độ|kế hoạch)|behind (?:schedule|plan)/giu,
};
export function stateTextIssues(
  texts: string[],
  snapshot: Record<string, unknown>,
  outcome?: { bandTargetStatus?: string },
) {
  const context = claimContext(snapshot, outcome),
    issues: string[] = [];
  for (const raw of texts) {
    const text = raw.normalize("NFC");
    for (const [status, pattern] of Object.entries(STATUS_PHRASES)) {
      for (const match of text.matchAll(pattern)) {
        const prefix = text.slice(Math.max(0, match.index! - 45), match.index);
        if (/(?:không|chưa)\s+(?:đang\s+)?$/iu.test(prefix)) continue;
        if (!context.hasGoal || status !== context.statusEcho)
          issues.push("STATUS_CONTRADICTION");
      }
    }
    if (context.bandTargetStatus !== "REACHED") {
      for (const match of text.matchAll(
        /(?:đã\s+(?:đạt(?:\s+được)?|chạm|chinh phục)|đạt được|have reached|have achieved)\s+(?:(?:band|trình độ|mức(?:\s+CEFR)?)\s+)?(A[12]|B[12]|C[12]?)\b/giu,
      )) {
        if (match[1].toUpperCase() === context.target)
          issues.push("BAND_TARGET_CONTRADICTION");
      }
    }
  }
  return issues;
}
export function stateClaimIssues(
  value: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  outcome?: { bandTargetStatus?: string },
) {
  const context = claimContext(snapshot, outcome),
    issues: string[] = [];
  if (value.statusEcho !== context.statusEcho) issues.push("STATUS_ECHO");
  if (!["NONE", "CURRENT", "TARGET_REACHED"].includes(String(value.bandClaim)))
    issues.push("BAND_CLAIM");
  if (
    value.bandClaim === "TARGET_REACHED" &&
    context.bandTargetStatus !== "REACHED"
  )
    issues.push("BAND_TARGET_CONTRADICTION");
  if (value.bandClaim === "CURRENT" && !context.hasCurrent)
    issues.push("CURRENT_BAND_UNAVAILABLE");
  return issues;
}
