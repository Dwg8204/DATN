import 'reflect-metadata';
import { DataSource, EntityManager } from 'typeorm';
import { testCreationId } from '../../common/tests/test-creation';
import { TestPurpose } from '../../common/tests/test-purpose';
import { GrammarTestsRepository } from '../../features/grammar-tests/repositories/grammar-tests.repository';
import { GrammarTestContentService } from '../../features/grammar-tests/services/grammar-test-content.service';
import { GrammarTestAggregate } from '../../features/grammar-tests/types/grammar-test.type';
import { ReadingTestsRepository } from '../../features/reading-tests/repositories/reading-tests.repository';
import { ReadingTestContentService } from '../../features/reading-tests/services/reading-test-content.service';
import { ReadingTestAggregate } from '../../features/reading-tests/types/reading-test.type';
import { ListeningTestsRepository } from '../../features/listening-tests/repositories/listening-tests.repository';
import { ListeningTestContentService } from '../../features/listening-tests/services/listening-test-content.service';
import { ListeningTestAggregate } from '../../features/listening-tests/types/listening-test.type';
import { WritingTestsRepository } from '../../features/writing-tests/repositories/writing-tests.repository';
import { WritingTestContentService } from '../../features/writing-tests/services/writing-test-content.service';
import { WritingTestAggregate } from '../../features/writing-tests/types/writing-test.type';
import { SpeakingTestsRepository } from '../../features/speaking-tests/repositories/speaking-tests.repository';
import { SpeakingTestContentService } from '../../features/speaking-tests/services/speaking-test-content.service';
import { SpeakingTestAggregate } from '../../features/speaking-tests/types/speaking-test.type';

export const SAMPLE_COVER = 'https://res.cloudinary.com/dkrisyrlh/image/upload/v1790006944/aptimate/test-covers/xsa3zih3ghbmmi7cgmvq.jpg';
export const SAMPLE_SPEAKING_IMAGES = [
  'https://res.cloudinary.com/dkrisyrlh/image/upload/v1790519369/aptimate/test-covers/zsxwablvf38r8czhb6rs.jpg',
  'https://res.cloudinary.com/dkrisyrlh/image/upload/v1790009277/aptimate/test-covers/os6tueqvfbo7kbycjva1.jpg',
  'https://res.cloudinary.com/dkrisyrlh/image/upload/v1786611161/vccorp-blog/uploads/4/d8a9fcc6-186d-45d2-abfe-ce6ee03a559a.webp',
  'https://res.cloudinary.com/dkrisyrlh/image/upload/v1786522535/vccorp-blog/uploads/4/41a23ab0-355b-494d-aace-da9abf2e0500.webp',
] as const;
export const SAMPLE_LISTENING_AUDIO = [
  'https://res.cloudinary.com/dkrisyrlh/video/upload/v1790869822/aptimate/test-covers/fozamfxbynyzwoxhnggb.mp3',
  'https://res.cloudinary.com/dkrisyrlh/video/upload/v1791202055/aptimate/test-covers/sigghxjdnw0qs1ydcuer.mp3',
] as const;

const details = (title: string) => ({ title, pictureUrl: SAMPLE_COVER });

