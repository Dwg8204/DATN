import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { DataSource } from 'typeorm';
import { testCreationId } from '../src/common/tests/test-creation';
import { ReadingTestsRepository } from '../src/features/reading-tests/repositories/reading-tests.repository';
import { ReadingTestContentService } from '../src/features/reading-tests/services/reading-test-content.service';
import { ReadingActor, ReadingTestAggregate } from '../src/features/reading-tests/types/reading-test.type';
import { AssessmentPaperFactory } from '../src/features/test-attempts/assessments/assessment-paper.factory';
import { ObjectiveGraderService } from '../src/features/test-attempts/assessments/objective-grader.service';
import { Answers } from '../src/features/test-attempts/types/attempt.type';

type Sentence = [content: string, explanation: string];

function cohesionText(id: string, title: string, opening: string, ordered: Sentence[]) {
  assert.equal(ordered.length, 5);
  const labels = ['C', 'A', 'E', 'B', 'D'];
  const choices = ordered.map(([content, explanation], index) => ({
    id: `${id}-${labels[index]}`, content: `(${labels[index]}) ${content}`, correctPosition: index + 2, explanation,
  }));
  // Keep the given opening first for question persistence; display labels are
  // deliberately different from the correct order. The UI also shuffles choices.
  return { id, title, sentences: [
    { id: `${id}-opening`, content: opening, correctPosition: 1, explanation: 'Câu mở đầu được cho sẵn, không tính điểm.' },
    ...[1, 3, 0, 4, 2].map(index => choices[index]),
  ] };
}

