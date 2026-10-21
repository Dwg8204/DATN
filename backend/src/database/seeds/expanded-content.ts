import { GrammarTestAggregate } from '../../features/grammar-tests/types/grammar-test.type';
import { ReadingTestAggregate } from '../../features/reading-tests/types/reading-test.type';
import { WritingTestAggregate } from '../../features/writing-tests/types/writing-test.type';
import { SpeakingTestAggregate } from '../../features/speaking-tests/types/speaking-test.type';
import { SAMPLE_COVER, SAMPLE_SPEAKING_IMAGES } from './seed-sample-tests';

export const themes = [
  { name: 'Photography', club: 'photography club', activity: 'taking photographs', place: 'museum', person: 'Anna', day: 'Monday', item: 'camera', event: 'photo exhibition', problem: 'the exhibition room is unavailable', solution: 'use the public library instead' },
  { name: 'Cooking', club: 'cooking club', activity: 'preparing meals', place: 'market', person: 'Ben', day: 'Tuesday', item: 'basket', event: 'cooking workshop', problem: 'the kitchen is being repaired', solution: 'book the school kitchen instead' },
  { name: 'Walking', club: 'walking club', activity: 'exploring nature', place: 'park', person: 'Clara', day: 'Wednesday', item: 'backpack', event: 'guided nature walk', problem: 'the usual footpath is closed', solution: 'choose a shorter route near town' },
  { name: 'Books', club: 'book club', activity: 'reading novels', place: 'library', person: 'Daniel', day: 'Thursday', item: 'notebook', event: 'author discussion', problem: 'the guest author cannot travel', solution: 'invite the author to join online' },
  { name: 'Music', club: 'music club', activity: 'playing music', place: 'theatre', person: 'Emma', day: 'Friday', item: 'guitar', event: 'evening concert', problem: 'the main hall is being decorated', solution: 'hire a smaller hall nearby' },
] as const;
const base = (name: string) => ({ mode: 'full' as const, purpose: 'EXAM' as const, details: { title: name, pictureUrl: SAMPLE_COVER } });
export const rotate = <T>(values: T[], offset: number): T[] => values.slice(offset % values.length).concat(values.slice(0, offset % values.length));

// Definitions, rather than isolated synonyms, keep every matching answer unambiguous.
const vocabulary = [
  'lens=glass that focuses light|portrait=a picture of a person|tripod=a three-legged camera support|shutter=the camera part that opens to let light in|gallery=a place where art is displayed|exposure=the amount of light reaching a camera sensor|caption=words explaining a picture|landscape=a view of countryside|focus=adjustment that makes an image sharp|reflection=an image seen in a mirror|frame=the border around a picture|album=a collection of photographs|contrast=the difference between light and dark|snapshot=a quick informal photograph|enlarge=make an image bigger|crop=remove the outer edges of an image|blur=make an image unclear|flash=a sudden brief bright light|shade=an area protected from direct sunlight|angle=the direction from which a photograph is taken|exhibit=display something publicly|edit=make changes to improve something|capture=record a moment in an image|background=the part of a scene behind the main subject|foreground=the part of a scene closest to the viewer',
  'recipe=instructions for preparing a dish|ingredient=one of the foods used in a dish|oven=an enclosed appliance for baking|kettle=a container used to boil water|colander=a bowl with holes for draining food|slice=cut into thin flat pieces|chop=cut into small pieces|stir=mix food using a circular movement|peel=remove the outer skin of fruit|grate=rub food against sharp holes to make tiny pieces|simmer=cook gently just below boiling|roast=cook with dry heat in an oven|steam=cook using hot water vapour|freeze=make food solid by cooling it|knead=press and stretch dough|savoury=having a salty rather than sweet flavour|ripe=ready for eating after growing|raw=not cooked|stale=no longer fresh|tender=easy to cut or chew|portion=an amount of food for one person|leftovers=food remaining after a meal|apron=clothing worn to protect clothes while cooking|utensil=a tool used for preparing food|whisk=a tool for beating eggs or cream',
  'trail=a path through the countryside|summit=the highest point of a mountain|valley=low land between hills|stream=a small flowing body of water|cliff=a steep rock face|compass=an instrument showing direction|map=a drawing showing where places are|shelter=a place that protects against bad weather|rucksack=a bag carried on the back|torch=a small portable electric light|sturdy=strong and well built|slippery=difficult to walk on without sliding|steep=rising at a sharp angle|remote=far from towns and other people|scenic=having attractive natural views|ascend=move upwards|descend=move downwards|pause=stop for a short time|wander=walk without a fixed route|navigate=find the correct route|wildlife=animals living in their natural environment|habitat=the natural home of an animal|footprint=a mark left by a foot|waterproof=not allowing water through|altitude=height above sea level',
  'novel=a long invented story in a book|biography=the story of a real person written by someone else|chapter=a main division of a book|index=an alphabetical list of topics and page numbers|glossary=a list explaining specialised words|author=a person who writes a book|publisher=a company that produces books for sale|editor=a person who prepares writing for publication|narrator=the voice that tells a story|reader=a person who reads|borrow=take something temporarily with permission|lend=give something temporarily to another person|renew=extend the period of a library loan|reserve=arrange for something to be kept for you|return=give something back|fiction=writing about invented events|poetry=writing arranged in lines with rhythm or imagery|plot=the sequence of events in a story|setting=the time and place of a story|character=a person appearing in a story|review=a written opinion about a book|summary=a short account of the main points|quotation=words copied exactly from a source|edition=a particular published version of a book|sequel=a story continuing an earlier story',
  'melody=a recognisable sequence of musical notes|rhythm=a repeated pattern of beats|tempo=the speed at which music is played|lyrics=the words of a song|harmony=notes played together to make a pleasing sound|conductor=a person directing an orchestra|composer=a person who writes music|soloist=a musician performing alone|choir=a group of singers|audience=people watching a performance|rehearse=practise for a performance|tune=adjust an instrument to the correct pitch|perform=present music to listeners|applaud=clap to show enjoyment|record=store sound so it can be played later|violin=a small string instrument played with a bow|flute=a wind instrument held sideways|drum=an instrument with a surface that is struck|keyboard=an instrument with rows of black and white keys|trumpet=a brass instrument with three valves|interval=a break between parts of a concert|stage=a raised area for performers|venue=a place where an event happens|ticket=a document giving admission to an event|encore=an extra performance requested by the audience',
];

