import { WritingInput } from '../writing-assessment/contracts/writing-assessment-input';
import { WritingAssessment } from '../writing-assessment/contracts/writing-assessment-output';

export function groqWritingInput(input:WritingInput) {
  return {...input,parts:input.parts.map(part=>({...part,questions:part.questions.filter(question=>question.response.trim())})),
    skippedKeys:input.parts.flatMap(part=>part.questions.filter(question=>!question.response.trim()).map(question=>question.questionKey)),
    verbatimEvidence:input.parts.flatMap(part=>part.questions.filter(question=>question.response.trim()).map(question=>({
      questionKey:question.questionKey,exactSentenceCandidates:question.response.match(/[^.!?\n]+[.!?]?/gu)?.map(text=>text.trim()).filter(Boolean) ?? [question.response],
    })))};
}

/** Blank questions/parts are server facts; restore them before the unchanged Writing validator. */
export function restoreBlankWriting(value:unknown,input:WritingInput,blank:WritingAssessment):unknown {
  if(!value || typeof value!=='object' || Array.isArray(value)) return value;
  const root=value as any;
  if(!Array.isArray(root.details?.parts) || !Array.isArray(root.summary?.partSummaries)) return value;
  const expected=new Map(input.parts.map(part=>[part.partNumber,part]));
  const providerShape=root.details.parts.some((part:any)=>Array.isArray(part?.questions) && part.questions.some((question:any)=>question?.criteria && !Array.isArray(question.criteria)));
  const blankPart=(number:number)=>{
    const part=blank.details.parts.find(candidate=>candidate.partNumber===number)!;
    return providerShape?{...part,questions:part.questions.map(question=>({...question,criteria:Object.fromEntries(
      question.criteria.map(({criterion,...feedback})=>[criterion,feedback]),
    )}))}:part;
  };
  const restore=(part:any)=>{
    const source=expected.get(part?.partNumber);
    if(!source) return part;
    const fallback=blankPart(part.partNumber);
    if(source.questions.every(question=>!question.response.trim())) return fallback;
    if(!Array.isArray(part.questions)) return part;
    const blankKeys=new Set(source.questions.filter(question=>!question.response.trim()).map(question=>question.questionKey));
    return {...part,questions:[...part.questions.filter((question:any)=>!blankKeys.has(question?.questionKey)),
      ...fallback.questions.filter(question=>blankKeys.has(question.questionKey))]};
  };
  const parts=root.details.parts.map(restore);
  const summaries=[...root.summary.partSummaries];
  for(const part of input.parts.filter(part=>part.questions.every(question=>!question.response.trim()))) {
    const fallback=blankPart(part.partNumber);
    if(!parts.some((candidate:any)=>candidate?.partNumber===part.partNumber)) parts.push(fallback);
    const index=summaries.findIndex((summary:any)=>summary?.partNumber===part.partNumber);
    const summary={partNumber:part.partNumber,comment:fallback.overview};
    if(index<0) summaries.push(summary); else summaries[index]=summary;
  }
  return {...root,details:{...root.details,parts},summary:{...root.summary,partSummaries:summaries}};
}
