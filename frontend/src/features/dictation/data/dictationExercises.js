export const DICTATION_TOPICS = [
  { id: 'daily-life', name: 'Daily life', description: 'Daily routines, habits and everyday activities.' },
  { id: 'free-time', name: 'Free time', description: 'Plans, hobbies and activities outside work.' },
  { id: 'education', name: 'Education', description: 'Learning methods, studying and academic life.' },
  { id: 'environment', name: 'Environment', description: 'Sustainability, nature and responsible living.' },
  { id: 'work', name: 'Work', description: 'Communication, teamwork and the workplace.' },
];

export const DICTATION_EXERCISES = [
  {
    id: 'daily-routine',
    title: 'A busy morning',
    level: 'A2',
    topic: 'Daily life',
    accent: 'en-GB',
    transcript: 'I usually leave home at half past seven and take the bus to work.',
  },
  {
    id: 'weekend-plans',
    title: 'Weekend plans',
    level: 'B1',
    topic: 'Free time',
    accent: 'en-GB',
    transcript: 'If the weather stays sunny, we are planning to have a picnic by the lake.',
  },
  {
    id: 'online-learning',
    title: 'Learning online',
    level: 'B1',
    topic: 'Education',
    accent: 'en-US',
    transcript: 'Online courses allow students to study at their own pace and review difficult lessons.',
  },
  {
    id: 'environment',
    title: 'Protecting the environment',
    level: 'B2',
    topic: 'Environment',
    accent: 'en-GB',
    transcript: 'Reducing household waste requires small but consistent changes in the way we consume products.',
  },
  {
    id: 'workplace',
    title: 'Working together',
    level: 'B2',
    topic: 'Work',
    accent: 'en-US',
    transcript: 'Effective communication helps colleagues resolve disagreements before they affect the whole team.',
  },
];

export const DICTATION_FLASHCARDS = [
  { id: 'usually', topic: 'Daily life', word: 'usually', pronunciation: '/ˈjuːʒuəli/', type: 'adverb', meaning: 'thường xuyên', example: 'I usually leave home at half past seven.' },
  { id: 'planning', topic: 'Free time', word: 'plan', pronunciation: '/plæn/', type: 'verb', meaning: 'lên kế hoạch', example: 'We are planning to have a picnic.' },
  { id: 'pace', topic: 'Education', word: 'pace', pronunciation: '/peɪs/', type: 'noun', meaning: 'tốc độ, nhịp độ', example: 'Students can study at their own pace.' },
  { id: 'review', topic: 'Education', word: 'review', pronunciation: '/rɪˈvjuː/', type: 'verb', meaning: 'xem lại, ôn tập', example: 'Review difficult lessons after class.' },
  { id: 'household', topic: 'Environment', word: 'household', pronunciation: '/ˈhaʊshəʊld/', type: 'adjective', meaning: 'thuộc hộ gia đình', example: 'We should reduce household waste.' },
  { id: 'consistent', topic: 'Environment', word: 'consistent', pronunciation: '/kənˈsɪstənt/', type: 'adjective', meaning: 'nhất quán, đều đặn', example: 'Progress requires consistent practice.' },
  { id: 'consume', topic: 'Environment', word: 'consume', pronunciation: '/kənˈsjuːm/', type: 'verb', meaning: 'tiêu thụ', example: 'We should consider how we consume products.' },
  { id: 'effective', topic: 'Work', word: 'effective', pronunciation: '/ɪˈfektɪv/', type: 'adjective', meaning: 'hiệu quả', example: 'Effective communication builds trust.' },
  { id: 'colleague', topic: 'Work', word: 'colleague', pronunciation: '/ˈkɒliːɡ/', type: 'noun', meaning: 'đồng nghiệp', example: 'My colleague helped me finish the report.' },
  { id: 'resolve', topic: 'Work', word: 'resolve', pronunciation: '/rɪˈzɒlv/', type: 'verb', meaning: 'giải quyết', example: 'The team resolved the disagreement quickly.' },
];
