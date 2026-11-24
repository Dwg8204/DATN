// Applies the recorded AI editorial review of the R0 draft, not a human sign-off.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const save=(p,d)=>fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');
const corpus=read('resources/chatbot-knowledge/corpus.json');
if(corpus.some(d=>d.review?.version==='r0-editorial-v2'))throw Error('Corpus was revised after this historical review. Do not overwrite newer approvals.');
const gold=read('test/fixtures/rag-gold.json');
const questions=read('test/fixtures/rag-r0-review-questions.json');
const byId=new Map(questions.map(q=>[q.id,q]));
const reviewer={type:'AI',name:'Codex',date:'2026-11-10',version:'r0-editorial-v1',humanReviewed:false};
const report={reviewer,scope:'73 new documents, 60 samples and all proposed pairs; six pre-existing GENERAL documents are not newly approved.',documents:[],samples:[]};
for(const d of corpus){
 if(d.usage==='GENERAL')continue;
 if(d.key==='criterion-speaking-taskfulfillment')d.topicCodes=[];
 if(d.key==='criterion-speaking-grammarvocabulary'){
  d.topicCodes=['speaking-grammar','speaking-vocabulary'];
  if(d.sections.length===2)d.sections.splice(1,0,{heading:'Từ vựng trong lời nói',text:'Dùng từ đúng nghĩa và kết hợp tự nhiên với ngữ cảnh. Khi chưa nhớ từ chính xác, diễn giải bằng chức năng hoặc đặc điểm, chẳng hạn a helmet protects your head. Không thay từ đơn giản bằng từ hiếm nếu chưa biết cách dùng. Sau khi ghi âm, kiểm tra cả lỗi cấu trúc và từ dùng sai, rồi nói lại với thông điệp giữ nguyên.'});
 }
 const approved=d.usage==='CRITERION_GUIDE';
 const issues=approved?[]:d.usage==='LESSON'?['GENERIC_PADDING','INSUFFICIENT_TOPIC_SPECIFIC_PRACTICE']:['PART_SPECIFIC_WORKFLOW_MISSING'];
 const note=approved?'Đạt ở phạm vi hướng dẫn luyện tập ngắn; không phải rubric chấm điểm chính thức.':d.usage==='LESSON'?'Quy tắc/ví dụ đã được rà soát, nhưng phần lớn độ dài là hướng dẫn chung lặp giữa các bài. Chưa đạt học liệu chuyên biệt 300–600 từ cho truy xuất. Cần giải thích ví dụ và bài tập riêng theo chủ đề.':'Nội dung chủ yếu sao chép một chủ đề, chưa mô tả đủ thao tác và bẫy của đúng Part. Cần biên tập theo nhiệm vụ cụ thể trước khi import.';
 d.reviewStatus=approved?'AI_APPROVED':'NEEDS_REVISION';d.reviewedBy='Codex (AI)';d.reviewedAt='2026-11-10';d.review={...reviewer,issues,note};
 report.documents.push({key:d.key,status:d.reviewStatus,issues,note,contentHash:crypto.createHash('sha256').update(JSON.stringify(d.sections)).digest('hex')});
}
const fixes={
 'grammar_vocab-3':['lesson-modals','Needn’t have + phân từ: việc đã làm nhưng không cần thiết. Explanation nguồn nói tương lai hoàn thành là sai nội dung.'],
 'grammar_vocab-15':['english-present-perfect-past','Since + mốc 2020 trong hiện tại hoàn thành; explanation nguồn nói điều kiện loại hai không khớp câu.'],
 'grammar_vocab-16':['lesson-past-perfect','Had left diễn tả việc xảy ra trước reached; không phải hiện tại hoàn thành.'],
 'grammar_vocab-17':['lesson-question-tags','Was hilarious là mệnh đề khẳng định, đuôi xác nhận là wasn’t it.'],
 'grammar_vocab-20':['lesson-past-perfect','Had been working diễn tả quá trình trước looked tired; không phải hiện tại hoàn thành.'],
 'reading-2':['lesson-prepositions','On trước ngày trong tuần; bài học giới từ phù hợp hơn đọc chi tiết chung.'],
 'reading-10':['lesson-prepositions','Các lựa chọn on/at/in cần kiến thức giới từ và câu đầy đủ.'],
 'reading-14':['lesson-pronouns','Our đứng trước schedule; trọng tâm là dạng sở hữu.'],
 'reading-18':['english-conditionals','If dẫn điều kiện; trọng tâm là mệnh đề điều kiện.'],
 'listening-2':['lesson-listening-main-idea','Main purpose là xác định mục đích chính, không mặc định là suy luận.'],
 'listening-5':['lesson-listening-main-idea','Main purpose là xác định mục đích chính.'],
 'listening-8':['lesson-listening-detail','Lợi ích được nêu trực tiếp trong explanation, chưa có bằng chứng suy luận.'],
 'listening-11':['lesson-listening-detail','Lợi ích được nêu trực tiếp.'],
 'listening-14':['lesson-listening-detail','Khó khăn được nêu trực tiếp.'],
 'listening-17':['lesson-listening-detail','Lời khuyên được nêu trực tiếp.'],
 'listening-20':['lesson-listening-detail','Khó khăn được nêu trực tiếp.']
};
function concept(q){
 const t=(q.content.text??q.content.statement??'').replace(/<[^>]+>/g,' ').toLowerCase();
 if(q.component==='GRAMMAR_VOCAB'){
  const rules=[[/need.*have booked/,'modal-perfect'],[/lived here/,'since-time'],[/useful guide/,'article-sound'],[/life.*her/,'preposition-without'],[/usually|every day/,'present-simple-agreement'],[/suggested|enjoy|look.*forward|would you mind/,'verb-ing'],[/delivered|letter.*yesterday|notebook.*yesterday|backpack.*yesterday/,'passive-past'],[/last week/,'past-simple'],[/visited london before/,'present-perfect-auxiliary'],[/by the time/,'past-perfect'],[/hilarious/,'question-tag'],[/if.*opens early/,'conditional-one'],[/would travel|if i.*free time/,'conditional-two'],[/looked tired/,'past-perfect-continuous'],[/air conditioner/,'causative'],[/piano/,'article-instrument'],[/suddenly.*rain/,'past-continuous']];
  return rules.find(([r])=>r.test(t))?.[1]??'unclassified-'+q.id;
 }
 if(q.question_type==='READING_GAP_CHOICE')return 'gap-'+JSON.stringify([...q.content.options].sort());
 if(q.question_type==='READING_HEADING_MATCH')return 'heading-'+(t.includes('started with')?'origin':t.includes('space soon')?'venue':t.includes('rainwater')?'conservation':t.includes('next year')?'outreach':q.id);
 if(q.question_type==='READING_ORDER')return 'sequence-'+(t.includes('finally')?'ending':t.includes('decided')?'opening':t.includes('next')?'next-step':t.includes('once')?'prerequisite':'continuation');
 return q.question_type; // strategy-level relevance only, no claim of identical misconception
}
for(const s of gold.samples){
 const q=byId.get(s.questionId),fix=fixes[s.id];
 if(fix){s.originalDocumentKey??=s.documentKey;s.documentKey=fix[0];s.correctedLabelRationale=fix[1];}
 const pairs=s.similarQuestionIds.map(id=>{
  const r=byId.get(id),same=concept(q)===concept(r);
  const nearDuplicate=JSON.stringify(q.content)===JSON.stringify(r.content);
  const status=!same?'REJECTED':nearDuplicate?'NEAR_DUPLICATE':q.component==='LISTENING'?'AUDIO_UNVERIFIED':'STRATEGY_RELEVANT';
  return {questionId:id,status,reason:!same?`Khác trọng tâm: ${concept(q)} / ${concept(r)}.`:nearDuplicate?'Nội dung câu giống hệt; không là bằng chứng tổng quát hóa độc lập.':q.component==='LISTENING'?'Cùng chiến lược theo văn bản nhưng chưa đối chiếu audio nguồn/đích.':'Có liên hệ về kỹ năng/quy tắc; cần kiểm tra họ đề gần trùng trước khi dùng làm nhãn đánh giá.'};
 });
 const issues=['NOT_INDEPENDENT_GOLD','NEAR_DUPLICATE_SPLIT_REQUIRED'];
 if(pairs.some(p=>p.status==='REJECTED'))issues.push('IRRELEVANT_PROPOSED_PAIRS');
 if(s.component==='LISTENING')issues.push('AUDIO_NOT_VERIFIED');
 if(['grammar_vocab-3','grammar_vocab-15'].includes(s.id))issues.push('SOURCE_EXPLANATION_MISMATCH');
 if(s.questionType==='READING_GAP_CHOICE')issues.push('PROMPT_REQUIRES_PART_CONTEXT');
 s.reviewStatus='NEEDS_REVISION';s.reviewedBy='Codex (AI)';s.reviewedAt='2026-11-10';s.evaluationEligible=false;
 s.review={...reviewer,issues,pairs,note:'Đã rà soát; giữ danh sách đề xuất gốc để truy vết. Không dùng similarQuestionIds trực tiếp làm nhãn đúng; loại REJECTED và chia họ đề trước khi xây bộ nghiệm thu.'};
 report.samples.push({id:s.id,documentKey:s.documentKey,status:s.reviewStatus,issues,pairs,correction:fix?.[1]??null});
}
gold.status='AI_REVIEWED_NEEDS_REVISION';gold.labelPolicy='AI reviewed, not human gold. Every sample is excluded from final metrics; pair-level decisions are in review.pairs. Original proposed IDs retained for audit only.';
report.summary={documentsApproved:report.documents.filter(d=>d.status==='AI_APPROVED').length,documentsNeedRevision:report.documents.filter(d=>d.status==='NEEDS_REVISION').length,samplesReviewed:report.samples.length,labelCorrections:Object.keys(fixes).length,pairsReviewed:report.samples.flatMap(s=>s.pairs).length,pairsRejected:report.samples.flatMap(s=>s.pairs).filter(p=>p.status==='REJECTED').length};
save('resources/chatbot-knowledge/corpus.json',corpus);save('test/fixtures/rag-gold.json',gold);save('test/fixtures/rag-r0-review-results.json',report);console.log(report.summary);
