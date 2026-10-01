import Pagination from '../components/common/Pagination';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CommentSection from '../components/shared/CommentSection/CommentSection';
import styles from './TestListPage.module.css';
import { GRAMMAR_VOCAB_CONFIG } from '../features/grammar_vocab/config/grammarVocabConfig';
import { WRITING_CONFIG } from '../features/writing/config/writingConfig';
import { grammarTestsApi } from '../features/admin/grammar/services/grammarTestsApi';
import { writingTestsApi } from '../features/admin/writing/services/writingTestsApi';
import { listeningTestsApi } from '../features/admin/listening/services/listeningTestsApi';
import { speakingTestsApi } from '../features/admin/speaking/services/speakingTestsApi';
import { readingTestsApi } from '../features/admin/reading/services/readingTestsApi';
import { getApiError } from '../services/apiError';
import { testAttemptsApi } from '../features/test-attempts/services/testAttemptsApi';
import { practiceAttemptsApi } from '../features/test-attempts/services/practiceAttemptsApi';
import { formatDuration } from '../features/test-attempts/utils/attemptTime';
import useUrlQueryState, { queryParam } from '../hooks/useUrlQueryState';
import { useTranslation } from 'react-i18next';

const testListQuerySchema = purpose => ({
  activeTab: { ...queryParam.enum(['part1', 'part2', 'part3', 'part4', 'full'], purpose === 'EXAM' ? 'full' : 'part1'), param: 'part' },
  query: { ...queryParam.string(''), param: 'q' },
  page: queryParam.positiveInt(1),
  pageSize: { ...queryParam.positiveInt(() => window.innerWidth <= 700 ? 5 : 10, 100), param: 'size' },
});

// Fake data for tests
const MOCK_TESTS = [
  {
    id: 1,
    title: 'Introduction to Computer Science',
    desc: 'Gap Filling\nMultiple Choice (One Answer)\nAptis Practice Tests',
    part: 'Part 1',
    status: 'Completed',
    submitted: '20:15 - Jan 06, 2026',
    duration: '00:05:30',
    accuracy: 80,
  },
  {
    id: 2,
    title: 'Modern Human Resource Management',
    desc: 'Text Cohesion\nActual Tests',
    part: 'Part 1',
    status: 'Completed',
    submitted: '21:00 - Jan 29, 2026',
    duration: '00:08:45',
    accuracy: 100,
  },
  {
    id: 3,
    title: 'The Evolution of E-commerce',
    desc: 'Opinion Matching\nTrainer & Practice Tests+',
    part: 'Part 1',
    status: 'Completed',
    submitted: '10:20 - Feb 24, 2026',
    duration: '00:12:00',
    accuracy: 35,
  },
  {
    id: 4,
    title: 'Data Warehousing and Mining',
    desc: 'Matching Headings\nForecast Quarter 1/2026',
    part: 'Part 1',
    status: 'Not Started',
  }
];