export function grammarForm(index: number): GrammarTestAggregate {
  const t = themes[index];
  const items: Array<[string, string, string, string, string]> = [
    [`${t.person} usually ___ the ${t.place} on Saturdays.`, 'visits', 'visit', 'visiting', 'Hiện tại đơn, chủ ngữ số ít.'],
    [`We ___ near the ${t.place} when the rain started.`, 'were waiting', 'wait', 'have wait', 'Quá khứ tiếp diễn cho hành động đang xảy ra.'],
    [`I have owned this ${t.item} ___ three years.`, 'for', 'since', 'from', 'For đứng trước một khoảng thời gian.'],
    [`There is ___ useful guide to the ${t.place} on the desk.`, 'a', 'an', 'some', 'Useful bắt đầu bằng phụ âm /j/.'],
    [`This ${t.item} is ___ than my old one.`, 'better', 'best', 'good', 'So sánh hơn bất quy tắc: good → better.'],
    [`Visitors ___ leave their bags at the entrance to the ${t.place}; it is compulsory.`, 'must', 'might', 'would', 'Must diễn tả nghĩa vụ bắt buộc.'],
    [`If the ${t.place} opens early, we ___ there before lunch.`, 'will go', 'went', 'had gone', 'Điều kiện loại một.'],
    [`My friends enjoy ___ about ${t.activity}.`, 'learning', 'learn', 'to learn', 'Enjoy + V-ing.'],
    [`The new ${t.item} ___ yesterday.`, 'was delivered', 'delivers', 'is delivering', 'Bị động quá khứ đơn.'],
    [`How ___ time do we need at the ${t.place}?`, 'much', 'many', 'few', 'Time không đếm được trong câu này.'],
    [`The members ___ already booked the ${t.event}.`, 'have', 'has', 'having', 'Chủ ngữ số nhiều dùng have.'],
    [`${t.person} is interested ___ joining our ${t.club}.`, 'in', 'at', 'for', 'Interested in.'],
    [`The ${t.place} was closed, ___ we went home.`, 'so', 'because', 'although', 'So biểu thị kết quả.'],
    [`The woman ___ runs the ${t.club} lives nearby.`, 'who', 'which', 'where', 'Who thay cho người.'],
    [`We ___ a new ${t.item} last week.`, 'bought', 'buy', 'have buy', 'Last week đi với quá khứ đơn.'],
    [`Please handle the ${t.item} ___.`, 'carefully', 'careful', 'care', 'Trạng từ bổ nghĩa cho handle.'],
    [`If I ___ more free time, I would join the ${t.club}.`, 'had', 'have', 'will have', 'Điều kiện loại hai.'],
    [`There ___ several people outside the ${t.place}.`, 'are', 'is', 'be', 'Several people là số nhiều.'],
    [`Do you know when the ${t.event} ___?`, 'starts', 'does start', 'starting', 'Mệnh đề hỏi gián tiếp giữ trật tự câu trần thuật.'],
    [`${t.person} has just ___ the membership form.`, 'written', 'wrote', 'write', 'Have/has + quá khứ phân từ.'],
    [`We look forward to ___ you at the ${t.place}.`, 'meeting', 'meet', 'met', 'Look forward to + V-ing.'],
    [`You have not seen my ${t.item}, ___ you?`, 'have', 'do', 'are', 'Câu hỏi đuôi theo trợ động từ have.'],
    [`Each member of the ${t.club} ___ a badge.`, 'has', 'have', 'having', 'Each dùng động từ số ít.'],
    [`I wish the ${t.place} ___ closer to my home.`, 'were', 'is', 'will be', 'Wish + quá khứ giả định cho mong muốn ở hiện tại.'],
    [`By the time we reached the ${t.place}, the visitors ___ left.`, 'had', 'have', 'are', 'Quá khứ hoàn thành diễn tả hành động trước một mốc quá khứ.'],
  ];
  const entries = vocabulary[index].split('|').map(pair => pair.split('='));
  return { ...base(`Grammar ${t.name}`), parts: {
    1: { instruction: 'Choose the correct word or phrase.', questions: items.map(([text, answer, b, c, explanation], i) => {
      const options = rotate([answer, b, c], (index + i) % 3);
      return { id: i + 1, text, options, correctAnswer: options.indexOf(answer), explanation };
    }) },
    2: { sets: Array.from({ length: 5 }, (_, group) => {
      const targets = entries.slice(group * 5, group * 5 + 5);
      const distractors = entries.slice(((group + 1) % 5) * 5, ((group + 1) % 5) * 5 + 5);
      const choices = rotate([...targets, ...distractors].map(pair => pair[1]), index + group + 1);
      return { setId: group + 1, instruction: 'Match each word with its definition. Five definitions are not needed.',
        targetWords: targets.map(([word, meaning], i) => ({ id: 26 + group * 5 + i, word, correctAnswer: 'ABCDEFGHIJ'[choices.indexOf(meaning)], explanation: `${word}: ${meaning}.` })),
        options: choices.map((text, i) => ({ label: 'ABCDEFGHIJ'[i], text })) };
    }) },
  } };
}

