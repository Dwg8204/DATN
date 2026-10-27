import PageLoader from '../../../components/common/PageLoader.jsx';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import Pagination from '../../../components/common/Pagination';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { ClipboardList, Calendar, Clock, FileText, Search, History, GraduationCap } from 'lucide-react';
import styles from './LearningHistoryPage.module.css';
import AnswerSelect from '../../../components/common/AnswerSelect';
import { testAttemptsApi } from '../../test-attempts/services/testAttemptsApi';
import { practiceAttemptsApi } from '../../test-attempts/services/practiceAttemptsApi';
import { formatDuration } from '../../test-attempts/utils/attemptTime';
import { getApiError } from '../../../services/apiError';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';
import { useTranslation } from 'react-i18next';
import { writingHistoryStatus } from '../utils/historyAssessment';

const HISTORY_QUERY_SCHEMA = {
  purpose: { ...queryParam.enum(['EXAM', 'PRACTICE'], 'EXAM'), param: 'type' },
  skillFilter: { ...queryParam.enum(['all', 'listening', 'reading', 'writing', 'speaking', 'grammar'], 'all'), param: 'skill' },
  partFilter: { ...queryParam.enum(['all', 'full', 'part1', 'part2', 'part3', 'part4'], 'all'), param: 'part' },
  sortOrder: { ...queryParam.enum(['desc', 'asc'], 'desc'), param: 'sort' },
  appliedSearch: { ...queryParam.string(''), param: 'q' },
  page: queryParam.positiveInt(1),
  pageSize: { ...queryParam.positiveInt(() => window.innerWidth <= 700 ? 5 : 10, 100), param: 'size' },
};

const REMOTE_SKILLS = new Set(['all', 'grammar', 'writing', 'listening', 'reading', 'speaking']);
const REMOTE_COMPONENTS = { grammar: 'GRAMMAR_VOCAB', writing: 'WRITING', listening: 'LISTENING', reading: 'READING', speaking: 'SPEAKING' };
const COMPONENT_SKILLS = {
  GRAMMAR_VOCAB: { skill: 'grammar', overviewPath: '/grammar-vocab/result', detailPath: '/grammar-vocab/result-detail', fallbackTitle: 'Grammar & Vocabulary Test' },
  WRITING: { skill: 'writing', overviewPath: '/writing/result', detailPath: '/writing/result-detail', fallbackTitle: 'Writing Test' },
  LISTENING: { skill: 'listening', overviewPath: '/listening/result', detailPath: '/listening/detail-result', fallbackTitle: 'Listening Test' },
  READING: { skill: 'reading', overviewPath: '/reading/result', detailPath: '/reading/detail-result', fallbackTitle: 'Reading Test' },
  SPEAKING: { skill: 'speaking', overviewPath: '/speaking/result', detailPath: '/speaking/detail-result', fallbackTitle: 'Speaking Test' },
};

function remoteHistoryEntry(attempt) {
  const metadata = COMPONENT_SKILLS[attempt.component] ?? {
    skill: attempt.component?.toLowerCase() ?? 'unknown', overviewPath: null, detailPath: null, fallbackTitle: 'Test result',
  };
  const isPractice = attempt.purpose === 'PRACTICE';
  const resultPath = isPractice ? metadata.detailPath : metadata.overviewPath;
  return {
    id: attempt.attemptId,
    skill: metadata.skill,
    testName: attempt.title || metadata.fallbackTitle,
    mode: attempt.scope === 'FULL_SKILL' ? 'full' : `part${attempt.partNumber}`,
    submittedAt: attempt.submittedAt,
    timeSpent: attempt.startedAt && attempt.submittedAt ? formatDuration(attempt.startedAt, attempt.submittedAt) : '--:--:--',
    purpose: attempt.purpose ?? 'EXAM',
    reviewUrl: resultPath ? `${resultPath}?attemptId=${attempt.attemptId}${isPractice ? '&practice=true' : ''}` : null,
    assessmentStatus: writingHistoryStatus(attempt),
    simulatedScore: attempt.assessmentMethod === 'SIMULATED',
    cefrLevel: attempt.estimatedCefr,
    score: attempt.score,
    maxScore: attempt.maxScore,
  };
}

