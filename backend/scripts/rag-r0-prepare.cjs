/* Offline R0 authoring tool. Does not import documents or mutate the database. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const write = (p,v) => fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
if(!process.argv[2])throw Error('Usage: node scripts/rag-r0-prepare.cjs <local-catalog-export.json>');
const catalog = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8').replace(/^\uFEFF/,''));
const notes = read('resources/chatbot-knowledge/r0-lesson-notes.json');
const corpus = read('resources/chatbot-knowledge/corpus.json');
if(corpus.some(d=>d.reviewStatus&&d.reviewStatus!=='DRAFT'))throw Error('Reviewed corpus exists. Edit it directly; regeneration would overwrite review decisions.');
const existing = new Map(corpus.map(d=>[d.key,d]));
const reuse = {'present-simple':'english-present-simple-continuous','present-perfect':'english-present-perfect-past',conditionals:'english-conditionals','relative-clauses':'english-relative-clauses',articles:'english-countability','passive-voice':'english-passive','writing-task':'english-email-register','word-meaning':'english-vocabulary-context'};
function sections(code) {
 const [rule,good,bad,tip]=notes[code];
 return [
 {heading:'Quy tắc và phạm vi',text:rule+' Bài học này tập trung vào một kỹ năng cụ thể để bạn hiểu nguyên nhân của lựa chọn, không chỉ ghi nhớ đáp án. Trước khi áp dụng, đọc hoặc nghe đủ ngữ cảnh, xác định người tham gia, thời điểm và mục đích giao tiếp. Nếu dữ kiện chưa đủ, hãy ghi lại điều còn thiếu thay vì kết luận chắc chắn. Một dấu hiệu riêng lẻ có thể xuất hiện trong nhiều tình huống khác nhau.'},
 {heading:'Ví dụ đúng và ví dụ cần sửa',text:'Ví dụ đúng: '+good+' Ví dụ sai hoặc cách hiểu không phù hợp trong ngữ cảnh đã nêu: '+bad+' Hãy chỉ rõ sự khác nhau về cấu trúc hoặc ý nghĩa giữa hai ví dụ. Sau đó tự sửa ví dụ chưa phù hợp, đọc lại toàn câu và giải thích bằng lời của mình. Khi có nhiều cách diễn đạt đúng, hãy phân biệt phương án không đúng với phương án chỉ khác sắc thái; không coi mọi cách viết khác ví dụ là sai.'},
 {heading:'Lỗi cần lưu ý với người học Việt Nam',text:tip+' Một lỗi cần kiểm tra là chuyển từng từ hoặc thứ tự ý từ tiếng Việt sang tiếng Anh mà chưa xét quy tắc của ngôn ngữ đích. Đây là gợi ý tự kiểm tra, không phải kết luận rằng mọi người Việt đều mắc lỗi này. Hãy ghi vào sổ học tập câu ban đầu, cách sửa và lý do; lần sau thử giải thích trước khi mở đáp án. Nếu lý do chưa rõ, quay lại ví dụ và tìm bằng chứng cụ thể.'},
 {heading:'Cách luyện và mẹo làm bài Aptis',text:'Khi luyện trên AptiMate, hãy đọc yêu cầu của đúng Part và xác định nội dung mà câu hỏi đang kiểm tra. Áp dụng quy tắc ở trên vào từng phương án hoặc từng ý định trình bày, rồi kiểm tra lại cả ngữ cảnh. Sau khi xem kết quả, chọn một câu tương tự để tự làm, đổi người hoặc thời điểm trong ví dụ và giải thích vì sao cách dùng vẫn phù hợp hoặc cần thay đổi. Đừng chọn chỉ vì gặp từ quen thuộc. Với câu nghe, cần đối chiếu âm thanh; với câu đọc, cần dẫn ra ý trong văn bản. Nội dung này là hướng dẫn luyện tập, không phải thang điểm chính thức và không bảo đảm một mức CEFR.'}
 ];
}
const result=corpus.filter(d=>d.variant==='APTIS_ESOL_GENERAL').map(d=>({...d,usage:'GENERAL',topicCodes:[],component:d.component??null,part:null,criterion:null}));
for(const topic of catalog.topics){
 if(!notes[topic.code])throw Error('Missing notes '+topic.code);
 const old=existing.get(reuse[topic.code]);
 const previous=old?.sections.filter(s=>!['Quy tắc và phạm vi','Ví dụ đúng và ví dụ cần sửa','Lỗi cần lưu ý với người học Việt Nam','Cách luyện và mẹo làm bài Aptis'].includes(s.heading))??[];
 result.push({key:reuse[topic.code]??'lesson-'+topic.code,title:old?.title??'AptiMate — '+topic.name,variant:'ENGLISH',source:old?.source??null,verifiedAt:old?.verifiedAt??'2026-11-10',usage:'LESSON',topicCodes:[topic.code],component:topic.component,part:null,criterion:null,reviewStatus:'DRAFT',reviewedBy:null,reviewedAt:null,sections:[...previous,...sections(topic.code)]});
}
const strategies={GRAMMAR_VOCAB:['present-simple','word-meaning'],READING:['reading-detail','reading-cohesion','reading-opinion','reading-main-idea'],LISTENING:['listening-detail','listening-matching','listening-opinion','listening-inference'],WRITING:['writing-task','writing-task','writing-cohesion','writing-task'],SPEAKING:['speaking-fluency','speaking-vocabulary','speaking-grammar','speaking-fluency']};
for(const [component,codes] of Object.entries(strategies))codes.forEach((code,i)=>result.push({key:`strategy-${component.toLowerCase()}-p${i+1}`,title:`Luyện ${component} Part ${i+1}`,variant:'ENGLISH',source:null,verifiedAt:'2026-11-10',usage:'PART_STRATEGY',topicCodes:[code],component,part:i+1,criterion:null,reviewStatus:'DRAFT',reviewedBy:null,reviewedAt:null,sections:[{heading:'Trọng tâm luyện tập',text:notes[code][0]+' '+notes[code][3]},{heading:'Thực hành và tự kiểm tra',text:'Đọc yêu cầu và giới hạn hiển thị trên bài hiện tại. Ví dụ để luyện kỹ năng: '+notes[code][1]+' Sau khi làm, nêu bằng chứng cho đáp án hoặc kiểm tra bạn đã trả lời đủ các ý được hỏi. Ghi lại lỗi cụ thể và luyện lại với ngữ cảnh mới. Hướng dẫn này không thay thế yêu cầu của đề và không quy đổi điểm sang CEFR.'}]}));
const criteria={WRITING:{TASK:'writing-task',GRAMMAR:'writing-grammar',VOCABULARY:'writing-vocabulary',COHERENCE:'writing-cohesion',REGISTER:'writing-task',MECHANICS:'writing-grammar'},SPEAKING:{grammarVocabulary:'speaking-grammar',pronunciation:'speaking-pronunciation',fluency:'speaking-fluency',taskFulfillment:'writing-task'}};
for(const [component,map] of Object.entries(criteria))for(const [criterion,code] of Object.entries(map)){
 let text=notes[code][0]+' '+notes[code][3];
 if(criterion==='REGISTER')text='Văn phong phụ thuộc người nhận và mục đích. Email thân mật có thể dùng lời chào gần gũi; yêu cầu trang trọng cần diễn đạt lịch sự, rõ ràng. Ví dụ: Could you please send me the details? Tránh dùng mệnh lệnh thiếu lịch sự khi đang yêu cầu thông tin. Kiểm tra lời chào, cách xưng hô, mức độ trực tiếp và câu kết cùng nhau.';
 if(criterion==='MECHANICS')text='Kiểm tra chính tả, viết hoa và dấu câu. Mỗi câu cần ranh giới rõ; không nối hai mệnh đề độc lập chỉ bằng dấu phẩy. Ví dụ: I was tired, so I went home. Viết hoa đầu câu và tên riêng; phân biệt its và it’s. Soát lỗi sau khi hoàn thành nội dung để không bỏ sót yêu cầu đề.';
 if(criterion==='taskFulfillment')text='Trong câu trả lời nói, xác định đủ các câu hỏi và dành ý cho từng phần. Nêu câu trả lời trực tiếp rồi giải thích hoặc đưa ví dụ phù hợp. Khi mô tả hay so sánh, bám hình và yêu cầu được hiển thị; không chỉ đọc một bài thuộc lòng không liên quan. Tự nghe bản ghi để kiểm tra có ý nào bị bỏ quên.';
 result.push({key:`criterion-${component.toLowerCase()}-${criterion.toLowerCase()}`,title:`Hướng dẫn ${component}: ${criterion}`,variant:'ENGLISH',source:null,verifiedAt:'2026-11-10',usage:'CRITERION_GUIDE',topicCodes:[code],component,part:null,criterion,reviewStatus:'DRAFT',reviewedBy:null,reviewedAt:null,sections:[{heading:'Cách cải thiện tiêu chí',text},{heading:'Giới hạn',text:'Đây là bài hướng dẫn luyện tập, không phải rubric chấm điểm chính thức. Không tự suy band từ một lỗi hoặc một câu. Sử dụng phản hồi tiêu chí đã được hệ thống tính và kiểm tra lại với toàn bộ bài làm.'}]});
}
for(const document of result)document.key=document.key.replaceAll('_','-');
write('resources/chatbot-knowledge/corpus.json',result);
// Labels are proposed from explicit question evidence, never claimed human gold.
const typeTopics={READING_GAP_CHOICE:'reading-detail',READING_ORDER:'reading-cohesion',READING_OPINION_MATCH:'reading-opinion',READING_HEADING_MATCH:'reading-main-idea',MCQ_LISTENING_P1:'listening-detail',MATCHING_LISTENING_P2:'listening-matching',OPINION_LISTENING_P3:'listening-opinion',MCQ_LISTENING_P4:'listening-inference',VOCABULARY_MATCHING:'word-meaning'};
function topic(q){if(typeTopics[q.question_type])return typeTopics[q.question_type];const e=JSON.stringify(q.explanation).toLowerCase();return [['conditionals',/điều kiện/],['present-perfect',/since|hoàn thành/],['articles',/mạo từ|phụ âm|nguyên âm/],['prepositions',/giới từ/],['passive-voice',/bị động/],['relative-clauses',/quan hệ/],['present-simple',/hiện tại đơn/],['past-simple',/quá khứ đơn/],['verb-patterns',/gerund|infinitive|v-ing/]].find(([,r])=>r.test(e))?.[0];}
const clean=q=>! /chưa đối chiếu|kiểm tra luồng|đáp án mẫu/i.test(JSON.stringify(q.explanation));
function wrong(q){const a=q.correct_answer;if(Number.isInteger(a.optionIndex)&&q.content.options?.length>1)return {optionIndex:(a.optionIndex+1)%q.content.options.length};if(a.opinion)return {opinion:['Man','Woman','Both'].find(v=>v!==a.opinion)};if(a.speaker)return {speaker:['A','B','C','D'].find(v=>v!==a.speaker)};if(a.position)return {position:a.position===1?2:1};if(a.headingId)return {headingId:a.headingId==='h1'?'h2':'h1'};if(a.answer&&q.content.options)return {answer:q.content.options.find(v=>v!==a.answer)};return null;}
const samples=[];
for(const component of ['GRAMMAR_VOCAB','READING','LISTENING']){
 const pool=catalog.questions.filter(q=>q.component===component&&clean(q)&&topic(q));
 // Round-robin types avoids a single question-type-only fixture.
 const buckets=[...new Set(pool.map(q=>q.question_type))].map(t=>pool.filter(q=>q.question_type===t));
 let count=0;
 while(buckets.some(b=>b.length)&&count<20)for(const b of buckets){if(count>=20)break;const q=b.shift();if(!q||!wrong(q))continue;const code=topic(q);const matches=pool.filter(r=>r.test_id!==q.test_id&&r.question_type===q.question_type&&topic(r)===code).slice(0,5);if(matches.length<3)continue;
 samples.push({id:`${component.toLowerCase()}-${++count}`,reviewStatus:'DRAFT',questionId:q.id,testId:q.test_id,questionHash:q.question_hash,component,part:q.part_number,questionType:q.question_type,questionKey:q.question_key,content:q.content,correctAnswer:q.correct_answer,syntheticWrongAnswer:wrong(q),explanation:q.explanation,documentKey:reuse[code]??'lesson-'+code,similarQuestionIds:matches.map(r=>r.id),labelRationale:'Nhãn đề xuất theo dạng câu và kiến thức/chiến lược; cần người duyệt xác nhận độ tương tự từng cặp.',duplicateGroup:q.question_hash});}
 if(count!==20)throw Error('Insufficient fixtures '+component+': '+count);
}
write('test/fixtures/rag-gold.json',{version:1,status:'DRAFT_NOT_FOR_FINAL_METRICS',source:'Local published question bank, 2026-11-10; no learner records',labelPolicy:'Synthetic wrong answers; human review required. Same type alone is not proof of semantic relevance. Split near-duplicate families before threshold tuning and final evaluation.',samples});
const selected=new Set(samples.flatMap(s=>[s.questionId,...s.similarQuestionIds]));
const strip=v=>Array.isArray(v)?v.map(strip):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!/url/i.test(k)).map(([k,x])=>[k,strip(x)])):v;
write('test/fixtures/rag-r0-review-questions.json',catalog.questions.filter(q=>selected.has(q.id)).map(q=>strip(q)));
const hasTranscript=v=>v&&typeof v==='object'&&Object.entries(v).some(([k,x])=>/transcript|transcription|script/i.test(k)&&!!x||hasTranscript(x));
write('test/fixtures/rag-r0-inventory.json',{capturedAt:'2026-11-10',topics:catalog.topics,publishedObjectiveQuestions:catalog.questions.length,questionTypes:[...new Set(catalog.questions.map(q=>q.question_type))].sort(),listening:{total:catalog.questions.filter(q=>q.component==='LISTENING').length,withTranscriptField:catalog.questions.filter(q=>q.component==='LISTENING'&&(hasTranscript(q.content)||hasTranscript(q.part_contents))).length},corpus:{lessons:45,strategies:18,criteria:10},samples:samples.length});
console.log(JSON.stringify({documents:result.length,samples:samples.length,reviewQuestions:selected.size,status:'DRAFT'}));