function grammarSample(): GrammarTestAggregate {
  const items: Array<[string, string[], number, string]> = [
    ['She ___ to work by bus every day.', ['go', 'goes', 'going'], 1, 'Chủ ngữ she đi với động từ thêm -s ở hiện tại đơn.'],
    ['We ___ dinner when the phone rang.', ['were having', 'have', 'are having'], 0, 'Hành động đang diễn ra trong quá khứ dùng quá khứ tiếp diễn.'],
    ['I have lived here ___ 2020.', ['for', 'since', 'during'], 1, 'Since đi với mốc thời gian.'],
    ['There is ___ apple on the table.', ['a', 'an', 'the two'], 1, 'An đứng trước âm nguyên âm.'],
    ['This book is ___ than that one.', ['interesting', 'most interesting', 'more interesting'], 2, 'So sánh hơn của tính từ dài dùng more.'],
    ['You ___ wear a helmet when riding a motorbike.', ['must', 'might', 'would'], 0, 'Must diễn tả sự bắt buộc.'],
    ['If it rains tomorrow, we ___ at home.', ['stayed', 'will stay', 'have stayed'], 1, 'Điều kiện loại một dùng will ở mệnh đề chính.'],
    ['He enjoys ___ in the river.', ['swim', 'to swim', 'swimming'], 2, 'Enjoy đi với động từ thêm -ing.'],
    ['The letter ___ yesterday.', ['was sent', 'sends', 'is sending'], 0, 'Bị động quá khứ đơn: was/were + quá khứ phân từ.'],
    ['How ___ water do you drink each day?', ['many', 'much', 'few'], 1, 'Water là danh từ không đếm được.'],
    ['They ___ visited London before.', ['has', 'having', 'have'], 2, 'They đi với have trong hiện tại hoàn thành.'],
    ['My sister is good ___ mathematics.', ['at', 'on', 'to'], 0, 'Cụm từ đúng là good at.'],
    ['I was tired, ___ I went to bed early.', ['because', 'so', 'although'], 1, 'So nối nguyên nhân với kết quả.'],
    ['The man ___ lives next door is a doctor.', ['which', 'where', 'who'], 2, 'Who thay thế cho người trong mệnh đề quan hệ.'],
    ['We ___ to the cinema last Saturday.', ['went', 'go', 'have go'], 0, 'Last Saturday là thời gian quá khứ đã kết thúc.'],
    ['Please speak ___; I cannot hear you.', ['loud', 'more loudly', 'loudest'], 1, 'Trạng từ bổ nghĩa cho speak; more loudly là dạng so sánh hơn.'],
    ['I would travel more if I ___ more money.', ['have', 'will have', 'had'], 2, 'Điều kiện loại hai dùng quá khứ đơn trong mệnh đề if.'],
    ['There ___ two chairs in the room.', ['are', 'is', 'be'], 0, 'Danh từ số nhiều đi với are.'],
    ['Could you tell me where the station ___?', ['does', 'is', 'are'], 1, 'Câu hỏi gián tiếp giữ trật tự chủ ngữ trước động từ.'],
    ['She has already ___ her homework.', ['do', 'did', 'done'], 2, 'Hiện tại hoàn thành dùng quá khứ phân từ done.'],
    ['We are looking forward to ___ you.', ['seeing', 'see', 'saw'], 0, 'To trong look forward to là giới từ, sau đó dùng -ing.'],
    ['You have never been there, ___ you?', ['do', 'have', 'are'], 1, 'Mệnh đề phủ định với have dùng câu hỏi đuôi khẳng định have you.'],
    ['Neither of the answers ___ correct.', ['are', 'be', 'is'], 2, 'Neither of dùng động từ số ít trong cấu trúc này.'],
    ['I wish I ___ speak French fluently.', ['could', 'can', 'will'], 0, 'Wish dùng could cho khả năng mong muốn ở hiện tại.'],
    ['By the time we arrived, the train ___ left.', ['has', 'had', 'was'], 1, 'Quá khứ hoàn thành diễn tả hành động xảy ra trước một hành động quá khứ.'],
  ];
  const pairs = [
    [['happy', 'pleased'], ['quick', 'fast'], ['large', 'big'], ['silent', 'quiet'], ['difficult', 'hard']],
    [['begin', 'start'], ['finish', 'complete'], ['purchase', 'buy'], ['assist', 'help'], ['select', 'choose']],
    [['house', 'home'], ['occupation', 'job'], ['journey', 'trip'], ['gift', 'present'], ['error', 'mistake']],
    [['beautiful', 'attractive'], ['angry', 'annoyed'], ['clever', 'intelligent'], ['tired', 'exhausted'], ['afraid', 'scared']],
    [['reply', 'answer'], ['repair', 'fix'], ['speak', 'talk'], ['require', 'need'], ['observe', 'watch']],
  ];
  return { mode: 'full', purpose: 'EXAM', details: details('Grammar & Vocabulary'), parts: {
    1: { instruction: 'Choose the correct word or phrase to complete each sentence.',
      questions: items.map(([text, options, correctAnswer, explanation], i) => ({ id: i + 1, text, options, correctAnswer, explanation })) },
    2: { sets: pairs.map((set, i) => ({ setId: i + 1, instruction: 'Match each word with its closest meaning.',
      targetWords: set.map(([word, meaning], j) => ({ id: 26 + i * 5 + j, word, correctAnswer: 'ABCDE'[j], explanation: `${word} có nghĩa gần với ${meaning} trong bài này.` })),
      options: [...set.map(pair => pair[1]), 'cold', 'empty', 'late', 'soft', 'young'].map((text, j) => ({ label: 'ABCDEFGHIJ'[j], text })),
    })) },
  } };
}