function HistoryTable({ entries, t, locale }) {
  return <div className={styles.tableScroll}><table className={styles.table} aria-label={t('profile.history')}>
    <thead><tr>{['dateTime', 'skill', 'part', 'score', 'cefr', 'actions'].map(key =>
      <th key={key} scope="col">{t(`history.${key}`)}</th>)}</tr></thead>
    <tbody>{entries.map(entry => {
      const date = entry.submittedAt ? new Date(entry.submittedAt) : null;
      return <tr key={entry.id}>
        <td data-label={t('history.dateTime')}><div className={styles.date}><Calendar size={14} aria-hidden="true" />
          <time dateTime={entry.submittedAt || undefined}>{date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(locale) : '—'}</time></div>
          <span className={styles.secondary}>{date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—'}</span></td>
        <td data-label={t('history.skill')}><div className={styles.testCell}><span className={styles.testIcon}><FileText size={19} aria-hidden="true" /></span>
          <div><span className={styles.skillName}>{t(`nav.${entry.skill}`, { defaultValue: entry.skill })}</span>
            <div className={styles.testName}>{entry.testName}</div>
            <span className={styles.duration}><Clock size={12} aria-hidden="true" />{entry.timeSpent}</span></div></div></td>
        <td data-label={t('history.part')}><span className={styles.modeBadge}>{entry.mode === 'full' ? t('common.fullTest') : t('common.part', { number: entry.mode?.replace('part', '') })}</span></td>
        <td data-label={t('history.score')}><strong className={styles.score}>{entry.score != null ? Number(entry.score).toLocaleString(locale, { maximumFractionDigits: 2 }) : '—'}{entry.score != null && entry.maxScore != null ? ` / ${entry.maxScore}` : ''}</strong>
          {entry.assessmentStatus && <span className={styles.secondary}>{t(entry.assessmentStatus)}</span>}
          {entry.simulatedScore && <span className={styles.secondary}>{t('history.simulatedScore')}</span>}</td>
        <td data-label={t('history.cefr')}>{entry.cefrLevel ? <span className={styles.cefrBadge}>{entry.cefrLevel}</span> : <span className={styles.secondary}>—</span>}</td>
        <td data-label={t('history.actions')}>{entry.reviewUrl && <Link to={entry.reviewUrl} className={styles.reviewBtn} aria-label={`${t('history.reviewResult')}: ${entry.testName}`}><FileText size={14} aria-hidden="true" />{t('history.reviewResult')}</Link>}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}

export default function LearningHistoryPage() {
  const ui = useUiTranslation();
  const { t, i18n } = useTranslation();
  const [urlState, setUrlState] = useUrlQueryState(HISTORY_QUERY_SCHEMA);
  const { page, pageSize, sortOrder, skillFilter, partFilter, appliedSearch, purpose } = urlState;
  const [searchDraft, setSearchDraft] = useState({ source: appliedSearch, value: appliedSearch });
  const searchInput = searchDraft.source === appliedSearch ? searchDraft.value : appliedSearch;
  const setSearchInput = value => setSearchDraft({ source: appliedSearch, value });
  const setPage = next => setUrlState(current => ({ page: typeof next === 'function' ? next(current.page) : next }));
  const setPageSize = next => {
    setUrlState(current => ({ pageSize: typeof next === 'function' ? next(current.pageSize) : next, page: 1 }));
  };
  const [totals, setTotals] = useState({ EXAM: null, PRACTICE: null });
  useEffect(() => {
    const controller = new AbortController();
    // Totals are unfiltered; do not infer global statistics from the current page.
    for (const [kind, api] of [['EXAM', testAttemptsApi], ['PRACTICE', practiceAttemptsApi]]) {
      api.history({ page: 1, pageSize: 1, signal: controller.signal }).then(result => {
        if (!controller.signal.aborted) setTotals(current => ({ ...current, [kind]: result.pagination?.totalItems ?? 0 }));
      }).catch(() => { /* Keep unavailable totals distinct from zero. The list reports its own errors. */ });
    }
    return () => controller.abort();
  }, []);
  const [remote, setRemote] = useState({ requestKey: null, entries: [], total: 0, error: '' });
  const remoteRequestKey = `${purpose}:${skillFilter}:${partFilter}:${sortOrder}:${page}:${pageSize}:${appliedSearch}`;
  const remoteLoading = REMOTE_SKILLS.has(skillFilter) && remote.requestKey !== remoteRequestKey;

  useEffect(() => {
    if (!REMOTE_SKILLS.has(skillFilter)) return undefined;
    const controller = new AbortController();
    const component = REMOTE_COMPONENTS[skillFilter];
    const historyApi = purpose === 'PRACTICE' ? practiceAttemptsApi : testAttemptsApi;
    historyApi.history({
      page, pageSize, component, mode: purpose === 'EXAM' ? 'all' : partFilter,
      search: appliedSearch, sort: sortOrder, signal: controller.signal,
    }).then(result => { if (!controller.signal.aborted) setRemote({
      requestKey: remoteRequestKey,
      entries: (result.data ?? []).map(remoteHistoryEntry),
      total: result.pagination?.totalItems ?? 0,
      error: '',
    }); }).catch(error => {
      if (!controller.signal.aborted && error.code !== 'ERR_CANCELED') setRemote({ requestKey: remoteRequestKey, entries: [], total: 0,
        error: getApiError(error, ui("Unable to load your test history.")) });
    });
    return () => controller.abort();
  }, [appliedSearch, page, pageSize, partFilter, purpose, remoteRequestKey, skillFilter, sortOrder, ui]);

  const handleSortChange = (e) => {
    setUrlState({ sortOrder: e.target.value, page: 1 });
  };
  const handlePurposeChange = nextPurpose => {
    setUrlState({ purpose: nextPurpose, partFilter: 'all', page: 1 });
  };
  const handleSkillChange = (skill) => {
    setUrlState({ skillFilter: skill, partFilter: 'all', appliedSearch: '', page: 1 });
    setSearchInput('');
  };
  const handlePartChange = (part) => {
    setUrlState({ partFilter: part, appliedSearch: '', page: 1 });
    setSearchInput('');
  };

  const handleSearch = () => {
    setUrlState({ appliedSearch: searchInput, page: 1 });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="history" />

        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.heroDecoration} aria-hidden="true" />
            <div className={styles.heroTitle}><span className={styles.heroIcon}><History size={26} aria-hidden="true" /></span><h1>{t('profile.history')}</h1></div>
            <p>{t('history.subtitle')}</p>
          </header>
          <section className={styles.stats} aria-label={t('history.summary')}>
            {[['EXAM', ClipboardList, 'history.mockTests'], ['PRACTICE', GraduationCap, 'common.practice']].map(([kind, Icon, label]) =>
              <div className={styles.statCard} key={kind}><span className={styles.statIcon}><Icon size={24} aria-hidden="true" /></span><div><span className={styles.secondary}>{t(label)}</span><strong>{totals[kind] == null ? '—' : totals[kind].toLocaleString(i18n.language)}</strong><span className={styles.secondary}>{t('history.completedAttempts')}</span></div></div>)}
          </section>

          <div className={styles.filters}>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>{t('history.activity')}:</span>
              <div className={styles.filterBtnGroup}>
                <button aria-pressed={purpose === 'EXAM'} className={`${styles.filterBtn} ${purpose === 'EXAM' ? styles.active : ''}`}
                  onClick={() => handlePurposeChange('EXAM')}>{t('history.mockTests')}</button>
                <button aria-pressed={purpose === 'PRACTICE'} className={`${styles.filterBtn} ${purpose === 'PRACTICE' ? styles.active : ''}`}
                  onClick={() => handlePurposeChange('PRACTICE')}>{t('common.practice')}</button>
              </div>
            </div>
            <div className={styles.searchSortRow}>
              <div className={styles.sortRow}>
                <span className={styles.filterLabel}>{t('history.sortBy')}:</span>
                <AnswerSelect translateLabels className={styles.select} value={sortOrder} onChange={handleSortChange} options={[{ value: 'desc', label: t('history.newest') }, { value: 'asc', label: t('history.oldest') }]} ariaLabel={t('history.sortHistory')} />
              </div>

              <div className={styles.searchRow}>
                <input
                  type="text"
                  aria-label={t('history.searchPlaceholder')}
                  placeholder={t('history.searchPlaceholder')}
                  className={styles.searchInput}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className={`${styles.searchBtn} ${searchInput !== appliedSearch ? styles.highlight : ''}`}
                  onClick={handleSearch}
                >
                  <Search size={18} /> {t('common.search')}
                </button>
              </div>
            </div>

            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>{t('history.skill')}:</span>
              <div className={styles.filterBtnGroup}>
                {['all', 'listening', 'reading', 'writing', 'speaking', 'grammar'].map(skill => (
                  <button
                    key={skill}
                    aria-pressed={skillFilter === skill}
                    className={`${styles.filterBtn} ${skillFilter === skill ? styles.active : ''}`}
                    onClick={() => handleSkillChange(skill)}
                  >
                    {skill === 'all' ? t('history.all') : t(`nav.${skill}`)}
                  </button>
                ))}
              </div>
            </div>

            {purpose === 'PRACTICE' && skillFilter !== 'all' && (
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>{t('history.part')}:</span>
                <div className={styles.filterBtnGroup}>
                  {['all', 'full', 'part1', 'part2', 'part3', 'part4'].map(part => {
                    // Grammar only has part 1 and 2
                    if (skillFilter === 'grammar' && (part === 'part3' || part === 'part4')) return null;

                    let label = part;
                    if (part === 'all') label = t('history.allParts');
                    if (part === 'full') label = t('common.fullTest');
                    if (part.startsWith('part')) label = t('common.part', { number: part.replace('part', '') });

                    return (
                      <button
                        key={part}
                        aria-pressed={partFilter === part}
                        className={`${styles.filterBtn} ${partFilter === part ? styles.active : ''}`}
                        onClick={() => handlePartChange(part)}
                      >
                        {ui(label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <section className={styles.results} aria-label={t('history.results')} aria-busy={remoteLoading}>
          <div className={styles.resultsHeader}><h2>{t(purpose === 'EXAM' ? 'history.mockTests' : 'common.practice')}</h2><span className={styles.secondary} role="status">{remoteLoading ? '' : t('history.resultCount', { count: remote.total })}</span></div>
          {remoteLoading ? <PageLoader /> : remote.error ? (
            <div className={styles.emptyState}><h3>{t('history.loadError')}</h3><p>{ui.error(remote.error)}</p></div>
          ) : remote.entries.length === 0 ? (
            <div className={styles.emptyState}>
              <ClipboardList size={48} />
              <h3>{t('common.noTests')}</h3>
              <p>{t('history.noResults')}</p>
            </div>
          ) : <HistoryTable entries={remote.entries} t={t} locale={i18n.language === 'vi' ? 'vi-VN' : 'en-US'} />}
          {!remoteLoading && !remote.error && remote.total > 0 && <div className={styles.pagination}><Pagination page={page} totalItems={remote.total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} /></div>}
          </section>
        </div>
      </div>
    </div>
  );
}
