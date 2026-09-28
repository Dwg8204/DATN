export const SKILL_NAVIGATION = [
  { pathPrefix: '/writing', key: 'writing', overview: '/writing/overview', feed: null },
  { pathPrefix: '/grammar-vocab', key: 'grammar', overview: '/grammar-vocab/overview', feed: null },
  { pathPrefix: '/reading', key: 'reading', overview: '/reading', feed: null },
  { pathPrefix: '/listening', key: 'listening', overview: '/listening/overview', feed: '/listening/feed' },
  { pathPrefix: '/speaking', key: 'speaking', overview: '/speaking/overview', feed: '/speaking/feed' },
];

export function skillMenuItems(skill, translate) {
  const base = skill.pathPrefix;
  return [
    { label: translate('common.overview'), to: skill.overview },
    ...(skill.feed ? [{ label: translate('nav.feed'), to: skill.feed }] : []),
    { label: translate('common.practice'), to: `${base}/practice` },
    { label: translate('common.tests'), to: `${base}/tests` },
  ];
}