function readingSample(): ReadingTestAggregate {
  const sentences = [
    ['A visit to the library', ['Last Saturday I decided to visit the local library.', 'First, I checked the opening time on its website.', 'Then I walked there after breakfast.', 'When I arrived, a librarian showed me the travel section.', 'I chose a book about Japan and borrowed it.', 'Finally, I went home and started reading it.']],
    ['Making vegetable soup', ['Yesterday I made vegetable soup for my family.', 'First, I washed all the vegetables carefully.', 'Next, I cut them into small pieces.', 'After that, I put them in a pot with some water.', 'I cooked the soup for twenty minutes.', 'At the end, we ate it together with some bread.']],
  ];
  const posts = [
    'I cycle to work every day because it is cheaper than taking the bus. I also enjoy the exercise. However, I avoid cycling when it rains heavily.',
    'I take the train because I live far from my office. I can read during the journey, but delayed trains sometimes make me late.',
    'I work from home most days. It saves travel time and lets me spend more time with my children. I miss talking to colleagues face to face.',
    'I usually walk to my office, which is only ten minutes away. Walking helps me relax. At weekends, I drive to visit my parents in another town.',
  ];
  const statements: Array<[string, string]> = [
    ['This person avoids travelling by bike in bad weather.', 'A'], ['This person reads while travelling to work.', 'B'],
    ['This person wants more direct contact with colleagues.', 'C'], ['This person has a short walk to work.', 'D'],
    ['This person chooses transport partly to save money.', 'A'], ['This person is sometimes affected by transport delays.', 'B'],
    ['This person drives to see family at weekends.', 'D'],
  ];
  const sections = [
    ['A shared idea', 'The garden began when a group of neighbours decided to use an empty piece of land. They wanted a place where people could meet and grow food together.'],
    ['Preparing the land', 'Before planting anything, volunteers removed rubbish and dug the soil. A local shop donated tools, and the team built paths between the growing areas.'],
    ['Choosing suitable plants', 'The gardeners selected vegetables that grow well in the local climate. They started with beans and tomatoes because beginners could look after them easily.'],
    ['Sharing responsibilities', 'Members created a weekly timetable for watering and cleaning. Each person chose a task, so the work did not depend on just one volunteer.'],
    ['Learning together', 'Experienced gardeners organised short lessons for new members. Children learned where food comes from and how insects help flowers grow.'],
    ['Dealing with dry weather', 'During a hot summer, the garden used stored rainwater. Members covered the soil with leaves to reduce water loss and protect the roots.'],
    ['Plans for the future', 'The group now hopes to add more growing areas and a small seating space. They also plan to invite a nearby school to join the project.'],
  ];
  return { mode: 'full', purpose: 'EXAM', details: details('Reading'), parts: {
    1: { passageVersion: 1, passage: 'Hi Alex, I am [1] to invite you to our club meeting. It takes place [2] Saturday. Please [3] a notebook. We will talk about [4] new project. I hope you can [5] us.',
      questions: [['writing', 'write', 'written'], ['on', 'at', 'in'], ['bring', 'brings', 'bringing'], ['our', 'us', 'we'], ['join', 'joins', 'joined']].map((options, i) => ({
        id: `p1-q${i + 1}`, position: i + 1, options, answer: options[0], explanation: 'Chọn từ phù hợp với ngữ pháp và ý nghĩa của câu.' })) },
    2: { texts: sentences.map(([title, lines], i) => ({ id: `p2-text${i + 1}`, title,
      sentences: (lines as string[]).map((content, j) => ({ id: `p2-t${i + 1}-s${j + 1}`, content, correctPosition: j + 1,
        explanation: 'Các từ chỉ trình tự và mối liên kết nội dung xác định vị trí của câu.' })) })) },
    3: { speakers: ['A', 'B', 'C', 'D'], posts, passage: '', questions: statements.map(([statement, answer], i) => ({
      id: `p3-q${i + 1}`, statement, answer, explanation: `Thông tin này được nêu trong bài viết của người ${answer}.` })) },
    4: { title: 'Our community garden',
      paragraphs: sections.map(([, content], i) => ({ id: `para${i + 1}`, label: `Paragraph ${'ABCDEFG'[i]}`, content })),
      headings: sections.map(([text], i) => ({ id: `h${i + 1}`, text, correctParagraph: `para${i + 1}`, explanation: 'Tiêu đề khái quát ý chính của đoạn văn tương ứng.' })) },
  } };
}