export default function TestListPage({ purpose = 'EXAM' }) {
  const { t } = useTranslation();
  const { skill } = useParams();
  const navigate = useNavigate();
  const [urlState, setUrlState] = useUrlQueryState(useMemo(() => testListQuerySchema(purpose), [purpose]));
  const { activeTab, page, pageSize, query } = urlState;
  const setActiveTab = value => setUrlState({ activeTab: value, page: 1 });
  const setQuery = value => setUrlState({ query: value, page: 1 });
  const setPage = next => setUrlState(current => ({ page: typeof next === 'function' ? next(current.page) : next }));
  const setPageSize = next => setUrlState(current => ({ pageSize: typeof next === 'function' ? next(current.pageSize) : next, page: 1 }));
  const [grammarState, setGrammarState] = useState({ tests: [], totalItems: 0, loading: false, error: '' });
  const [writingState, setWritingState] = useState({ tests: [], totalItems: 0, loading: false, error: '' });
  const [listeningState, setListeningState] = useState({ tests: [], totalItems: 0, loading: false, error: '' });
  const [speakingState, setSpeakingState] = useState({ tests: [], totalItems: 0, loading: false, error: '' });
  const [readingState, setReadingState] = useState({ tests: [], totalItems: 0, loading: false, error: '' });
  useEffect(() => {
    if (purpose === 'EXAM' && activeTab !== 'full') setUrlState({ activeTab: 'full', page: 1 });
  }, [activeTab, purpose, setUrlState]);
  useEffect(() => {
    if (skill !== 'grammar-vocab') return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setGrammarState(current => ({ ...current, loading: true, error: '' }));
      grammarTestsApi.listPublished({ search: query, mode: purpose === 'EXAM' ? 'full' : activeTab, purpose, page, pageSize, signal: controller.signal })
        .then(async result => {
        const ids = (result.data ?? []).map(test => test.id);
        const attemptsApi = purpose === 'PRACTICE' ? practiceAttemptsApi : testAttemptsApi;
        const history = ids.length ? await attemptsApi.states(ids, controller.signal).catch(() => ({ data: [] })) : { data: [] };
        const latestByTest = new Map();
        for (const attempt of history.data ?? []) {
          if (!latestByTest.has(attempt.testId)) latestByTest.set(attempt.testId, attempt);
        }
        setGrammarState({
          tests: (result.data ?? []).map(test => {
            const attempt = latestByTest.get(test.id);
            const completed = attempt?.status === 'SUBMITTED';
            const inProgress = attempt?.status === 'IN_PROGRESS';
            return {
            ...test,
            title: test.title || test.name,
            desc: `${test.questionType}\nAptiMate published test`,
            part: test.section,
            tabId: test.mode,
            status: completed ? 'Completed' : inProgress ? 'In Progress' : 'Not Started',
            attemptId: attempt?.attemptId,
            submitted: completed ? new Date(attempt.submittedAt).toLocaleString('vi-VN') : undefined,
            duration: completed && attempt.startedAt && attempt.submittedAt ? formatDuration(attempt.startedAt, attempt.submittedAt) : undefined,
            accuracy: completed && Number(attempt.maxScore) ? Math.round((Number(attempt.score) / Number(attempt.maxScore)) * 100) : undefined,
            apiManaged: true,
          }; }),
          totalItems: result.pagination?.totalItems ?? 0,
          loading: false,
          error: '',
        });
      })
        .catch(error => {
          if (error.code !== 'ERR_CANCELED') setGrammarState({ tests: [], totalItems: 0, loading: false, error: getApiError(error, 'Unable to load Grammar & Vocabulary tests.') });
        });
    }, query.trim() ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeTab, page, pageSize, purpose, query, skill]);

  useEffect(() => {
    if (skill !== 'writing') return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setWritingState(current => ({ ...current, loading: true, error: '' }));
      writingTestsApi.listPublished({ search: query, mode: purpose === 'EXAM' ? 'full' : activeTab, purpose, page, pageSize, signal: controller.signal })
        .then(async result => {
          const ids = (result.data ?? []).map(test => test.id);
          const attemptsApi = purpose === 'PRACTICE' ? practiceAttemptsApi : testAttemptsApi;
          const states = ids.length ? await attemptsApi.states(ids, controller.signal).catch(() => ({ data: [] })) : { data: [] };
          const latestByTest = new Map((states.data ?? []).map(attempt => [attempt.testId, attempt]));
          setWritingState({
            tests: (result.data ?? []).map(test => {
              const attempt = latestByTest.get(test.id);
              const completed = attempt?.status === 'SUBMITTED';
              const inProgress = attempt?.status === 'IN_PROGRESS';
              return {
                ...test,
                title: test.title || test.name,
                desc: `AptiMate Writing ${test.section} practice\n${completed && attempt.gradingStatus !== 'COMPLETED' ? 'Assessment pending' : 'Aptis writing task'}`,
                part: test.section,
                tabId: test.mode,
                status: completed ? 'Completed' : inProgress ? 'In Progress' : 'Not Started',
                attemptId: attempt?.attemptId,
                submitted: completed && attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('vi-VN') : undefined,
                duration: completed && attempt.startedAt && attempt.submittedAt ? formatDuration(attempt.startedAt, attempt.submittedAt) : undefined,
                accuracy: completed && Number(attempt.maxScore) ? Math.round((Number(attempt.score) / Number(attempt.maxScore)) * 100) : null,
                apiManaged: true,
              };
            }),
            totalItems: result.pagination?.totalItems ?? 0,
            loading: false,
            error: '',
          });
        })
        .catch(error => {
          if (error.code !== 'ERR_CANCELED') setWritingState({ tests: [], totalItems: 0, loading: false, error: getApiError(error, 'Unable to load Writing tests.') });
        });
    }, query.trim() ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeTab, page, pageSize, purpose, query, skill]);

  useEffect(() => {
    const catalog = skill === 'listening'
      ? { api: listeningTestsApi, setState: setListeningState, label: 'Listening' }
      : skill === 'speaking' ? { api: speakingTestsApi, setState: setSpeakingState, label: 'Speaking' }
        : skill === 'reading' ? { api: readingTestsApi, setState: setReadingState, label: 'Reading' } : null;
    if (!catalog) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      catalog.setState(current => ({ ...current, loading: true, error: '' }));
      catalog.api.listPublished({ search: query, mode: purpose === 'EXAM' ? 'full' : activeTab, purpose, page, pageSize, signal: controller.signal })
        .then(async result => {
          const rows = result.data ?? result.tests ?? [];
          const ids = rows.map(test => test.id);
          const attemptsApi = purpose === 'PRACTICE' ? practiceAttemptsApi : testAttemptsApi;
          const states = ids.length ? await attemptsApi.states(ids, controller.signal).catch(() => ({ data: [] })) : { data: [] };
          const latest = new Map((states.data ?? []).map(attempt => [attempt.testId, attempt]));
          catalog.setState({
            tests: rows.map(test => {
              const attempt = latest.get(test.id);
              const completed = attempt?.status === 'SUBMITTED';
              return { ...test, title: test.title || test.name, desc: `AptiMate ${catalog.label} ${test.section}`,
                part: test.section, tabId: test.mode, status: completed ? 'Completed' : 'Not Started',
                attemptId: attempt?.attemptId, submitted: completed && attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('vi-VN') : undefined,
                duration: completed && attempt.startedAt && attempt.submittedAt ? formatDuration(attempt.startedAt, attempt.submittedAt) : undefined,
                accuracy: completed && Number(attempt.maxScore) ? Math.round((Number(attempt.score) / Number(attempt.maxScore)) * 100) : null,
                apiManaged: true };
            }),
            totalItems: result.pagination?.totalItems ?? rows.length, loading: false, error: '',
          });
        })
        .catch(error => {
          if (error.code !== 'ERR_CANCELED') catalog.setState({ tests: [], totalItems: 0, loading: false,
            error: getApiError(error, `Unable to load ${catalog.label} tests.`) });
        });
    }, query.trim() ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeTab, page, pageSize, purpose, query, skill]);

  // Helper to get config based on skill
  const getConfig = () => {
    if (skill === 'grammar-vocab') return GRAMMAR_VOCAB_CONFIG;
    if (skill === 'writing') return WRITING_CONFIG;
    if (skill === 'listening' || skill === 'speaking' || skill === 'reading') return {
      title: purpose === 'PRACTICE' ? t('practice.title', { skill: t(`nav.${skill}`) }) : `${t(`nav.${skill}`)} ${t('common.tests')}`,
      tabs: [1, 2, 3, 4].map(number => ({ id: `part${number}`, label: t('common.part', { number }) })).concat({ id: 'full', label: t('common.fullTest') }),
    };
    // fallback config
    return { tabs: [{ id: 'part1', label: 'Part 1' }] };
  };

  const currentConfig = getConfig();
  const visibleTabs = purpose === 'EXAM'
    ? [{ id: 'full', label: t('common.fullTest') }]
    : currentConfig.tabs.map(tab => ({ ...tab, label: tab.id === 'full'
      ? t('common.fullTest') : t('common.part', { number: tab.id.replace('part', '') }) }));
  const managedState = skill === 'writing' ? writingState : skill === 'grammar-vocab' ? grammarState
    : skill === 'listening' ? listeningState : skill === 'speaking' ? speakingState : skill === 'reading' ? readingState : null;
  const tests = managedState?.tests ?? currentConfig.tests ?? MOCK_TESTS;
  const filteredTests = managedState ? tests : tests.filter((test) => (!test.tabId || test.tabId === activeTab) && test.title.toLowerCase().includes(query.trim().toLowerCase()));

  // Helper to format skill name nicely
  const formatSkillName = (skillStr) => {
    if (!skillStr) return 'TEST';
    return skillStr.replace(/-/g, ' ').toUpperCase() + ' TEST';
  };

  const skillTranslationKey = skill === 'grammar-vocab' ? 'grammar' : skill;
  const translatedSkill = skillTranslationKey && t(`nav.${skillTranslationKey}`);
  const title = translatedSkill
    ? (purpose === 'PRACTICE' ? t('practice.title', { skill: translatedSkill }) : `${translatedSkill} ${t('common.tests')}`.toUpperCase())
    : currentConfig.title || formatSkillName(skill);

  const handleDoTest = (testId) => {
    // Navigate to the generic introduction page with testId and mode in query params
    navigate(`/${skill}/introduction?testId=${testId}&mode=${activeTab}`);
  };

  const startTest = async test => {
    if (purpose === 'EXAM') { handleDoTest(test.id); return; }
    try {
      const started = await practiceAttemptsApi.start({ testId: test.id, attemptId: crypto.randomUUID(), mode: test.mode || activeTab });
      const firstPart = started.scope === 'PART' ? `part${started.partNumber}` : 'part1';
      navigate(`/${skill}/test/${firstPart}?attemptId=${started.attemptId}&practice=true`);
    } catch (error) {
      const message = getApiError(error, 'Unable to start this practice.');
      if (skill === 'grammar-vocab') setGrammarState(current => ({ ...current, error: message }));
      else if (skill === 'writing') setWritingState(current => ({ ...current, error: message }));
      else if (skill === 'listening') setListeningState(current => ({ ...current, error: message }));
      else if (skill === 'speaking') setSpeakingState(current => ({ ...current, error: message }));
      else if (skill === 'reading') setReadingState(current => ({ ...current, error: message }));
    }
  };

  const handleReviewTest = (test) => {
    const apiResultPaths = {
      'grammar-vocab': { overview: '/grammar-vocab/result', detail: '/grammar-vocab/result-detail' },
      writing: { overview: '/writing/result', detail: '/writing/result-detail' },
      listening: { overview: '/listening/result', detail: '/listening/detail-result' },
      reading: { overview: '/reading/result', detail: '/reading/detail-result' },
      speaking: { overview: '/speaking/result', detail: '/speaking/detail-result' },
    };
    if (apiResultPaths[skill] && test.attemptId) {
      const resultPath = purpose === 'PRACTICE' ? apiResultPaths[skill].detail : apiResultPaths[skill].overview;
      navigate(`${resultPath}?attemptId=${test.attemptId}${purpose === 'PRACTICE' ? '&practice=true' : ''}`);
      return;
    }
    const resultDetailPath = currentConfig.resultDetailPath || `/${skill}/result-detail`;
    const part = test.tabId === 'part2' ? '2' : '1';
    const isFull = test.tabId === 'full';
    const params = new URLSearchParams({
      testId: String(test.id),
      part,
      isFull: String(isFull),
    });

    navigate(`${resultDetailPath}?${params.toString()}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.titleContainer}>
        <span className={styles.title}>{title}</span>
      </div>

      <div className={styles.tabsBox}>
        <div className={styles.tabsLabel}>
          {purpose === 'PRACTICE' ? t('practice.choosePart') : t('common.fullTest')}
          <div className={styles.tabsIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10L12 15L17 10" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <div className={styles.tabsContainer}>
          {visibleTabs.map((tab) => (
            <div
              key={tab.id}
              className={`${styles.tabItem} ${activeTab === tab.id ? styles.tabItemActive : styles.tabItemInactive}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.tabText}>{tab.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.testSection}>
          <div className={styles.searchRow}>
            <div className={styles.searchInputContainer}>
              <div className={styles.searchInputWrapper}>
                <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="7" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 20L16 16" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input type="text" className={styles.searchInput} placeholder={t('common.search')} value={query} onChange={e => setQuery(e.target.value)} />
              </div>
            </div>
            <button className={styles.searchBtn}>
              <span className={styles.searchBtnText}>{t('common.search')}</span>
            </button>
          </div>

          <div className={styles.gridContainer}>
            <div className={styles.gridRow}>
              {(managedState ? filteredTests : filteredTests.slice((page - 1) * pageSize, page * pageSize)).map((test) => (
                <div key={test.id} className={styles.testCard}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitle}>{test.title}</div>
                    <div className={styles.cardInfoRow}>
                      <div className={styles.cardImageWrapper}>
                        <img className={styles.cardImage} src={test.pictureUrl || 'https://placehold.co/157x79'} alt="Thumbnail" />
                      </div>
                      {test.status === 'Completed' ? (
                        <div className={styles.cardDetails}>
                          <div className={styles.cardDesc} style={{ whiteSpace: 'pre-line' }}>{test.desc}</div>
                          <div className={styles.statsList}>
                            <div className={styles.statItem}>
                              <span className={styles.statLabel}>{t('common.submitted')}:</span>
                              <span className={styles.statValue}>{test.submitted}</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statLabel}>{t('common.duration')}:</span>
                              <span className={styles.statValue}>{test.duration}</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statLabel}>{skill === 'writing' ? `${t('common.score')}:` : `${t('common.accuracy')}:`}</span>
                              <span className={`${styles.statValue} ${test.accuracy == null ? '' : test.accuracy >= 80 ? styles.statValueSuccess : styles.statValueDanger}`}>
                                {test.accuracy == null ? t('common.awaitingScore') : `${test.accuracy}%`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.cardDetails}>
                          <div className={styles.cardDesc} style={{ whiteSpace: 'pre-line' }}>{test.desc}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    {test.status === 'Completed' && (
                      <button className={styles.reviewBtn} onClick={() => handleReviewTest(test)}>
                        <span className={styles.reviewBtnText}>{t('common.review')}</span>
                      </button>
                    )}
                    <button className={styles.doTestBtn} onClick={() => void startTest(test)}>
                      <span className={styles.doTestBtnText}>{test.status === 'In Progress' ? t('common.continue') : test.status === 'Completed' ? t('common.tryAgain') : t('common.start')}</span>
                    </button>
                  </div>

                  <div className={styles.partBadge}>
                    <span className={styles.partBadgeText}>{test.part}</span>
                  </div>

                  {test.status === 'Completed' ? (
                    <div className={styles.statusBadgeCompleted}>
                      <span className={styles.statusBadgeCompletedText}>{t('common.completed')}</span>
                    </div>
                  ) : (
                    <div className={styles.statusBadgeNotStarted}>
                      <span className={styles.statusBadgeNotStartedText}>{test.status === 'In Progress' ? t('common.inProgress') : t('common.notStarted')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {managedState?.loading && <p>{t('common.loading')}</p>}
          {managedState?.error && <p>{managedState.error}</p>}
          <Pagination page={page} totalItems={managedState?.totalItems ?? filteredTests.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          <div className={styles.commentSectionWrapper}>
            <CommentSection />
          </div>
        </div>
      </div>
    </div>
  );
}
