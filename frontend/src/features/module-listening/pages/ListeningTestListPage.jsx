import Pagination from '../../../components/common/Pagination';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CommentSection from '../../../components/shared/CommentSection/CommentSection';
import styles from './ListeningTestListPage.module.css';
import { listeningTestsApi } from '../../admin/listening/services/listeningTestsApi';
import { testAttemptsApi } from '../../../features/test-attempts/services/testAttemptsApi';
import { formatDuration } from '../../../features/test-attempts/utils/attemptTime';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';

const TABS = [
  { id: 'part1', label: 'Part 1' },
  { id: 'part2', label: 'Part 2' },
  { id: 'part3', label: 'Part 3' },
  { id: 'part4', label: 'Part 4' },
  { id: 'full', label: 'Full test' },
];
const LIST_QUERY_SCHEMA = {
  activeTab: { ...queryParam.enum(TABS.map(tab => tab.id), 'part1'), param: 'part' },
  query: { ...queryParam.string(''), param: 'q' },
  page: queryParam.positiveInt(1),
  pageSize: { ...queryParam.positiveInt(() => window.innerWidth <= 700 ? 5 : 10, 100), param: 'size' },
};



export default function ListeningTestListPage() {
  const navigate = useNavigate();
  const [urlState, setUrlState] = useUrlQueryState(LIST_QUERY_SCHEMA);
  const { activeTab, page, pageSize, query } = urlState;
  const setActiveTab = value => setUrlState({ activeTab: value, page: 1 });
  const setQuery = value => setUrlState({ query: value, page: 1 });
  const setPage = next => setUrlState(current => ({ page: typeof next === 'function' ? next(current.page) : next }));
  const setPageSize = next => setUrlState(current => ({ pageSize: typeof next === 'function' ? next(current.pageSize) : next, page: 1 }));
  const [completedTests, setCompletedTests] = useState({});
  const [adminTests, setAdminTests] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      listeningTestsApi.listPublished({ search: query, mode: activeTab, page, pageSize, signal: controller.signal })
        .then(async result => {
          const ids = (result.data ?? []).map(test => test.id);
          const history = ids.length ? await testAttemptsApi.states(ids, controller.signal).catch(() => ({ data: [] })) : { data: [] };
          const latestByTest = new Map();
          for (const attempt of history.data ?? []) {
            if (!latestByTest.has(attempt.testId)) latestByTest.set(attempt.testId, attempt);
          }

          setAdminTests((result.data ?? []).map(test => {
            const attempt = latestByTest.get(test.id);
            const completed = attempt?.status === 'SUBMITTED';
            const inProgress = attempt?.status === 'IN_PROGRESS';
            return {
              id: test.id, title: test.title, desc: 'Listening practice test',
              part: test.mode === 'full' ? 'Full Listening Test' : test.mode.replace('part', 'Part '),
              tabId: test.mode, thumbnail: test.pictureUrl || 'https://placehold.co/157x79?text=Listening',
              status: completed ? 'Completed' : inProgress ? 'In Progress' : 'Not Started',
              attemptId: attempt?.attemptId,
              submitted: completed ? new Date(attempt.submittedAt).toLocaleString('vi-VN') : undefined,
              duration: completed && attempt.startedAt && attempt.submittedAt ? formatDuration(attempt.startedAt, attempt.submittedAt) : undefined,
              accuracy: completed && Number(attempt.maxScore) ? Math.round((Number(attempt.score) / Number(attempt.maxScore)) * 100) : undefined,
            };
          }));
          setTotalItems(result.pagination?.totalItems ?? 0);
        })
        .catch(err => {
          if (err.code !== 'ERR_CANCELED') console.error(err);
        });
    }, query ? 300 : 0);
    
    return () => { clearTimeout(timer); controller.abort(); };
  }, [activeTab, query, page, pageSize]);

  const handleDoTestPart = (testId, partNum) => {
    navigate(`/listening/introduction?testId=${testId}&mode=part${partNum}`);
  };

  const handleDoFullTest = (testId) => {
    navigate(`/listening/introduction?testId=${testId}&mode=full`);
  };

  const handleReview = (test) => {
    navigate(`/listening/result?attemptId=${test.attemptId}&testId=${test.id}&isFull=${test.tabId === 'full'}`);
  };

  const filteredTests = adminTests;

  const testsToRender = filteredTests;

  return (
    <div className={styles.page}>
      <div className={styles.titleContainer}>
        <span className={styles.title}>LISTENING TEST</span>
      </div>

      <div className={styles.tabsBox}>
        <div className={styles.tabsLabel}>
          Choose part
          <div className={styles.tabsIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10L12 15L17 10" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className={styles.tabsContainer}>
          {TABS.map((tab) => (
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
                  <circle cx="11" cy="11" r="7" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 20L16 16" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input type="text" className={styles.searchInput} placeholder="Search by test name." value={query} onChange={e => setQuery(e.target.value)} />
              </div>
            </div>
            <button className={styles.searchBtn}>
              <span className={styles.searchBtnText}>Search</span>
            </button>
          </div>

          <div className={styles.gridContainer}>
            <div className={styles.gridRow}>
              {testsToRender.length === 0 ? (
                <div style={{ padding: '20px', fontSize: '16px', color: '#666' }}>
                  No tests available for this part yet.
                </div>
              ) : (
                testsToRender.map((test) => (
                  <div key={test.id} className={styles.testCard}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardTitle}>{test.title}</div>
                      <div className={styles.cardInfoRow}>
                        <div className={styles.cardImageWrapper}>
                          <img className={styles.cardImage} src={test.thumbnail || "https://placehold.co/157x79"} alt="Thumbnail" />
                        </div>
                        {test.status === 'Completed' ? (
                          <div className={styles.cardDetails}>
                            <div className={styles.cardDesc} style={{ whiteSpace: 'pre-line' }}>{test.desc}</div>
                            <div className={styles.statsList}>
                              <div className={styles.statItem}>
                                <span className={styles.statLabel}>Submitted:</span>
                                <span className={styles.statValue}>{test.submitted}</span>
                              </div>
                              <div className={styles.statItem}>
                                <span className={styles.statLabel}>Duration:</span>
                                <span className={styles.statValue}>{test.duration}</span>
                              </div>
                              <div className={styles.statItem}>
                                <span className={styles.statLabel}>Accuracy:</span>
                                <span className={`${styles.statValue} ${test.accuracy >= 80 ? styles.statValueSuccess : styles.statValueDanger}`}>
                                  {test.accuracy}%
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
                        <button className={styles.reviewBtn} onClick={() => handleReview(test)}>
                          <span className={styles.reviewBtnText}>Review</span>
                        </button>
                      )}
                      <button className={styles.doTestBtn} onClick={() => {
                        if (activeTab === 'full') {
                          handleDoFullTest(test.id);
                        } else {
                          const partNum = test.part ? test.part.replace('Part ', '') : '1';
                          handleDoTestPart(test.id, partNum);
                        }
                      }}>
                        <span className={styles.doTestBtnText}>{test.status === 'Completed' ? 'Try again' : test.status === 'In Progress' ? 'Continue test' : 'Do the test'}</span>
                      </button>
                    </div>

                    <div className={styles.partBadge}>
                      <span className={styles.partBadgeText}>{test.part}</span>
                    </div>

                    {test.status === 'Completed' ? (
                      <div className={styles.statusBadgeCompleted}>
                        <span className={styles.statusBadgeCompletedText}>Completed</span>
                      </div>
                    ) : (
                      <div className={styles.statusBadgeNotStarted}>
                        <span className={styles.statusBadgeNotStartedText}>Not Started</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <Pagination page={page} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          <div className={styles.commentSectionWrapper} style={{ marginTop: '32px' }}>
            <CommentSection />
          </div>
        </div>
      </div>
    </div>
  );
}
