// Separate AI-reviewed knowledge baseline. Never promotes the R0 question-pair gold.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const original=JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/rag-gold.json'),'utf8'));
const grammar=['since-time','article-sound','modal-perfect','article-sound','article-sound','without','habit-agreement','suggest-gerund','passive-past','passive-past','look-forward-gerund','past-simple','enjoy-gerund','present-perfect-auxiliary','since-time','past-perfect','question-tag','conditional-two','mind-gerund','past-perfect-continuous'];
const notes={
 'since-time':'Since + mốc thời gian trong thì hiện tại hoàn thành.',
 'article-sound':'A useful guide: âm đầu /j/, danh từ đếm được số ít; học liệu countability có phần a/an.',
 'modal-perfect':'Need not have + past participle: đã làm nhưng không cần. Không dùng explanation nguồn bị sai.',
 'without':'Without biểu đạt thiếu sự hiện diện; giới từ đi với đại từ tân ngữ.',
 'habit-agreement':'Usually diễn đạt thói quen; chủ ngữ ngôi ba số ít dùng visits.',
 'suggest-gerund':'Suggest + V-ing.', 'passive-past':'Was + past participle với yesterday.',
 'look-forward-gerund':'Look forward to + V-ing.', 'past-simple':'Last week dùng bought.',
 'enjoy-gerund':'Enjoy + V-ing.', 'present-perfect-auxiliary':'They + have + visited.',
 'past-perfect':'Had left trước thời điểm reached.', 'question-tag':'Was hilarious → wasn’t it.',
 'conditional-two':'Would travel / if ... had more money.', 'mind-gerund':'Would you mind + V-ing.',
 'past-perfect-continuous':'Had been working diễn tả quá trình trước looked tired.'
};
const samples=original.samples.map(s=>{
 const index=Number(s.id.split('-').at(-1))-1;
 let documentKey=s.documentKey,family,reason;
 if(s.component==='GRAMMAR_VOCAB'){family=grammar[index];reason=notes[family];}
 else if(s.component==='READING'){
  if(s.questionType==='READING_GAP_CHOICE'){
   const map={1:['lesson-prepositions','weekday-on','We will meet [2] Friday → on Friday.'],5:['lesson-verb-patterns','please-infinitive','Please [3] your guitar → bring, động từ nguyên mẫu trong lời yêu cầu.'],9:['lesson-prepositions','weekday-on','On + ngày trong tuần trong passage.'],13:['lesson-pronouns','possessive-our','Our schedule: tính từ sở hữu trước danh từ.'],17:['english-conditionals','if-help','Let us know if you need any help: điều kiện.']};
   [documentKey,family,reason]=map[index];
  }else{
   family=s.questionType;reason=s.questionType==='READING_HEADING_MATCH'?'Ghép tiêu đề theo ý chính của đoạn, không theo từ trùng đơn lẻ.':s.questionType==='READING_ORDER'?'Sắp xếp câu theo từ nối, đại từ và trình tự; nhãn là chiến lược liên kết văn bản.':'Đối chiếu phát biểu với người viết; nhãn là chiến lược đọc quan điểm/thông tin nhiều người.';
  }
 }else{
  family=s.questionType+(s.questionType==='MCQ_LISTENING_P4'?'-'+documentKey:'');
  reason=documentKey==='lesson-listening-opinion'?'Dạng bài yêu cầu phân biệt quan điểm người nói; không xác nhận đáp án Man/Woman/Both.':documentKey==='lesson-listening-main-idea'?'Câu hỏi main purpose yêu cầu mục đích chính; không xác nhận nội dung audio.':'Câu hỏi yêu cầu chi tiết cụ thể (thời gian, giá, hành động, khó khăn/lời khuyên); không xác nhận đáp án audio.';
 }
 return {id:s.id,documentKey,family:s.component+':'+family,reason};
});
const fixture={version:1,review:{type:'AI',reviewer:'Codex',date:'2026-11-11',humanReviewed:false},
 scope:'R1 knowledge lesson retrieval from 60 R0 question texts; one target lesson per sample, top 5 chunks. Labels reviewed before measuring. No similarity-pair or answer-accuracy claims.',
 limitations:['Development baseline, not independent human gold or held-out generalization.','Listening labels evaluate the skill requested by written prompts; audio answers remain unverified.','Report both sample recall and family-macro recall; repeated templates share a family. No model tuning or train/test split is performed.','R0 similarQuestionIds remain excluded; question-bank Recall and verified audio evaluation remain R7 work.','Queries omit explanations and answer labels; corpus language is Vietnamese while many prompts are English.'],samples};
fs.writeFileSync(path.join(root,'test/fixtures/rag-r1-baseline-labels.json'),JSON.stringify(fixture,null,2)+'\n');
console.log(`Prepared ${samples.length} scoped knowledge labels; original R0 gold unchanged.`);