function listeningSample(): ListeningTestAggregate {
  // Media supplied for UI demonstration; answer keys are fixtures, not verified transcripts.
  const mcq = (id: string, text: string, options: string[], correctAnswer = 0) => ({ id, text, options, correctAnswer,
    explanation: 'Đáp án mẫu dùng kiểm tra luồng làm bài; chưa đối chiếu với nội dung âm thanh.' });
  const shortQuestions: Array<[string, string[]]> = [
    ['What time will the friends meet?', ['At nine', 'At ten', 'At eleven']],
    ['Where is the speaker going?', ['The library', 'The bank', 'The supermarket']],
    ['What does the woman want to buy?', ['A jacket', 'A bag', 'A pair of shoes']],
    ['How will the man travel?', ['By train', 'By bus', 'By car']],
    ['Which day is the appointment?', ['Monday', 'Tuesday', 'Wednesday']],
    ['What is the weather forecast?', ['Sunny', 'Rainy', 'Windy']],
    ['How much does the ticket cost?', ['Ten pounds', 'Fifteen pounds', 'Twenty pounds']],
    ['What has the speaker lost?', ['A phone', 'A wallet', 'A key']],
    ['Which subject does the student prefer?', ['History', 'Science', 'Art']],
    ['Where will the family have lunch?', ['At home', 'In a cafe', 'In a park']],
    ['What does the caller ask for?', ['A new appointment', 'A refund', 'A receipt']],
    ['What should the visitor bring?', ['An identity card', 'A photograph', 'A notebook']],
    ['Why is the speaker late?', ['Heavy traffic', 'Bad weather', 'A missed alarm']],
  ];
  const matchingOptions = ['Enjoys working outdoors', 'Prefers working alone', 'Likes helping customers', 'Wants flexible working hours', 'Is learning a new skill'];
  return { mode: 'full', purpose: 'EXAM', details: details('Listening'), parts: {
    1: { questions: shortQuestions.map(([text, options], i) => ({ ...mcq(String(i + 1), text, options, i % 3), audioUrl: SAMPLE_LISTENING_AUDIO[i % 2] })) },
    2: { id: 14, instruction: 'Four people are talking about work. Match each speaker with one statement.',
      audioUrl: SAMPLE_LISTENING_AUDIO[0], speakers: ['Speaker A', 'Speaker B', 'Speaker C', 'Speaker D'],
      options: matchingOptions, answers: matchingOptions.slice(0, 4) },
    3: { id: 15, context: 'A man and a woman are discussing online learning.', subTitle: 'Who expresses each opinion?',
      audioUrl: SAMPLE_LISTENING_AUDIO[1], options: ['Man', 'Woman', 'Both'],
      statements: ['Online courses save travel time.', 'Classroom discussions are useful.', 'Technology can be difficult to use.', 'A regular study routine is important.'].map((text, i) => ({
        id: `15${'abcd'[i]}`, text, answer: ['Man', 'Woman', 'Both', 'Both'][i] })) },
    4: { recordings: [
      { id: 16, audioUrl: SAMPLE_LISTENING_AUDIO[0], context: 'Listen to a discussion about a community project.', subQuestions: [
        mcq('16a', 'What is the main aim of the project?', ['To bring neighbours together', 'To build a shop', 'To attract tourists']),
        mcq('16b', 'What challenge does the organiser mention?', ['Limited funding', 'Too many volunteers', 'Lack of interest'], 0),
      ] },
      { id: 17, audioUrl: SAMPLE_LISTENING_AUDIO[1], context: 'Listen to a talk about working from home.', subQuestions: [
        mcq('17a', 'What benefit does the speaker describe?', ['Less travel time', 'Longer meetings', 'More paperwork']),
        mcq('17b', 'What advice does the speaker give?', ['Set clear working hours', 'Avoid all breaks', 'Work late every day']),
      ] },
    ] },
  } };
}

