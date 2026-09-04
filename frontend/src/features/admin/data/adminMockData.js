export const DASHBOARD_STATS = [
  { label: 'Published tests', value: '128', change: '+12.5%' },
  { label: 'Active students', value: '2,840', change: '+8.2%' },
  { label: 'Attempts this month', value: '9,436', change: '+18.4%' },
  { label: 'Pending feedback', value: '36', change: '-6.1%' },
];

export const TEST_ACTIVITY = [
  { range: '< 1h', users: 470 }, { range: '1–2h', users: 720 }, { range: '2–3h', users: 580 },
  { range: '3–4h', users: 410 }, { range: '4–5h', users: 250 }, { range: '> 5h', users: 160 },
];
export const DASHBOARD_TRENDS={visit:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month,index)=>({month,value:[58,63,62,48,47,20,51,92,95,18,28,91][index]})),subscribers:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month,index)=>({month,value:[57,61,60,46,45,20,49,90,92,16,25,88][index]}))};

export const TEST_VOLUME = [
  {month:'Jan',reading:43,listening:50,writing:52,grammar:52,speaking:63},{month:'Feb',reading:27,listening:45,writing:60,grammar:60,speaking:21},{month:'Mar',reading:58,listening:46,writing:38,grammar:57,speaking:57},{month:'Apr',reading:43,listening:52,writing:68,grammar:68,speaking:70},{month:'May',reading:33,listening:59,writing:45,grammar:45,speaking:29},{month:'Jun',reading:35,listening:61,writing:49,grammar:49,speaking:37},
];

const names = ['Milk and Butter', 'Going to the cinema', 'Local food shops', 'Language Club', 'Weekend Exhibition', 'Learning a new skill', 'Community Garden', 'Travel Club', 'Book Club'];
const components = ['Full', 'Reading', 'Listening', 'Writing', 'Grammar & Vocab', 'Speaking'];
export const ADMIN_TESTS = Array.from({ length: 45 }, (_, index) => ({
  id: `writing-${index + 1}`,
  name: names[index % names.length] + (index >= names.length ? ` ${Math.floor(index / names.length) + 1}` : ''),
  component: components[index % components.length],
  section: components[index % components.length] === 'Writing' ? (index % 4 === 3 ? 'Full Writing' : `Part ${(index % 4) + 1}`) : 'Full Test',
  status: index % 3 === 0 ? 'Done' : 'Not Yet',
  dateAdded: new Date(2025, index % 12, (index * 7) % 27 + 1).toISOString(),
  attempts: 30 + index * 11,
  questionType:['Table','Line Graph','Map','Map','Map','Process'][index%6],
}));