export function buildReadingPractice20261014(): ReadingTestAggregate[] {
  const partTwo = { texts: [
    cohesionText('bakery', 'A first day at a bakery', 'Last Monday, Mia started her first job at a small bakery near her home.', [
      ['When she arrived at six in the morning, the owner gave her an apron and showed her around.', 'Câu này nối với ngày đầu đi làm ở câu mở đầu và nêu việc xảy ra ngay khi Mia đến tiệm.'],
      ['After the tour, he taught her how to place the fresh bread on the shelves.', 'After the tour liên kết trực tiếp với việc người chủ vừa dẫn Mia đi xem tiệm ở câu trước.'],
      ['Once the shelves were ready, they opened the doors and welcomed the first customers.', 'Once the shelves were ready cho biết việc xếp bánh đã hoàn tất trước khi tiệm mở cửa.'],
      ['During the busy morning, Mia served the customers while the owner baked more bread.', 'The customers nhắc lại những khách đầu tiên; buổi sáng bận rộn diễn ra sau khi tiệm mở cửa.'],
      ['At the end of her shift, the owner thanked her and invited her to return the next day.', 'At the end of her shift đánh dấu kết thúc ca làm, nên đây là câu cuối cùng.'],
    ]),
    cohesionText('wallet', 'Returning a lost wallet', 'On her way home from college, Linh noticed a wallet lying beside a bus stop.', [
      ['She picked it up and found a student card with a name and a college address inside.', 'It thay cho chiếc ví vừa được nhắc; Linh cần nhặt và kiểm tra ví trước khi tìm chủ nhân.'],
      ['Using the address on the card, she took the wallet to the college reception.', 'The address on the card liên kết với thẻ sinh viên ở câu trước và giải thích vì sao Linh đến trường.'],
      ['The receptionist checked the student records and called the number listed for the owner.', 'The receptionist chỉ xuất hiện sau khi Linh đến quầy tiếp tân; cuộc gọi giúp liên lạc với người mất ví.'],
      ['Twenty minutes after the call, the owner arrived and checked that nothing was missing.', 'After the call bắt buộc đứng sau câu có cuộc gọi; chủ ví đến để kiểm tra đồ bên trong.'],
      ['Relieved to have everything back, he thanked Linh and offered to buy her a drink.', 'Have everything back và Relieved chỉ hợp lý sau khi chủ ví nhận lại ví và kiểm tra không mất đồ.'],
    ]),
  ] };

  const fullPartTwo = { texts: [
    cohesionText('picnic', 'Organising a neighbourhood picnic', 'In April, Tom and his neighbours decided to organise a picnic for everyone in their street.', [
      ['Before making any bookings, they asked the neighbours which Saturday they could attend.', 'Before making any bookings cho thấy việc hỏi ngày phù hợp là bước chuẩn bị đầu tiên sau quyết định tổ chức.'],
      ['After choosing the most popular date, Tom reserved a picnic area in the local park.', 'Choosing the most popular date là kết quả của việc hỏi hàng xóm; đặt chỗ chỉ diễn ra sau khi đã chọn ngày.'],
      ['With the booking confirmed, the group divided the jobs and asked each family to bring some food.', 'The booking confirmed liên kết với việc Tom đặt khu dã ngoại; sau đó nhóm mới phân chia công việc.'],
      ['On the chosen Saturday, they arrived early to set up tables before the other families came.', 'On the chosen Saturday chuyển từ giai đoạn chuẩn bị sang ngày tổ chức; dựng bàn phải trước lúc đón các gia đình.'],
      ['By the afternoon, everyone had eaten together and agreed to hold another picnic the following year.', 'By the afternoon và had eaten cho biết hoạt động đã diễn ra; kế hoạch cho năm sau là phần kết.'],
    ]),
    cohesionText('swimming', 'Learning to swim', 'Last summer, Daniel joined a beginners swimming course because he had never felt confident in water.', [
      ['At the first lesson, the instructor helped him practise breathing while standing in the shallow end.', 'At the first lesson giới thiệu buổi học đầu tiên; shallow end phù hợp với người chưa tự tin dưới nước.'],
      ['When he could breathe calmly, she showed him how to float with the support of a small board.', 'When he could breathe calmly nối với bài tập thở; bước tiếp theo là tập nổi với dụng cụ hỗ trợ.'],
      ['After learning to float, he practised moving his arms and legs together.', 'After learning to float xác định câu này phải đứng sau bài tập nổi, trước khi bơi độc lập.'],
      ['By the fourth lesson, these movements felt natural and he swam a short distance without the board.', 'These movements nhắc lại cử động tay chân ở câu trước; by the fourth lesson cho thấy Daniel đã tiến bộ.'],
      ['At the end of the course, he completed a whole length of the pool and signed up for the next level.', 'At the end of the course đánh dấu kết thúc; bơi hết chiều dài bể và đăng ký cấp tiếp theo là kết quả cuối cùng.'],
    ]),
  ] };

  const speakers = ['Anna', 'Ben', 'Chloe', 'David'];
  const posts = [
    'I am studying Spanish because I would like to travel around South America. Every morning, I listen to a short podcast while walking to work. I repeat useful phrases quietly and write them down later. I use free recordings and library books because I cannot afford a course at the moment. Listening outside makes studying feel like part of my normal day.',
    'I attend a French class every Tuesday evening. I learn best when I can practise conversations with my classmates, rather than study alone. Our teacher listens to us and explains errors immediately. If I do not understand a grammar rule, I ask her to give another example before I leave. The class costs money, but the support is worth it.',
    'I work as a nurse, and my shifts change every week. A fixed weekly class would be difficult, so I use a language app in short sessions whenever I have a break. My main aim is to communicate more clearly with patients who speak English. I focus on expressions for asking about pain, giving instructions and explaining simple treatments.',
    'My granddaughter is helping me learn Italian. We sit together at home on Sunday afternoons and practise phrases from a book. She is patient and often turns the exercises into games. I do not enjoy using apps, and I am not preparing for an exam. I simply want to speak a little Italian when I visit her family in Italy next year.',
  ];
  const opinions: Array<[string, string, string]> = [
    ['Who combines listening practice with the journey to work?', 'Anna', 'Anna nghe podcast mỗi sáng trong lúc đi bộ tới chỗ làm; journey to work diễn đạt lại walking to work.'],
    ['Who prefers practising conversations with other learners?', 'Ben', 'Ben nói rằng mình học tốt nhất khi trò chuyện với các bạn cùng lớp, thay vì học một mình.'],
    ['Who needs a study schedule that fits changing working hours?', 'Chloe', 'Ca làm của Chloe thay đổi mỗi tuần; cô dùng ứng dụng trong thời gian nghỉ thay vì theo lớp có giờ cố định.'],
    ['Who learns with the help of a younger family member?', 'David', 'David học cùng cháu gái; granddaughter là người thân thuộc thế hệ trẻ hơn.'],
    ['Who chooses materials that do not cost money?', 'Anna', 'Anna dùng bản ghi miễn phí và sách thư viện vì chưa đủ tiền theo học một khóa học.'],
    ['Who asks a teacher for extra explanations of grammar?', 'Ben', 'Ben yêu cầu giáo viên đưa thêm ví dụ khi chưa hiểu một quy tắc ngữ pháp.'],
    ['Who is learning mainly to communicate better at work?', 'Chloe', 'Mục tiêu chính của Chloe là giao tiếp rõ ràng hơn với bệnh nhân trong công việc điều dưỡng.'],
  ];

  const sections: Array<[string, string, string]> = [
    ['An idea to reduce waste', 'The repair cafe began when residents noticed that many neighbours were throwing away items with small faults. A broken zip or a loose cable often meant a useful object ended up in the bin. Instead of accepting this waste, a few residents suggested a monthly meeting where people could repair things together.', 'Đoạn A giải thích lý do hình thành quán sửa đồ: giảm lượng đồ còn dùng được bị vứt đi vì lỗi nhỏ.'],
    ['Finding a suitable home', 'The group first needed somewhere to meet. Buying a building was too expensive, so they contacted the community centre. Its manager offered a room that was empty on Sunday mornings. The room had enough tables, good lighting and easy access for visitors, making it a practical home for the project.', 'Đoạn B tập trung vào việc tìm địa điểm; phòng tại trung tâm cộng đồng giải quyết vấn đề không đủ tiền mua tòa nhà.'],
    ['Bringing skilled volunteers together', 'Next, the organisers looked for people who could share useful skills. A retired electrician agreed to check small appliances, while a local tailor offered to mend clothes. Two bicycle enthusiasts joined as well. Everyone volunteered their time, and the organisers matched each visitor with someone who understood the problem.', 'Đoạn C nói về tuyển và phối hợp tình nguyện viên có kỹ năng điện, may vá và sửa xe đạp.'],
    ['Safety before repairs', 'Before the first event, the team established clear safety rules. Visitors had to explain the fault before an item was examined, and volunteers refused repairs beyond their training. Electrical equipment was checked carefully, with unsafe items kept away from the public. Protecting people was more important than repairing every object.', 'Đoạn D có ý chính là an toàn: kiểm tra lỗi, từ chối việc ngoài chuyên môn và cách ly thiết bị nguy hiểm.'],
    ['Teaching visitors to help themselves', 'The volunteers did not simply take objects away and return them repaired. They invited owners to watch, ask questions and try simple tasks themselves. Someone with a torn bag could learn a basic stitch, for example. The aim was to build confidence so that visitors could handle similar problems at home in the future.', 'Đoạn E nhấn mạnh việc hướng dẫn chủ đồ tự sửa: quan sát, hỏi và thực hành để xử lý lỗi tương tự sau này.'],
    ['A place to make new connections', 'As the cafe became busier, people began staying even after their repairs were finished. They shared tea, exchanged stories and offered each other advice. Some visitors came without a broken object simply to meet neighbours. What started as a practical service also became a welcoming social space for people who had previously felt isolated.', 'Đoạn F mô tả lợi ích xã hội: uống trà, trò chuyện, kết nối hàng xóm và giảm cảm giác cô lập.'],
    ['Planning a wider service', 'The organisers now hope to visit nearby villages whose residents cannot travel to the centre. They are considering a small mobile workshop and searching for transport funding. They also want to involve local schools. These plans would allow more people to learn repair skills while keeping the original community spirit of the cafe.', 'Đoạn G trình bày kế hoạch mở rộng: xưởng sửa lưu động, nguồn tài trợ đi lại và hợp tác với trường học.'],
  ];

  const partOneQuestions = [
    { options: ['excite', 'excited', 'exciting'], answer: 'excited', explanation: 'I am excited diễn tả cảm xúc của người nói; exciting mô tả thứ gây hào hứng, còn excite là động từ.' },
    { options: ['after', 'at', 'forward'], answer: 'forward', explanation: 'Cụm cố định look forward to + V-ing nghĩa là mong chờ; ở đây là looking forward to spending time.' },
    { options: ['on', 'in', 'at'], answer: 'on', explanation: 'Dùng giới từ on trước một ngày trong tuần: on Saturday.' },
    { options: ['bringing', 'bring', 'brings'], answer: 'bring', explanation: 'Sau please trong lời yêu cầu dùng động từ nguyên mẫu không to: Please bring.' },
    { options: ['we', 'our', 'us'], answer: 'us', explanation: 'Join cần tân ngữ; us là đại từ tân ngữ, còn we là chủ ngữ và our là tính từ sở hữu.' },
  ];
  const full: ReadingTestAggregate = {
    mode: 'full', purpose: 'PRACTICE', details: { title: 'Reading Practice Full Test - Community Life (14-10-2026)' },
    parts: {
      1: { passageVersion: 1, passage: 'Hi Sam, I am [1] about our cycling trip next weekend. I am looking [2] to spending time outdoors with you. We will meet at the station [3] Saturday at nine. Please [4] a bottle of water and a light jacket. I hope your sister can join [5] too. See you soon! Alex',
        questions: partOneQuestions.map((question, index) => ({ ...question, id: `p1-q${index + 1}`, position: index + 1 })) },
      2: fullPartTwo,
      3: { speakers, posts, passage: '', questions: opinions.map(([statement, answer, explanation], index) => ({ id: `p3-q${index + 1}`, statement, answer, explanation })) },
      4: { title: 'How a repair cafe became a local success',
        paragraphs: sections.map(([, content], index) => ({ id: `para${index + 1}`, label: `Paragraph ${'ABCDEFG'[index]}`, content })),
        headings: [4, 1, 6, 0, 5, 2, 3].map(index => ({ id: `h${index + 1}`, text: sections[index][0], correctParagraph: `para${index + 1}`, explanation: sections[index][2] })),
      },
    },
  };
  return [
    { mode: 'part2', purpose: 'PRACTICE', details: { title: 'Reading Practice Part 2 - Everyday Stories (14-10-2026)' }, parts: { 2: partTwo } },
    full,
  ];
}