function writingSample(): WritingTestAggregate {
  return { mode: 'full', purpose: 'EXAM', details: details('Writing'), parts: {
    1: { context: 'You are joining a community activity club. Answer each question in 1–5 words.',
      questions: ['What is your full name?', 'Where do you live?', 'What do you do?', 'What is your favourite activity?', 'When are you free?'],
      sampleAnswers: ['Alex Nguyen', 'In Hanoi', 'I am a student', 'Playing badminton', 'On Saturday afternoons'] },
    2: { instruction: 'Write 20–30 words in complete sentences.', prompt: 'Why would you like to join the community activity club?',
      sampleAnswer: 'I would like to join because I enjoy meeting new people. I also want to try different activities and become more confident in my community.' },
    3: { context: 'You are chatting with other members on the club website. Respond to each message in 30–40 words.',
      messages: ['Tell us about an activity you enjoyed recently.', 'Do you prefer doing activities alone or with other people? Why?', 'What new activity should our club organise?'],
      sampleAnswers: [
        'Last weekend I played badminton with two friends at a local sports centre. We had a great time, and I felt much more energetic afterwards. I would love to do it again soon.',
        'I prefer doing activities with other people because we can encourage each other and share ideas. It is also a good way to make friends. However, I sometimes enjoy walking alone to relax.',
        'I think the club should organise a weekend picnic in the park. Members could bring food and play simple outdoor games. It would be affordable and suitable for people of different ages and interests.',
      ] },
    4: { context: 'The club planned an outdoor event this Saturday. The organiser has cancelled it because of the weather and has not offered another date.',
      informalPrompt: 'Write an email to your friend. Explain how you feel and what you think the club should do. Write about 50 words.',
      informalSample: 'Hi Sam, I am disappointed that our club event has been cancelled. I was really looking forward to seeing everyone. I think the organiser should book an indoor venue or suggest another weekend. Would you like to meet for coffee on Saturday instead? Let me know! Best, Alex',
      formalPrompt: 'Write an email to the club organiser. Explain your concerns and suggest alternative arrangements. Write 120–150 words.',
      formalSample: 'Dear Club Organiser,\n\nI am writing about the cancellation of the outdoor event scheduled for this Saturday. I understand that poor weather could make the event unsafe. However, I am disappointed that no alternative arrangements have been announced. Several members, including me, changed their plans in order to attend.\n\nCould you consider holding the event at the community centre instead? This would allow members to meet regardless of the weather. If an indoor venue is unavailable, I suggest choosing a new date and asking members which weekend would suit them best. It would also be helpful to explain whether any booking fees can be refunded.\n\nThank you for your work organising club activities. I would appreciate an update as soon as possible.\n\nYours sincerely,\nAlex Nguyen',
    },
  } };
}

