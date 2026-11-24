// Records the explicit AI editorial decisions made after reading all 30 outputs and cited passages.
// This is not an automated semantic grader and does not claim human/teacher approval.
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../test/fixtures/rag-r2-explanation-eval.json');
const report=JSON.parse(fs.readFileSync(file,'utf8'));
if(report.results.length!==30||report.results.some(r=>r.status!=='READY'))throw Error('Complete the 30-sample generation first.');
const notes={
 'grammar_vocab-1':'Đúng since với hiện tại hoàn thành; mẹo nên nhắc lại phạm vi thì để tránh áp dụng máy móc cho mọi mốc thời gian.',
 'grammar_vocab-6':'Đúng nghĩa without và bám ví dụ nguồn; cách diễn đạt puppy makes life so cute trong tip hơi thiếu tự nhiên.',
 'grammar_vocab-13':'Đúng enjoy + V-ing trong câu này; quy tắc dùng từ luôn cần hiểu trong phạm vi theo sau bằng động từ, vì enjoy còn nhận tân ngữ danh từ.',
 'grammar_vocab-18':'Đúng điều kiện loại hai; mẹo would + verb nên nhắc phạm vi giả định hiện tại, không áp dụng cho mọi câu điều kiện hỗn hợp.',
 'grammar_vocab-19':'Đúng would you mind + V-ing; nên giữ rõ phạm vi cấu trúc theo sau trực tiếp bằng động từ, không loại trừ mệnh đề if.',
 'reading-1':'Giải thích đúng nguồn gốc nhóm; ruleSummary hơi riêng cho đoạn nguồn gốc, chưa phải quy tắc bao quát mọi bài tìm ý chính.',
};
report.reviewer={type:'AI',name:'Codex',date:'2026-11-11',humanReviewed:false,
 method:'Read each question/context, generated explanation/rule/tip and all cited passages; record 0–2 scores. Not an independent held-out evaluation.'};
report.rubric={scale:'0 = sai/không được hỗ trợ/khó hiểu; 1 = chấp nhận được nhưng cần làm rõ; 2 = đạt trong ngữ cảnh câu.',dimensions:['knowledge','grounding','clarity']};
for(const row of report.results){
 const ids=new Set(row.sources.map(s=>s.chunkId));
 if(!row.content.citations.length||row.content.citations.some(id=>!ids.has(id)))throw Error('INVALID_CITATION');
 row.review={knowledge:2,grounding:2,clarity:notes[row.id]?1:2,
  verdict:notes[row.id]?'ACCEPTED_WITH_NOTE':'ACCEPTED',note:notes[row.id]??'Đáp án/quy tắc đúng trong ngữ cảnh, các nhận định chính có căn cứ trong đoạn nguồn hoặc văn bản câu hỏi, diễn đạt rõ.'};
}
for(const row of report.rejectedExamples??[])row.review={knowledge:0,grounding:1,clarity:1,verdict:'REJECTED',note:'Chọn đúng had been working nhưng gọi nhầm past continuous. Đã bổ sung validator và regression; bản sinh lại dùng đúng past perfect continuous.'};
report.summary={reviewed:30,ready:30,validCitationSamples:30,rejectedDuringDevelopment:report.rejectedExamples?.length??0,
 averages:Object.fromEntries(['knowledge','grounding','clarity'].map(key=>[key,report.results.reduce((sum,row)=>sum+row.review[key],0)/30])),
 limitations:['AI review, not human teacher sign-off.','Only Grammar/Reading public R0 fixtures; Listening audio is not independently verified.','Provider 503/quota failures were retried to collect quality samples; this is not first-attempt availability or latency measurement.','Some samples are near duplicates. R7 needs an independent set.','The 30 development outputs were collected across prompt/query refinements and all revalidated against the final contract; they are not 30 fresh calls made after freezing the final prompt.']};
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(report.summary);