export function readingForm(index: number): ReadingTestAggregate {
  const t = themes[index];
  const sequences = [
    [`Booking a place at the ${t.event}`, [`Yesterday I decided to book a place at the ${t.event}.`, 'First, I opened the booking page on the club website.', 'Once the page had loaded, I selected a suitable time.', 'After selecting that time, I entered my name and email address.', 'With my details complete, I pressed the confirmation button.', 'Finally, a confirmation message arrived in my inbox.']],
    [`A first visit to the ${t.place}`, [`Last week I visited the ${t.place} for the first time.`, 'Before leaving home, I checked the address on my phone.', 'Then I followed the directions and arrived at the entrance.', 'After going inside, I asked a member of staff for a guide.', 'Using that guide, I explored the building until closing time.', 'At the end of the visit, I thanked the staff and went home.']],
  ] as const;
  const posts = [
    `I joined the ${t.club} because membership costs very little. I can only attend in the morning because I work every evening. I wish the club had more equipment to lend to beginners.`,
    `I travel to the ${t.club} from a village, so getting there takes an hour. Fortunately, the sessions are worth the journey. I have made a close friend there and we sometimes practise together.`,
    `I have enjoyed ${t.activity} for years and now help new members. I prefer small sessions because everyone can ask questions. I am also organising a free introductory session next month.`,
    `I discovered the ${t.club} through its website. The weekend timetable suits me, but booking a place online can be confusing. I have suggested making the booking page easier to use.`,
  ];
  const statements = [ ['Who chose the club partly because it is inexpensive?', 'A'], ['Who has a long journey to the club?', 'B'], ['Who shares their experience with beginners?', 'C'], ['Who wants to improve the online reservation process?', 'D'], ['Who cannot attend evening sessions?', 'A'], ['Who met someone they now practise with?', 'B'], ['Who is planning an event for newcomers?', 'C'] ];
  const sections = [
    ['How the group began', `The ${t.club} started with just four neighbours. They met informally each month to share their interest in ${t.activity}. As more people asked to join, they decided to establish an organised group open to the whole town.`],
    ['Finding a meeting place', `At first, members met in their homes, but space soon became a problem. After comparing several buildings, the group rented a room near the ${t.place}. It had good public transport connections and enough space for practical activities.`],
    ['Making membership affordable', 'The committee wanted people on different incomes to take part. It kept the annual fee low and introduced a reduced rate for students. A small grant from the council paid for the equipment that members could share.'],
    ['Welcoming inexperienced members', `No previous experience of ${t.activity} is necessary. Newcomers are paired with experienced members for their first session. Clear written instructions and short demonstrations help people feel comfortable asking questions and trying unfamiliar tasks.`],
    ['Managing the timetable', 'Members have different working hours, so a single weekly meeting would exclude many people. The club now alternates morning and evening sessions. A shared calendar shows each activity, its location and the name of the person responsible.'],
    ['Listening to suggestions', `After the first ${t.event}, the committee sent out a short survey. Members praised the friendly atmosphere but asked for clearer booking instructions. The club responded by simplifying its website and adding a telephone booking option.`],
    ['Reaching the wider community', `Next year, the ${t.club} plans to run sessions at local schools and visit neighbouring villages. The aim is to reach people who cannot easily travel to regular meetings. Volunteers are currently preparing portable materials for these visits.`],
  ];
  const options = [['delighted', 'delight', 'delighting'], ['on', 'in', 'at'], ['bring', 'brings', 'bringing'], ['our', 'us', 'we'], ['if', 'until', 'unless']];
  return { ...base(`Reading ${t.name}`), parts: {
    1: { passageVersion: 1, passage: `Dear ${t.person}, I am [1] to confirm your place at the ${t.event}. We will meet [2] ${t.day}. Please [3] your ${t.item}. A volunteer will explain [4] schedule when you arrive. Let us know [5] you need any help.`,
      questions: options.map((choices, i) => ({ id: `p1-q${i + 1}`, position: i + 1, options: rotate(choices, (index + i) % 3), answer: choices[0], explanation: ['Be delighted to + động từ.', 'On đứng trước ngày trong tuần.', 'Please + động từ nguyên mẫu.', 'Our là tính từ sở hữu trước schedule.', 'If diễn tả điều kiện cần giúp đỡ.'][i] })) },
    2: { texts: sequences.map(([title, lines], i) => ({ id: `p2-t${i + 1}`, title, sentences: rotate(lines.map((content, j) => ({ id: `p2-t${i + 1}-s${j + 1}`, content, correctPosition: j + 1, explanation: 'Các mốc thời gian và từ nối chỉ rõ trình tự của câu chuyện.' })), index + 1) })) },
    3: { speakers: ['A', 'B', 'C', 'D'], posts, passage: '', questions: statements.map(([statement, answer], i) => ({ id: `p3-q${i + 1}`, statement, answer, explanation: `Xem thông tin trực tiếp trong lời của người ${answer}.` })) },
    4: { title: `Developing our ${t.club}`, paragraphs: sections.map(([, content], i) => ({ id: `para${i + 1}`, label: `Paragraph ${'ABCDEFG'[i]}`, content })), headings: rotate(sections.map(([text], i) => ({ id: `h${i + 1}`, text, correctParagraph: `para${i + 1}`, explanation: `Đoạn ${'ABCDEFG'[i]} tập trung vào chủ đề: ${text.toLowerCase()}.` })), index + 2) },
  } };
}