const content = new ReadingTestContentService();
const factory = new AssessmentPaperFactory();
const grader = new ObjectiveGraderService();

function validate(test: ReadingTestAggregate) {
  content.assertDraftShape(test);
  content.assertPublishable(test);
  const paper = factory.build('READING', test as unknown as Record<string, unknown>);
  const expected = test.mode === 'full' ? 29 : 10;
  assert.equal(paper.items.length, expected);
  assert.equal(paper.items.filter(item => item.partNumber === 2).length, 10);
  assert.ok(paper.items.every(item => item.explanation?.trim()));
  const answers: Answers = Object.fromEntries(paper.items.map(item => [item.key, { kind: item.kind as 'CHOICE' | 'MATCH', optionId: item.correctOptionId! }]));
  assert.equal(grader.grade(paper.items, answers, 'READING').score, expected);
  assert.equal(grader.grade(paper.items, {}, 'READING').counts.skipped, expected);
  const first = paper.items[0];
  const wrong = { ...answers, [first.key]: { kind: first.kind as 'CHOICE' | 'MATCH', optionId: first.optionIds!.find(id => id !== first.correctOptionId)! } };
  assert.equal(grader.grade(paper.items, wrong, 'READING').score, expected - 1);
  return { title: test.details.title, purpose: test.purpose, mode: test.mode, questions: expected };
}