function speakingSample(): SpeakingTestAggregate {
  const questions = (part: number, prompts: string[], samples: string[]) => prompts.map((text, i) => ({ id: `p${part}-${i + 1}`, text,
    sampleAnswer: samples[i], explanation: 'Trả lời trực tiếp, bổ sung lý do và ví dụ phù hợp với trải nghiệm hoặc hình ảnh.' }));
  return { mode: 'full', purpose: 'EXAM', details: details('Speaking'), parts: {
    1: { questions: questions(1, ['Tell me about your hometown.', 'What do you like doing in your free time?', 'Tell me about a person you admire.'], [
      'I live in Hanoi. It is a busy city with many interesting places to visit. I especially like the small cafes near my home.',
      'I enjoy playing badminton with friends. It helps me stay healthy, and we usually play together at weekends.',
      'I admire my mother because she is patient and hardworking. She always encourages me to keep learning.',
    ]) },
    2: { imageUrl: SAMPLE_SPEAKING_IMAGES[0], questions: questions(2, ['Describe this picture.', 'Tell me about a time you visited a similar place.', 'Why do people enjoy visiting new places?'], [
      'I would begin by describing the people, objects and setting that I can see, then explain what appears to be happening.',
      'Last year I visited a new place with my family. We explored the area and took photographs. I enjoyed spending time together.',
      'People enjoy visiting new places because they can learn about different lifestyles and take a break from their normal routine.',
    ]) },
    3: { imageUrls: [SAMPLE_SPEAKING_IMAGES[1], SAMPLE_SPEAKING_IMAGES[2]], questions: questions(3, [
      'Compare the two pictures.', 'Which setting would you prefer to spend time in? Why?', 'How can our surroundings affect our mood?',
    ], [
      'I would compare the settings, activities and atmosphere in the two pictures, mentioning both similarities and differences.',
      'I would choose the setting that feels more relaxing to me. I enjoy places where I can take my time and talk with friends.',
      'Our surroundings can affect how comfortable we feel. Quiet places often help people relax, while busy places may feel exciting or stressful.',
    ]) },
    4: { topic: 'Making an important decision', imageUrl: SAMPLE_SPEAKING_IMAGES[3], questions: questions(4, [
      'Tell me about an important decision you made.', 'How did you feel while making that decision?', 'Why do people sometimes ask others for advice?',
    ], ['', '', '']), sampleAnswer: 'An important decision I made was choosing what to study at university. I considered my interests and spoke to my family and teachers. At first I felt nervous because the choice would affect my future. Their advice helped me compare the options, but I made the final decision myself. I think people ask for advice because others may have useful experience and notice things they have missed.',
      explanation: 'Dùng thời gian chuẩn bị để ghi ý chính; trình bày trải nghiệm, cảm xúc và nhận xét chung, trả lời đủ ba câu hỏi.' },
  } };
}

type SeedActor = { id: string; role: 'ADMIN' };
type SampleAggregate = GrammarTestAggregate | ReadingTestAggregate | ListeningTestAggregate | WritingTestAggregate | SpeakingTestAggregate;
type Content<T> = { normalize(input: T): T; assertDraftShape(input: T): void; assertPublishable(input: T): void };
type SampleRepository<T> = {
  create(actor: SeedActor, test: T, audit: { requestId: string }, requestId: string): Promise<T>;
  publish(id: string, actor: SeedActor, version: number, test: T, audit: { requestId: string }): Promise<{ outcome: string }>;
};
export type SampleTestDefinition = {
  component: string;
  requestId: string;
  test: SampleAggregate;
  persist(connection: DataSource, actor: SeedActor): Promise<void>;
};

function skillDefinitions<T extends SampleAggregate>(component: string, name: string, full: T, partCount: number,
  content: Content<T>, Repository: new (connection: DataSource) => SampleRepository<T>): SampleTestDefinition[] {
  const variants: Array<{ purpose: TestPurpose; mode: T['mode'] }> = [
    { purpose: 'EXAM', mode: 'full' }, { purpose: 'PRACTICE', mode: 'full' },
    ...Array.from({ length: partCount }, (_, i) => ({ purpose: 'PRACTICE' as const, mode: `part${i + 1}` as T['mode'] })),
  ];
  return variants.map(({ purpose, mode }) => {
    const partNumber = mode === 'full' ? null : Number(mode.slice(4));
    const selected = partNumber === null ? structuredClone(full.parts)
      : { [partNumber]: structuredClone((full.parts as Record<number, unknown>)[partNumber]) };
    const test = content.normalize({ ...full, purpose, mode, parts: selected,
      details: details(`[Mẫu] ${name} · ${purpose === 'EXAM' ? 'Tests' : 'Practice'} · ${mode === 'full' ? 'Full Test' : `Part ${partNumber}`}`) });
    content.assertDraftShape(test);
    content.assertPublishable(test);
    const requestId = `aptimate-sample-tests-v1:${component}:${purpose}:${mode}`;
    return { component, requestId, test, async persist(connection: DataSource, actor: SeedActor) {
      const repository = new Repository(connection);
      const audit = { requestId: testCreationId(actor.id, 'SAMPLE_AUDIT', requestId) };
      const saved = await repository.create(actor, test, audit, requestId);
      if (!saved.id || !saved.version) throw new Error(`Missing saved identity for ${requestId}`);
      const published = await repository.publish(saved.id, actor, saved.version, saved, audit);
      if (published.outcome !== 'SUCCESS') throw new Error(`Could not publish ${requestId}: ${published.outcome}`);
    } };
  });
}

