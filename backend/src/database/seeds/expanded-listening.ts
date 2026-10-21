import { createHash } from 'node:crypto';
import { ListeningTestAggregate } from '../../features/listening-tests/types/listening-test.type';
import { SAMPLE_COVER } from './seed-sample-tests';
import { rotate, themes } from './expanded-content';

export type AudioScript = { key: string; turns: Array<{ voice: 'David' | 'Zira'; text: string }>; sha256: string };
export type AudioManifest = Record<string, { url: string; sha256: string; duration: number }>;
export const audioScripts: AudioScript[] = [];
export function scriptHash(turns: AudioScript['turns']) {
  return createHash('sha256').update(JSON.stringify({ engine: 'System.Speech-v1', rate: -1, turns })).digest('hex');
}
const shortItems: Array<{ question: string; values: string[]; speech: (answer: string, other: string) => string }> = [
  { question: 'When will the meeting start?', values: ['nine thirty', 'ten fifteen', 'eleven forty-five', 'two thirty', 'four fifteen'], speech: (a, b) => `Hello everyone. The time printed on your invitation was ${b}, but we have changed it. The meeting will now begin at ${a}. Please arrive ten minutes early so we can start promptly.` },
  { question: 'Where should visitors collect their passes?', values: ['the reception desk', 'the library entrance', 'the ticket office', 'the main gate', 'the information centre'], speech: (a, b) => `If you have booked a visitor pass, please collect it from ${a}. Some people have been waiting at ${b}, but passes are not available there. Bring your booking confirmation with you.` },
  { question: 'What does the speaker need to buy?', values: ['a notebook', 'a raincoat', 'a water bottle', 'a travel bag', 'a phone charger'], speech: (a, b) => `I am nearly ready for the trip. I found ${b} in my cupboard, so I do not need another one. The only thing still missing is ${a}. I will get one this afternoon.` },
  { question: 'How will the speaker travel tomorrow?', values: ['by train', 'by bus', 'by bicycle', 'by taxi', 'on foot'], speech: (a, b) => `I normally travel ${b}, but that will not work tomorrow because of the road restrictions. I have checked the alternatives and decided to go ${a}. I will leave home a little earlier than usual.` },
  { question: 'On which day is the appointment now?', values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], speech: (a, b) => `This is a message from the clinic. Your appointment was originally on ${b}. Unfortunately the doctor is unavailable then, so we have moved it to ${a} at the same time. Please call if that is inconvenient.` },
  { question: 'What weather is expected in the afternoon?', values: ['heavy rain', 'strong winds', 'clear skies', 'light snow', 'thick fog'], speech: (a, b) => `Here is the local forecast. Yesterday we warned about ${b}, but conditions are changing. We expect ${a} throughout the afternoon. Please check for further updates before making travel plans.` },
  { question: 'How much is the ticket after the discount?', values: ['eight pounds', 'twelve pounds', 'sixteen pounds', 'twenty pounds', 'twenty-four pounds'], speech: (a, b) => `You may have seen a price of ${b} on the old leaflet. That offer has finished. With your membership discount, the ticket now costs ${a}. The price includes entry to all the activities.` },
  { question: 'What did the caller leave behind?', values: ['a blue umbrella', 'a black wallet', 'a red scarf', 'a green folder', 'a silver watch'], speech: (a, b) => `Hello, I was in your cafe earlier today. I think I left ${a} on the chair beside the window. I still have ${b} with me, so that is not missing. Could you check the chair, please?` },
  { question: 'Which subject does the student want to study next term?', values: ['history', 'biology', 'geography', 'economics', 'literature'], speech: (a, b) => `I enjoyed studying ${b} this year, but I would like a change. Next term I want to take ${a}, because the course looks interesting and the project work sounds useful. I have already spoken to the tutor.` },
  { question: 'Where will the group have lunch?', values: ['in the park', 'at the museum cafe', 'at the college restaurant', 'in the town square', 'at the riverside hotel'], speech: (a, b) => `We had planned to eat ${b}, but there is a private event there today. Instead, we will have lunch ${a}. I have checked that there is enough space for the whole group.` },
  { question: 'What does the customer ask for?', values: ['a refund', 'a replacement', 'a receipt', 'a repair', 'a delivery update'], speech: (a, b) => `Thank you for your reply. I am not asking for ${b} at this stage. What I need is ${a}. Please tell me how to arrange that and whether you need my order number again.` },
  { question: 'What must participants bring?', values: ['a photo identity card', 'a printed booking form', 'a pair of gloves', 'a small towel', 'a packed lunch'], speech: (a, b) => `Before you come to the workshop, please remember to bring ${a}. It is essential for every participant. You will not need ${b}, as the centre will provide that. We look forward to seeing you.` },
  { question: 'Why is the speaker running late?', values: ['a broken lift', 'a delayed bus', 'a flat bicycle tyre', 'a closed road', 'a missing house key'], speech: (a, b) => `Sorry, I am running about fifteen minutes late. Last week I was delayed by ${b}, but today the problem is ${a}. I have sorted it out now and I am on my way. Please start without me if necessary.` },
];

