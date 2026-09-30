import Pagination from '../../../components/common/Pagination';
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { getHistoryEntries } from '../../../utils/historyStorage';
import { ClipboardList, Calendar, Clock, FileText, Search } from 'lucide-react';
import styles from './LearningHistoryPage.module.css';
import AnswerSelect from '../../../components/common/AnswerSelect';
import { testAttemptsApi } from '../../test-attempts/services/testAttemptsApi';
import { practiceAttemptsApi } from '../../test-attempts/services/practiceAttemptsApi';
import { formatDuration } from '../../test-attempts/utils/attemptTime';
import { getApiError } from '../../../services/apiError';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';
import { useTranslation } from 'react-i18next';

const HISTORY_QUERY_SCHEMA = {
  purpose: { ...queryParam.enum(['EXAM', 'PRACTICE'], 'EXAM'), param: 'type' },
  skillFilter: { ...queryParam.enum(['all', 'listening', 'reading', 'writing', 'speaking', 'grammar'], 'all'), param: 'skill' },
  partFilter: { ...queryParam.enum(['all', 'full', 'part1', 'part2', 'part3', 'part4'], 'all'), param: 'part' },
  sortOrder: { ...queryParam.enum(['desc', 'asc'], 'desc'), param: 'sort' },
  appliedSearch: { ...queryParam.string(''), param: 'q' },
  page: queryParam.positiveInt(1),
  browserPage: queryParam.positiveInt(1),
  pageSize: { ...queryParam.positiveInt(() => window.innerWidth <= 700 ? 5 : 10, 100), param: 'size' },
};

const REMOTE_SKILLS = new Set(['all', 'grammar', 'writing', 'listening', 'reading', 'speaking']);
const BROWSER_SKILLS = new Set(['reading']);
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
    assessmentPending: ['WRITING', 'SPEAKING'].includes(attempt.component) && attempt.gradingStatus !== 'COMPLETED',
    cefrLevel: attempt.estimatedCefr,
  };
}

function HistoryCards({ entries, navigate, t, locale }) {
  return <div className={styles.historyList}>{entries.map(entry =>
    <div key={entry.id} className={`${styles.card} ${entry.reviewUrl ? styles.clickableCard : ''}`}
      onClick={entry.reviewUrl ? () => navigate(entry.reviewUrl) : undefined}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitleWrap}>
            <span className={`${styles.skillBadge} ${styles[entry.skill]}`}>{entry.skill}</span>
            <span className={styles.modeBadge}>{entry.purpose === 'PRACTICE' ? t('common.practice') : t('history.mockTest')}</span>
            <h3 className={styles.testName}>{entry.testName}</h3>
            <span className={styles.modeBadge}>{entry.mode === 'full' ? t('common.fullTest') : t('common.part', { number: entry.mode?.replace('part', '') })}</span>
          </div>
          <div className={styles.metaInfo}>
            <span className={styles.metaItem}><Calendar size={14} />{new Date(entry.submittedAt).toLocaleString(locale)}</span>
            <span className={styles.metaItem}><Clock size={14} />{entry.timeSpent}</span>
            {entry.cefrLevel && <span className={styles.metaItem}><span className={styles.cefrBadge}>CEFR / Band: {entry.cefrLevel}</span></span>}
            {entry.assessmentPending && <span className={styles.metaItem}>{t('history.assessmentPending')}</span>}
          </div>
        </div>
        {entry.reviewUrl && <div className={styles.cardAction}>
          <Link to={entry.reviewUrl} className={styles.reviewBtn} onClick={event => event.stopPropagation()}>
            <FileText size={16} />{t('history.reviewResult')}
          </Link>
        </div>}
      </div>
    </div>)}</div>;
}

