// Additional question bank: independent data; existing expanded seed is unchanged.
import { GrammarTestAggregate } from '../../features/grammar-tests/types/grammar-test.type';
import { ReadingTestAggregate } from '../../features/reading-tests/types/reading-test.type';
import { WritingTestAggregate } from '../../features/writing-tests/types/writing-test.type';
import { SpeakingTestAggregate } from '../../features/speaking-tests/types/speaking-test.type';
import { SAMPLE_COVER } from './seed-sample-tests';

export const themes = [
  {
    "name": "Technology",
    "club": "technology club",
    "activity": "building simple devices",
    "place": "innovation centre",
    "person": "Oliver",
    "day": "Saturday",
    "item": "tablet",
    "event": "robotics demonstration",
    "problem": "the invited engineer is unavailable",
    "solution": "invite an instructor from the local college"
  },
  {
    "name": "Gardening",
    "club": "gardening club",
    "activity": "growing vegetables",
    "place": "garden centre",
    "person": "Sophie",
    "day": "Sunday",
    "item": "spade",
    "event": "plant exchange",
    "problem": "the greenhouse needs urgent repairs",
    "solution": "hold the exchange in the community hall"
  },
  {
    "name": "Travel",
    "club": "travel club",
    "activity": "planning journeys",
    "place": "visitor centre",
    "person": "Liam",
    "day": "Wednesday",
    "item": "guidebook",
    "event": "travel planning workshop",
    "problem": "the railway has cancelled the group service",
    "solution": "arrange a coach from the town centre"
  },
  {
    "name": "Science",
    "club": "science club",
    "activity": "conducting experiments",
    "place": "science centre",
    "person": "Maya",
    "day": "Friday",
    "item": "magnifying glass",
    "event": "science discovery day",
    "problem": "the laboratory is closed for inspection",
    "solution": "use the college demonstration room"
  },
  {
    "name": "Wellbeing",
    "club": "wellbeing club",
    "activity": "practising relaxation techniques",
    "place": "wellness centre",
    "person": "Noah",
    "day": "Tuesday",
    "item": "exercise mat",
    "event": "relaxation workshop",
    "problem": "the instructor has become ill",
    "solution": "ask a qualified substitute to lead the workshop"
  }
] as const;
const base = (name: string) => ({ mode: 'full' as const, purpose: 'EXAM' as const, details: { title: name, pictureUrl: SAMPLE_COVER } });
export const rotate = <T>(values: T[], offset: number): T[] => values.slice(offset % values.length).concat(values.slice(0, offset % values.length));