export function buildSampleTests(): SampleTestDefinition[] {
  return [
    ...skillDefinitions<GrammarTestAggregate>('GRAMMAR_VOCAB', 'Grammar & Vocabulary', grammarSample(), 2, new GrammarTestContentService(), GrammarTestsRepository),
    ...skillDefinitions<ReadingTestAggregate>('READING', 'Reading', readingSample(), 4, new ReadingTestContentService(), ReadingTestsRepository),
    ...skillDefinitions<ListeningTestAggregate>('LISTENING', 'Listening', listeningSample(), 4, new ListeningTestContentService(), ListeningTestsRepository),
    ...skillDefinitions<WritingTestAggregate>('WRITING', 'Writing', writingSample(), 4, new WritingTestContentService(), WritingTestsRepository),
    ...skillDefinitions<SpeakingTestAggregate>('SPEAKING', 'Speaking', speakingSample(), 4, new SpeakingTestContentService(), SpeakingTestsRepository),
  ];
}

export async function seedSampleTests(manager: EntityManager, adminId?: string) {
  const samples = buildSampleTests(); // Validate every fixture before any insertion.
  await manager.query("SELECT pg_advisory_xact_lock(hashtext('aptimate-sample-tests-v1'))");
  const admins = await manager.query<Array<{ id: string }>>(
    `SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id
     WHERE r.code='ADMIN' AND u.status='ACTIVE' AND u.deleted_at IS NULL
       AND ($1::uuid IS NULL OR u.id=$1::uuid) ORDER BY u.created_at,u.id`, [adminId ?? null]);
  if (admins.length !== 1) throw new Error('Cần một tài khoản ADMIN đang hoạt động. Chạy db:seed trước, hoặc chọn bằng SAMPLE_SEED_ADMIN_ID.');
  const actor: SeedActor = { id: admins[0].id, role: 'ADMIN' };
  // These repositories only use query/transaction. Route both through the outer
  // transaction so tests, questions, snapshots and audit logs commit atomically.
  const connection = {
    query: manager.query.bind(manager),
    transaction: async (work: (transactionManager: EntityManager) => Promise<unknown>) => work(manager),
  } as unknown as DataSource;
  let created = 0;
  let skipped = 0;
  for (const sample of samples) {
    const id = testCreationId(actor.id, sample.component, sample.requestId);
    const existing = await manager.query<Array<{ id: string }>>('SELECT id FROM tests WHERE id=$1', [id]);
    if (existing.length) { skipped += 1; continue; } // Preserve even edited/archived samples.
    await sample.persist(connection, actor);
    created += 1;
  }
  return { created, skipped, total: samples.length };
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    const samples = buildSampleTests();
    console.table(samples.map(({ component, test }) => ({ component, purpose: test.purpose, mode: test.mode, title: test.details.title })));
    console.info(`Đã kiểm tra ${samples.length} đề mẫu. Chưa kết nối hoặc ghi vào database.`);
    return;
  }
  const { default: dataSource } = await import('../data-source');
  await dataSource.initialize();
  try {
    const result = await dataSource.transaction(manager => seedSampleTests(manager, process.env.SAMPLE_SEED_ADMIN_ID));
    console.info(`Đã tạo ${result.created} đề mẫu đã xuất bản; bỏ qua ${result.skipped} đề đã tồn tại (tổng ${result.total}).`);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Sample test seed failed.');
    process.exitCode = 1;
  });
}