export function writingForm(index: number): WritingTestAggregate {
  const t = themes[index];
  return { ...base(`Writing ${t.name}`), parts: {
    1: { context: `You are applying to join a ${t.club}. Answer in 1–5 words.`, questions: ['What is your first name?', 'Which activity interests you?', 'When are you usually free?', 'What equipment can you bring?', 'Where would you like to meet?'], sampleAnswers: [t.person, t.activity, `On ${t.day} afternoons`, `My ${t.item}`, `Near the ${t.place}`] },
    2: { instruction: 'Write 20–30 words in complete sentences.', prompt: `Why do you want to join the ${t.club}, and what do you hope to learn?`, sampleAnswer: `I want to join because I enjoy ${t.activity} with other people. I hope experienced members can teach me useful techniques and help me improve.` },
    3: { context: `Chat with members of the ${t.club}. Write 30–40 words for each reply.`, messages: [`Describe a recent experience of ${t.activity}.`, 'Is it better to learn from an instructor or from friends? Why?', `How could our ${t.club} attract new members?`], sampleAnswers: [
      `Last weekend I spent an afternoon ${t.activity} with my cousin. We tried something new and made a few mistakes, but we enjoyed learning together. Afterwards, we discussed what we could improve next time.`,
      'I prefer learning from an instructor because they can explain difficult techniques clearly and correct my mistakes. However, practising with friends is also useful because we encourage each other and feel comfortable asking simple questions.',
      `Our ${t.club} could offer a free introductory session for local residents. Members could show beginners what we do and answer their questions. Sharing photographs of the event online might also encourage more people to join.`,
    ] },
    4: { context: `Your ${t.club} has announced that the ${t.event} cannot go ahead as planned because ${t.problem}. Members have already paid a booking fee.`,
      informalPrompt: 'Email a friend in the club. Explain your feelings and suggest what to do next. Write about 50 words.',
      informalSample: `Hi Sam, I am disappointed about the change to our ${t.event}. I had arranged my week around it. Perhaps we could ask the organiser to ${t.solution}. Shall we contact the club together and find out what happens to our booking fees? Best, ${t.person}`,
      formalPrompt: 'Email the organiser. Explain your concerns and suggest an alternative, including arrangements for members unable to attend. Write 120–150 words.',
      formalSample: `Dear Organiser,\n\nI am writing about the change to the ${t.event}. I understand that ${t.problem}, and I appreciate your efforts to inform members. However, many of us have already paid and changed our personal arrangements in order to attend.\n\nCould the committee consider whether it would be possible to ${t.solution}? This might allow the activity to take place without a long delay. Before making a final decision, please ask members whether the alternative arrangements would suit them.\n\nI would also be grateful for information about refunds for anyone who cannot attend. A clear announcement on the website would prevent confusion and give everyone enough time to make new plans.\n\nThank you for considering these suggestions. I look forward to hearing from you.\n\nYours sincerely,\n${t.person}` },
  } };
}

