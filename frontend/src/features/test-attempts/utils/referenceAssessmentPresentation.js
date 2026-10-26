const KEYS=['grammarVocabulary','pronunciation','fluency','taskFulfillment'];
const AUDIO_LIMIT='Groq chỉ nhận transcript. Không đủ dữ liệu âm thanh để đánh giá Pronunciation/Fluency; không có điểm tổng /50 hoặc CEFR Speaking.';
const emptyDetail=comment=>({comment,strengths:[],weaknesses:[],suggestions:[]});
const unique=values=>[...new Set(values)].slice(0,3);

export function referenceSpeakingPresentation(reference) {
  const source=reference.result?.speaking;
  if(reference.status!=='COMPLETED' || !source) return null;
  const byKey=new Map((source.responses ?? []).map(row=>[row.key,row]));
  const inputs=source.inputs ?? [];
  const items=inputs.map(input=>{
    const row=byKey.get(input.key);
    if(!row || !input.recorded) return {key:input.key,partNumber:input.partNumber,outcome:'SKIPPED',score:null,maxScore:null};
    const criteria={grammarVocabulary:row.grammarVocabulary ?? null,pronunciation:null,fluency:null,taskFulfillment:row.taskFulfillment ?? null};
    return {key:input.key,partNumber:input.partNumber,outcome:'ASSESSED',score:null,maxScore:null,
      assessment:{transcript:input.transcript,feedback:row.comment,criteria,qualityFlags:['TRANSCRIPT_ONLY'],details:{
        criterionFeedback:{
          grammarVocabulary:{...emptyDetail(row.grammarVocabularyFeedback || row.comment),strengths:row.strengths ?? [],weaknesses:row.weaknesses ?? [],suggestions:row.suggestions ?? []},
          pronunciation:emptyDetail('Không thể đánh giá phát âm từ transcript.'),
          fluency:emptyDetail(`Không thể đánh giá độ trôi chảy của lời nói từ transcript. Nhận xét mạch lạc văn bản: ${row.coherenceComment}`),
          taskFulfillment:emptyDetail(row.taskFulfillmentFeedback || row.comment),
        },strengths:row.strengths ?? [],weaknesses:row.weaknesses ?? [],suggestions:row.suggestions ?? [],suggestedAnswer:row.suggestedAnswer ?? null,
      }}};
  });
  const criteria=Object.fromEntries(KEYS.map(key=>{
    const scores=items.map(item=>item.assessment?.criteria[key]).filter(value=>typeof value==='number' && Number.isFinite(value));
    return [key,scores.length?Math.round(scores.reduce((sum,value)=>sum+value,0)/scores.length*100)/100:null];
  }));
  const partFeedback=[...new Set(inputs.map(input=>input.partNumber))].map(partNumber=>{
    const rows=inputs.filter(input=>input.partNumber===partNumber && input.recorded).map(input=>byKey.get(input.key)).filter(Boolean);
    return {partNumber,overview:rows.length?rows.map(row=>row.comment).join('\n'):'Bạn chưa gửi bản ghi âm cho Part này.',
      strengths:unique(rows.flatMap(row=>row.strengths ?? [])),weaknesses:unique(rows.flatMap(row=>row.weaknesses ?? [])),suggestions:unique(rows.flatMap(row=>row.suggestions ?? []))};
  });
  return {items,speaking:{provider:'LLM',model:reference.model,version:source.promptVersion,transcriptOnly:true,criteria,
    estimatedCefr:null,averagePercentage:null,cefrReason:`${source.summary}\n${AUDIO_LIMIT}`,partFeedback},
    gradingNotice:AUDIO_LIMIT};
}

export function applyReferenceSummary(primary,reference) {
  const completed=reference.status==='COMPLETED';
  const speaking=referenceSpeakingPresentation(reference);
  const writing=completed?reference.result?.writing:undefined;
  const status=reference.status==='NOT_REQUESTED'?(reference.eligible?'QUEUED':'NOT_STARTED'):reference.status;
  const notice=reference.errorCode && reference.status==='FAILED'?`Groq: ${reference.errorCode}${reference.validationRule?` (${reference.validationRule})`:''}`:
    reference.status==='NOT_REQUESTED' && !reference.eligible?'Lượt làm này chưa có kết quả Groq.':undefined;
  const previous=primary.result ?? {};
  const {speaking:_speaking,writing:_writing,gradingNotice:_notice,...base}=previous;
  const neutralItems=(previous.items ?? []).map(({assessment:_assessment,...item})=>({...item,score:null,maxScore:null,
    outcome:item.selectedAnswer?'PENDING':'SKIPPED'}));
  const neutralParts=(previous.parts ?? []).map(part=>({...part,score:null,maxScore:null}));
  return {...primary,assessmentProvider:'groq',assessmentRevision:`groq:${reference.revision ?? 'none'}`,
    gradingStatus:status,score:null,maxScore:null,estimatedCefr:writing?.scope==='FULL_SKILL'?writing.cefr?.level ?? null:null,
    assessment:{enabled:reference.enabled || completed,retryable:reference.retryable,errorCode:reference.errorCode,nextRetryAt:reference.nextRetryAt,
      stage:reference.stage,completedParts:reference.completedParts},
    result:{...base,method:completed?'AI':status==='NOT_STARTED'?'UNASSESSED':'PENDING_AI',score:null,maxScore:null,
      parts:neutralParts,items:speaking?.items.map(item=>({...neutralItems.find(original=>original.key===item.key),...item})) ?? neutralItems,
      gradingNotice:notice ?? speaking?.gradingNotice,...(writing?{writing}:{}),...(speaking?{speaking:speaking.speaking}:{})}};
}

export function applyReferencePart(original,reference) {
  const part=reference.status==='COMPLETED'?reference.result?.writing?.details?.parts?.find(part=>part.partNumber===original.partNumber):null;
  const presented=referenceSpeakingPresentation(reference);
  const byKey=new Map((presented?.items ?? []).map(item=>[item.key,item]));
  return {...original,assessmentProvider:'groq',writing:part?{feedbackLocale:'vi',assessmentRevision:reference.revision,part}:undefined,
    items:(original.items ?? []).map(({assessment:_assessment,outcome:_outcome,...item})=>{
      const row=byKey.get(item.key);
      return {...item,assessment:row?.assessment ?? null,outcome:row ?? null};
    })};
}