export default function LearningHistoryPage() {
  const { t, i18n } = useTranslation();
  const [history] = useState(() => getHistoryEntries());
  const [urlState, setUrlState] = useUrlQueryState(HISTORY_QUERY_SCHEMA);
  const { page, browserPage, pageSize, sortOrder, skillFilter, partFilter, appliedSearch, purpose } = urlState;
  const [searchDraft, setSearchDraft] = useState({ source: appliedSearch, value: appliedSearch });
  const searchInput = searchDraft.source === appliedSearch ? searchDraft.value : appliedSearch;
  const setSearchInput = value => setSearchDraft({ source: appliedSearch, value });
  const setPage = next => setUrlState(current => ({ page: typeof next === 'function' ? next(current.page) : next }));
  const setBrowserPage = next => setUrlState(current => ({
    browserPage: typeof next === 'function' ? next(current.browserPage) : next,
  }));
  const setPageSize = next => {
    setUrlState(current => ({ pageSize: typeof next === 'function' ? next(current.pageSize) : next, page: 1, browserPage: 1 }));
  };
  const navigate = useNavigate();
  const [remote, setRemote] = useState({ requestKey: null, entries: [], total: 0, error: '' });
  const remoteRequestKey = `${purpose}:${skillFilter}:${partFilter}:${sortOrder}:${page}:${pageSize}:${appliedSearch}`;
  const remoteLoading = REMOTE_SKILLS.has(skillFilter) && remote.requestKey !== remoteRequestKey;

  useEffect(() => {
    if (!REMOTE_SKILLS.has(skillFilter)) return undefined;
    const controller = new AbortController();
    const component = REMOTE_COMPONENTS[skillFilter];
    const historyApi = purpose === 'PRACTICE' ? practiceAttemptsApi : testAttemptsApi;
    historyApi.history({
      page, pageSize, component, mode: partFilter,
      search: appliedSearch, sort: sortOrder, signal: controller.signal,
    }).then(result => setRemote({
      requestKey: remoteRequestKey,
      entries: (result.data ?? []).map(remoteHistoryEntry),
      total: result.pagination?.totalItems ?? 0,
      error: '',
    })).catch(error => {
      if (error.code !== 'ERR_CANCELED') setRemote({ requestKey: remoteRequestKey, entries: [], total: 0,
        error: getApiError(error, 'Unable to load your test history.') });
    });
    return () => controller.abort();
  }, [appliedSearch, page, pageSize, partFilter, purpose, remoteRequestKey, skillFilter, sortOrder]);

  const handleSortChange = (e) => {
    setUrlState({ sortOrder: e.target.value, page: 1 });
  };
  const handlePurposeChange = nextPurpose => {
    setUrlState({ purpose: nextPurpose, partFilter: 'all', page: 1, browserPage: 1 });
  };
  const handleSkillChange = (skill) => {
    setUrlState({ skillFilter: skill, partFilter: 'all', appliedSearch: '', page: 1, browserPage: 1 });
    setSearchInput('');
  };
  const handlePartChange = (part) => {
    setUrlState({ partFilter: part, appliedSearch: '', page: 1, browserPage: 1 });
    setSearchInput('');
  };

  const handleSearch = () => {
    setUrlState({ appliedSearch: searchInput, page: 1, browserPage: 1 });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const localFilteredHistory = useMemo(() => history
    .filter(entry => {
      if (!BROWSER_SKILLS.has(entry.skill)) return false;
      if ((entry.purpose ?? 'EXAM') !== purpose) return false;
      if (skillFilter !== 'all' && entry.skill !== skillFilter) return false;
      if (partFilter !== 'all' && entry.mode !== partFilter) return false;
      if (appliedSearch) {
        const normalizedSearch = appliedSearch.toLowerCase().replace(/\s+/g, '');
        const normalizedName = entry.testName.toLowerCase().replace(/\s+/g, '');
        return normalizedName.includes(normalizedSearch);
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.submittedAt);
      const dateB = new Date(b.submittedAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }), [history, purpose, skillFilter, partFilter, appliedSearch, sortOrder]);

  const isRemoteSkill = REMOTE_SKILLS.has(skillFilter);
  const filteredHistory = isRemoteSkill ? remote.entries : localFilteredHistory;
  const currentEntries = isRemoteSkill ? remote.entries : filteredHistory.slice((page - 1) * pageSize, page * pageSize);
  const browserEntries = localFilteredHistory.slice((browserPage - 1) * pageSize, browserPage * pageSize);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="history" />

        <div className={styles.content}>
          <div className={styles.header}>
            <h2>{t('profile.history')}</h2>
          </div>

          <div className={styles.filters}>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>{t('history.activity')}:</span>
              <div className={styles.filterBtnGroup}>
                <button className={`${styles.filterBtn} ${purpose === 'EXAM' ? styles.active : ''}`}
                  onClick={() => handlePurposeChange('EXAM')}>{t('history.mockTests')}</button>
                <button className={`${styles.filterBtn} ${purpose === 'PRACTICE' ? styles.active : ''}`}
                  onClick={() => handlePurposeChange('PRACTICE')}>{t('common.practice')}</button>
              </div>
            </div>
            <div className={styles.searchSortRow}>
              <div className={styles.sortRow}>
                <span className={styles.filterLabel}>{t('history.sortBy')}:</span>
                <AnswerSelect className={styles.select} value={sortOrder} onChange={handleSortChange} options={[{ value: 'desc', label: t('history.newest') }, { value: 'asc', label: t('history.oldest') }]} ariaLabel={t('history.sortHistory')} />
              </div>

              <div className={styles.searchRow}>
                <input
                  type="text"
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
                    className={`${styles.filterBtn} ${skillFilter === skill && !appliedSearch ? styles.active : ''}`}
                    onClick={() => handleSkillChange(skill)}
                  >
                    {skill === 'all' ? t('history.all') : t(`nav.${skill}`)}
                  </button>
                ))}
              </div>
            </div>

            {skillFilter !== 'all' && (
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
                        className={`${styles.filterBtn} ${partFilter === part && !appliedSearch ? styles.active : ''}`}
                        onClick={() => handlePartChange(part)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {!isRemoteSkill && <p className={styles.sourceNote}>{t('history.browserOnly')}</p>}
          {remoteLoading && isRemoteSkill ? <div className={styles.emptyState}><p>{t('history.loading')}</p></div> : remote.error && isRemoteSkill ? (
            <div className={styles.emptyState}><h3>{t('history.loadError')}</h3><p>{remote.error}</p></div>
          ) : filteredHistory.length === 0 && !(skillFilter === 'all' && localFilteredHistory.length) ? (
            <div className={styles.emptyState}>
              <ClipboardList size={48} />
              <h3>{t('common.noTests')}</h3>
              <p>{t('history.noResults')}</p>
            </div>
          ) : <HistoryCards entries={currentEntries} navigate={navigate} t={t} locale={i18n.language === 'vi' ? 'vi-VN' : 'en-US'} />}
          <Pagination page={page} totalItems={isRemoteSkill ? remote.total : filteredHistory.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          {skillFilter === 'all' && localFilteredHistory.length > 0 && <section className={styles.browserHistory}>
            <h3>{t('history.browserResults')}</h3>
            <p>{t('history.legacyResults')}</p>
            <HistoryCards entries={browserEntries} navigate={navigate} t={t} locale={i18n.language === 'vi' ? 'vi-VN' : 'en-US'} />
            <Pagination page={browserPage} totalItems={localFilteredHistory.length} pageSize={pageSize}
              onPageChange={setBrowserPage} onPageSizeChange={setPageSize} />
          </section>}
        </div>
      </div>
    </div>
  );
}