export function listeningForm(index: number, manifest?: AudioManifest): ListeningTestAggregate {
  const t = themes[index];
  const audio = (suffix: string, turns: AudioScript['turns']) => {
    const key = `form-${index + 1}-${suffix}`;
    const sha256 = scriptHash(turns);
    if (!audioScripts.some(script => script.key === key)) audioScripts.push({ key, turns, sha256 });
    if (!manifest) return `https://example.invalid/${key}.mp3`;
    const asset = manifest[key];
    if (!asset || asset.sha256 !== sha256 || !asset.url.startsWith('https://res.cloudinary.com/') || asset.duration < 2) {
      throw new Error(`Missing or stale audio: ${key}. Run seed:expanded:audio first.`);
    }
    return asset.url;
  };
  const statements = [
    'Likes learning with other people', 'Prefers studying at home', 'Needs evening activities', 'Enjoys teaching beginners', 'Wants to enter a competition',
  ];
  const people = [
    `I am a member of the ${t.club} because I learn best in a group. Other members notice things that I miss, and discussing our ideas helps me understand them. Winning prizes does not interest me.`,
    `I enjoy ${t.activity}, but I rarely attend meetings. I have set up a quiet space in my flat, and I follow the online lessons there. For me, learning at home is more comfortable than going out.`,
    `I would like to attend the ${t.club} more often, but I work until six every weekday. Morning and afternoon sessions are impossible for me. I need activities that begin after dinner.`,
    `I have spent many years ${t.activity}, and now I enjoy helping people who are just starting. Explaining the basics and watching their confidence grow is the most rewarding part of being in the club.`,
  ];
  const order = rotate([0, 1, 2, 3], index);
  const p3Turns: AudioScript['turns'] = [
    { voice: 'David', text: `What do you think of our new ${t.club}? I think the membership fee is reasonable. Compared with other clubs, it is good value.` },
    { voice: 'Zira', text: `I disagree about the fee. It seems expensive to me. However, the people are welcoming, and I felt comfortable from my first visit.` },
    { voice: 'David', text: `Yes, I also found the people very welcoming. The one thing I would change is the timetable. Meetings start too early for me.` },
    { voice: 'Zira', text: `The starting time suits me, so I would keep it. But I would like more equipment available for members to borrow, especially when we practise ${t.activity}.` },
    { voice: 'David', text: `I agree. We need more equipment to borrow. Shall we send that suggestion to the organiser together?` },
    { voice: 'Zira', text: 'Yes, let us do that after the next meeting.' },
  ];
  const mcq = (id: string, text: string, answer: string, wrong: string[], evidence: string) => {
    const options = rotate([answer, ...wrong], (index + id.charCodeAt(id.length - 1)) % 3);
    return { id, text, options, correctAnswer: options.indexOf(answer), explanation: evidence };
  };
  const talk1 = `Good evening. I coordinate the ${t.club}, and I want to explain our plans for the ${t.event}. Our main aim is to introduce local residents to ${t.activity}. We are not trying to raise money or attract visitors from abroad. Everyone is welcome, even if they have never tried this activity before. Our biggest difficulty has been finding enough volunteers. We have already paid for the venue, and plenty of people have booked places, but we still need helpers to welcome visitors and explain the schedule. If you can offer an hour of your time, please speak to me after this meeting. Training will be provided, so you do not need previous experience. We hope the event will encourage more residents to join our regular sessions.`;
  const talk2 = `When I first became interested in ${t.activity}, I tried to learn everything in one weekend. That was a mistake. I became tired and forgot most of what I had practised. An experienced member of the ${t.club} suggested spending twenty minutes on one skill each day instead. This approach worked much better. The main benefit was that I could remember the techniques from one session to the next. It did not immediately make my work faster, and it certainly did not save money on equipment. My advice to other beginners is to set a small, achievable goal for every practice session. Do not compare yourself with experts, and do not buy expensive equipment before you understand what you really need. Progress takes patience, but regular practice makes a difference.`;
  return { mode: 'full', purpose: 'EXAM', details: { title: `Listening ${t.name}`, pictureUrl: SAMPLE_COVER }, parts: {
    1: { questions: shortItems.map((item, i) => {
      const answer = item.values[index];
      const other = item.values[(index + 1) % 5];
      const speech = item.speech(answer, other);
      return { ...mcq(String(i + 1), item.question, answer, [other, item.values[(index + 2) % 5]], speech), audioUrl: audio(`p1-${i + 1}`, [{ voice: i % 2 ? 'David' : 'Zira', text: speech }]) };
    }) },
    2: { id: 14, instruction: `Four people discuss learning in a ${t.club}. Match each speaker with one statement. One statement is not used.`, speakers: ['Speaker A', 'Speaker B', 'Speaker C', 'Speaker D'], options: rotate(statements, index), answers: order.map(i => statements[i]),
      explanations: Object.fromEntries(order.map((person, i) => [`Speaker ${'ABCD'[i]}`, people[person]])),
      audioUrl: audio('p2', order.map((person, i) => ({ voice: i % 2 ? 'Zira' : 'David', text: `Speaker ${'ABCD'[i]}. ${people[person]}` }))) },
    3: { id: 15, context: `A man and a woman discuss their ${t.club}.`, subTitle: 'Who expresses each opinion?', options: ['Man', 'Woman', 'Both'], audioUrl: audio('p3', p3Turns), statements: [
      { id: '15a', text: 'The membership fee is good value.', answer: 'Man', explanation: 'Người nam nói phí hợp lý; người nữ nói đắt.' },
      { id: '15b', text: 'The members make newcomers feel welcome.', answer: 'Both', explanation: 'Cả hai nói các thành viên thân thiện, chào đón người mới.' },
      { id: '15c', text: 'The current starting time is suitable.', answer: 'Woman', explanation: 'Người nữ muốn giữ giờ hiện tại; người nam cho rằng quá sớm.' },
      { id: '15d', text: 'More equipment should be available to borrow.', answer: 'Both', explanation: 'Người nữ đề xuất và người nam đồng ý trực tiếp.' },
    ] },
    4: { recordings: [
      { id: 16, context: `An organiser talks about a ${t.event}.`, audioUrl: audio('p4-1', [{ voice: 'Zira', text: talk1 }]), subQuestions: [
        mcq('16a', 'What is the main purpose of the event?', 'To introduce an activity to local people', ['To raise money for a building', 'To attract international visitors'], 'Our main aim is to introduce local residents to the activity.'),
        mcq('16b', 'What is the main difficulty for the organiser?', 'Finding enough helpers', ['Paying for the venue', 'Getting people to book'], 'Our biggest difficulty has been finding enough volunteers.'),
      ] },
      { id: 17, context: `A member gives advice about learning ${t.activity}.`, audioUrl: audio('p4-2', [{ voice: 'David', text: talk2 }]), subQuestions: [
        mcq('17a', 'What improved after the speaker changed the practice routine?', 'Remembering techniques', ['Working immediately faster', 'Spending less on equipment'], 'The main benefit was remembering techniques from one session to the next.'),
        mcq('17b', 'What does the speaker advise beginners to do?', 'Choose a small goal for each session', ['Compare their work with experts', 'Buy expensive equipment first'], 'Set a small, achievable goal for every practice session.'),
      ] },
    ] },
  } };
}

export function buildAudioScripts(): AudioScript[] {
  for (let i = 0; i < themes.length; i++) listeningForm(i);
  return structuredClone(audioScripts);
}