// Definitions, rather than isolated synonyms, keep every matching answer unambiguous.
const vocabulary = [
  "processor=the part of a computer that carries out instructions|battery=a device that stores electrical energy|screen=the surface on which images appear|keyboard=keys used to enter text|cable=a covered wire connecting equipment|sensor=a device that detects changes|software=programs used by a computer|hardware=the physical parts of a computer|network=connected computers sharing information|password=a secret sequence used to gain access|download=copy a file from a remote computer|upload=send a file to a remote computer|install=prepare a program for use|restart=start a device again|browse=look through websites|wireless=working without connecting wires|portable=easy to carry from place to place|digital=using information stored as numbers|automatic=working without direct human control|compatible=able to work with another device|storage=space used to keep files|backup=a spare copy of information|update=a newer version with changes|settings=options controlling how a device works|cursor=a marker showing where text will appear",
  "seed=a small object from which a plant grows|root=the part of a plant that absorbs water underground|stem=the main stalk of a plant|leaf=a flat green part of a plant|flower=the colourful part that produces seeds|soil=the earth in which plants grow|compost=decayed organic material used to improve soil|fertiliser=a substance that supplies nutrients to plants|greenhouse=a glass building for growing plants|seedling=a young plant grown from a seed|sow=put seeds into the ground|water=give liquid to a plant|prune=cut branches to encourage healthy growth|harvest=collect a crop when it is ready|transplant=move a growing plant to another place|shovel=a tool for moving soil|rake=a tool with teeth for collecting leaves|hose=a flexible tube for carrying water|wheelbarrow=a small one-wheeled cart|pot=a container in which a plant grows|weed=an unwanted plant growing among crops|pest=an animal that damages plants|drought=a long period without rain|shade=a place protected from direct sunlight|orchard=land planted with fruit trees",
  "itinerary=a detailed plan for a journey|destination=the place someone is travelling to|passport=an official document for international travel|visa=permission to enter a country|luggage=bags taken on a journey|platform=the area beside a railway track for passengers|terminal=a building where passengers begin or end a journey|departure=the act of leaving a place|arrival=the act of reaching a place|reservation=an arrangement to keep a place for someone|fare=the price paid for a journey|timetable=a list of departure and arrival times|connection=a further service taken during a journey|transfer=a change from one vehicle to another|delay=a period of unexpected waiting|board=get onto a vehicle|explore=travel around to learn about a place|pack=put belongings into a bag|cancel=decide that an arrangement will not happen|confirm=state that an arrangement is definite|souvenir=an object kept as a reminder of a visit|landmark=a recognisable building or feature|currency=the money used in a country|accommodation=a place to stay temporarily|excursion=a short organised trip",
  "hypothesis=an idea that can be tested|experiment=a test carried out to discover something|observation=information gained by watching carefully|measurement=a number showing size or amount|evidence=information supporting an explanation|laboratory=a room equipped for scientific work|microscope=an instrument for viewing very small objects|telescope=an instrument for viewing distant objects|thermometer=an instrument for measuring temperature|balance=an instrument for measuring mass|sample=a small amount selected for testing|variable=a factor that can change in a test|control=a comparison condition in an experiment|result=what is discovered after a test|conclusion=a judgment based on findings|predict=say what is expected to happen|compare=examine similarities and differences|record=write down information for later use|analyse=examine information to understand it|repeat=do the same procedure again|accurate=close to the correct value|reliable=producing dependable results|transparent=allowing light to pass through clearly|magnetic=able to attract iron|liquid=a substance that flows and takes the shape of its container",
  "wellbeing=the state of feeling healthy and comfortable|routine=a usual sequence of activities|posture=the position in which someone holds their body|balance=the ability to remain steady|flexibility=the ability to bend easily|relax=become less tense|stretch=extend a muscle gently|breathe=take air into and out of the lungs|rest=stop activity to recover energy|concentrate=direct attention towards one thing|hydration=having enough water in the body|nutrition=the process of obtaining nourishment from food|fatigue=a feeling of extreme tiredness|stress=mental strain caused by demands|recovery=the process of returning to a healthy state|gentle=not forceful or harsh|calm=free from agitation|gradual=happening slowly in stages|balanced=containing suitable proportions|regular=happening at consistent intervals|instructor=a person who teaches a practical skill|session=a period devoted to an activity|goal=a result someone aims to achieve|progress=movement towards an improved state|habit=a repeated action that becomes usual"
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
      informalSample: `Hi Sam, I am disappointed about the change to our ${t.event}. I had arranged my week around it. Perhaps we could ask the organiser to ${t.solution}. Shall we contact the club and find out what happens to our booking fees? Best, ${t.person}`,
      formalPrompt: 'Email the organiser. Explain your concerns and suggest an alternative, including arrangements for members unable to attend. Write 120–150 words.',
      formalSample: `Dear Organiser,\n\nI am writing about the change to the ${t.event}. I understand that ${t.problem}, and I appreciate your efforts to inform members. However, many of us have already paid and changed our personal arrangements in order to attend.\n\nCould the committee consider whether it would be possible to ${t.solution}? This might allow the activity to take place without a long delay. Before making a final decision, please ask members whether the alternative arrangements would suit them.\n\nI would also be grateful for information about refunds for anyone who cannot attend. A clear announcement on the website would prevent confusion and give everyone enough time to make new plans.\n\nThank you for considering these suggestions. I look forward to hearing from you.\n\nYours sincerely,\n${t.person}` },
  } };
}

export function speakingForm(index: number, images: [string, string]): SpeakingTestAggregate {
  const t = themes[index];
  const questions = (part: number, texts: string[]) => texts.map((text, i) => ({ id: `p${part}-${i + 1}`, text, explanation: 'Trả lời trực tiếp, giải thích lý do và đưa ví dụ; câu mô tả tranh cần dựa vào chi tiết nhìn thấy.' }));
  const topics = ['Solving a practical problem', 'Caring for the environment', 'Planning a memorable journey', 'Making a discovery', 'Developing a healthy routine'];
  return { ...base(`Speaking ${t.name}`), parts: {
    1: { questions: questions(1, [`How do you feel about ${t.activity}?`, `Tell me about a ${t.place} you know.`, 'What do you usually do on your days off?']) },
    2: { imageUrl: images[index % 2], questions: questions(2, ['Describe what you can see in this picture.', ['How can a team make a meeting productive?', 'What information do people need before organising a journey?', 'Why do people use computers when planning a project?', 'How can a map help people choose their destination?', 'What problems can arise when a group makes decisions?'][index], index % 2 ? 'Tell me about a journey you helped to organise.' : 'Tell me about a time you worked with other people.']) },
    3: { imageUrls: images, questions: questions(3, ['Compare the planning activities in these two pictures.', 'How might the people use technology in each situation?', ['Why is careful planning useful at work and during leisure time?', 'How can people deal with disagreements when making plans?', 'When is it better to plan alone rather than in a group?', 'How has technology changed the way people organise their activities?', 'Why do plans sometimes need to change unexpectedly?'][index]]) },
    4: { topic: topics[index], imageUrl: images[index % 2], questions: questions(4, [`Describe a personal experience related to ${topics[index].toLowerCase()}.`, 'How did you feel before and after the experience?', 'How can sharing experiences with others change our understanding?']), explanation: 'Chuẩn bị trong một phút, sau đó trả lời đủ ba ý trong một bài nói liên tục. Không có đáp án duy nhất.' },
  } };
}