async function main() {
  const tests = buildReadingPractice20261014().map(test => content.normalize(test));
  const checked = tests.map(validate);
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({ validated: checked, databaseWritten: false }, null, 2));
    return;
  }
  const { default: dataSource } = await import('../src/database/data-source');
  await dataSource.initialize();
  try {
    const results = await dataSource.transaction(async manager => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('reading-practice-20261014'))");
      const admins = await manager.query<Array<{ id: string }>>(
        `SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='ADMIN'
         AND u.status='ACTIVE' AND u.deleted_at IS NULL
         AND ($1::uuid IS NULL OR u.id=$1::uuid)
         AND ($2::text IS NULL OR lower(u.email)=lower($2))`,
        [process.env.SAMPLE_SEED_ADMIN_ID ?? null, process.env.SAMPLE_SEED_ADMIN_ID ? null : process.env.ADMIN_SEED_EMAIL ?? null],
      );
      assert.equal(admins.length, 1, 'Choose one existing active administrator using SAMPLE_SEED_ADMIN_ID.');
      const actor: ReadingActor = { id: admins[0].id, role: 'ADMIN' };
      const connection = { query: manager.query.bind(manager), transaction: async (work: (value: typeof manager) => Promise<unknown>) => work(manager) } as unknown as DataSource;
      const repository = new ReadingTestsRepository(connection);
      const savedResults = [];
      for (const test of tests) {
        const requestId = `reading-practice-20261014:${test.mode}:v1`;
        const id = testCreationId(actor.id, 'READING', requestId);
        const existing = await repository.findAggregate(id);
        if (existing) {
          savedResults.push({ id, title: existing.details.title, status: existing.status, skipped: true });
          continue; // Never overwrite a previously edited or archived test.
        }
        const audit = { requestId: testCreationId(actor.id, 'READING_AUDIT', requestId) };
        const saved = await repository.create(actor, test, audit, requestId);
        assert.equal(saved.id, id);
        const published = await repository.publish(id, actor, saved.version!, saved, audit);
        assert.equal(published.outcome, 'SUCCESS');
        const snapshot = await repository.findPublishedAggregate(id);
        assert.ok(snapshot);
        const verification = validate(snapshot);
        const [persisted] = await manager.query<Array<{ question_count: string; status: string; purpose: string }>>(
          `SELECT t.status,t.purpose,(SELECT count(*)::text FROM questions q WHERE q.test_id=t.id AND q.deleted_at IS NULL) AS question_count
           FROM tests t WHERE t.id=$1`, [id]);
        assert.equal(persisted.status, 'PUBLISHED');
        assert.equal(persisted.purpose, 'PRACTICE');
        assert.equal(Number(persisted.question_count), verification.questions);
        savedResults.push({ id, ...verification, status: persisted.status, created: true });
      }
      return savedResults;
    });
    console.log(JSON.stringify({ tests: results, committed: true }, null, 2));
  } finally { await dataSource.destroy(); }
}

if (require.main === module) main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Reading practice creation failed.');
  process.exitCode = 1;
});