export function speakingForm(index: number): SpeakingTestAggregate {
  const t = themes[index];
  const questions = (part: number, texts: string[]) => texts.map((text, i) => ({ id: `p${part}-${i + 1}`, text, explanation: 'Trả lời trực tiếp, giải thích lý do và đưa ví dụ; câu mô tả tranh cần dựa vào chi tiết nhìn thấy.' }));
  const topics = ['Learning a new skill', 'Helping another person', 'Spending time outdoors', 'Discovering an interesting story', 'Attending a live event'];
  return { ...base(`Speaking ${t.name}`), parts: {
    1: { questions: questions(1, [`How do you feel about ${t.activity}?`, `Tell me about a ${t.place} you know.`, 'What do you usually do on your days off?']) },
    2: { imageUrl: SAMPLE_SPEAKING_IMAGES[2 + index % 2], questions: questions(2, ['Describe the people and surroundings in this picture.', ['What skills help someone communicate clearly in an interview?', 'Why do people enjoy taking part in team sports?', 'How might the person prepare before recording a conversation?', 'What challenges do players face during a match?', 'Why do some people prefer listening to interviews rather than reading them?'][index], ['Tell me about a time you explained an idea to someone.', 'Tell me about a team activity you enjoyed.', 'Tell me about an interesting conversation you had.', 'Tell me about a sporting event you watched.', 'Tell me about a programme you listened to recently.'][index]]) },
    3: { imageUrls: [SAMPLE_SPEAKING_IMAGES[2], SAMPLE_SPEAKING_IMAGES[3]], questions: questions(3, ['Compare the activities and surroundings in these two pictures.', ['Would you prefer to interview an athlete or play in a match? Why?', 'Which activity requires more physical preparation? Why?', 'How does teamwork matter in these two activities?', 'Which activity would you find more stressful? Why?', 'How can these activities entertain an audience?'][index], ['Why is good communication important in different jobs?', 'Why do people choose different leisure activities?', 'How can people learn to work well with others?', 'What helps people perform well under pressure?', 'Why do people enjoy watching others perform?'][index]]) },
    4: { topic: topics[index], imageUrl: SAMPLE_SPEAKING_IMAGES[2 + index % 2], questions: questions(4, [`Describe a personal experience related to ${topics[index].toLowerCase()}.`, 'How did you feel before and after the experience?', 'How can sharing experiences with others change our understanding?']), explanation: 'Chuẩn bị trong một phút, sau đó trả lời đủ ba ý trong một bài nói liên tục. Không có đáp án duy nhất.' },
  } };
}
