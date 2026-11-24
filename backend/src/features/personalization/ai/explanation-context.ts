import { plainText } from './explanation.contract';
// Project public snapshot fields only. Never send audio URLs, account data or other answers.
function clean(value: any): any {
  if (typeof value === 'string') return plainText(value, 4000);
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !/(audio|image|url|media|explanation|answer|correct)/iu.test(key),
        )
        .map(([key, v]) => [key, clean(v)]),
    );
  return value;
}
export function explanationContext(detail: any, item: any) {
  let found: any = null,
    options: any[] = [],
    container: any = detail.paper;
  const visit = (
    value: any,
    inherited: any[] = [],
    parent: any = detail.paper,
  ) => {
    if (!value || typeof value !== 'object') return;
    const next = Array.isArray(value.options) ? value.options : inherited;
    if (value.key === item.key) {
      found = value;
      options = next;
      container = parent;
      return;
    }
    for (const child of Object.values(value))
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) child.forEach((v) => visit(v, next, value));
        else visit(child, next, value);
      }
  };
  const rootOptions =
    detail.paper?.options ??
    detail.paper?.headings ??
    (detail.paper?.speakers ?? []).map((s: any) => ({
      id: s.id,
      text: s.name,
    }));
  visit(detail.paper, rootOptions);
  const correct = options.find((o) => o.id === item.correctAnswer);
  const selected = options.find((o) => o.id === item.selectedAnswer?.optionId);
  const fullCorrectAnswer = plainText(
    correct?.text ?? correct?.label ?? correct?.content,
    2000,
  );
  const correctAnswer =
    found && fullCorrectAnswer.length <= 300 ? fullCorrectAnswer : '';
  const prompt = plainText(
    found?.text ??
      found?.word ??
      found?.statement ??
      found?.content ??
      found?.name ??
      (found?.position ? `Position ${found.position}` : ''),
    1800,
  );
  const rawPaper = JSON.stringify(
    clean({
      instruction: container?.instruction ?? detail.paper?.instruction,
      context: container?.context ?? detail.paper?.context,
      passage: detail.paper?.passageHtml ?? detail.paper?.passage,
      openingSentence: container?.openingSentence,
      sentences:
        detail.component === 'READING' && detail.partNumber === 2
          ? container?.options
          : undefined,
      speakers:
        detail.component === 'READING' && detail.partNumber === 3
          ? detail.paper?.speakers
          : undefined,
      transcript: container?.transcript,
    }),
  );
  const paper =
    rawPaper.length > 6000
      ? rawPaper.slice(0, 5988) + ' [TRUNCATED]'
      : rawPaper;
  return {
    component: detail.component,
    part: detail.partNumber,
    question: prompt,
    paper,
    correctAnswer,
    selectedAnswer: plainText(
      selected?.text ?? item.selectedAnswer?.optionId,
      300,
    ),
    outcome: item.outcome?.outcome,
    alternatives: options
      .map((o) => plainText(o.text ?? o.label, 300))
      .filter(Boolean),
  };
}
export function explanationQuery(context: {
  component: string;
  part: number;
  question: string;
  selectedAnswer?: string;
  correctAnswer: string;
  paper?: string;
}) {
  const task=context.component==='READING'&&context.part===2?'\n[Nhiệm vụ] Sắp xếp câu theo trình tự sự kiện và liên kết đoạn văn.':'';
  return `[Kỹ năng] ${context.component} · Part ${context.part}${task}\n[Đề] ${context.question}\n[Đã chọn] ${context.selectedAnswer ?? ''}\n[Đáp án đúng] ${context.correctAnswer}\n[Ngữ cảnh] ${(context.paper ?? '').slice(0, 3000)}`.slice(
    0,
    5900,
  );
}
