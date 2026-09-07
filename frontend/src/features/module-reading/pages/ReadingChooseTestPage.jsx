import Pagination from '../../../components/common/Pagination';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CommentSection from '../../../components/shared/CommentSection/CommentSection';
import styles from './ReadingChooseTestPage.module.css';
import {getAdminReadingList} from '../services/readingTestRepository';

const TABS = [
  { id: 'part1', label: 'Part 1' },
  { id: 'part2', label: 'Part 2' },
  { id: 'part3', label: 'Part 3' },
  { id: 'part4', label: 'Part 4' },
  { id: 'full', label: 'Full Reading test' },
];

export default function ReadingChooseTestPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [adminTests,setAdminTests]=useState(getAdminReadingList);
  useEffect(()=>{const refresh=()=>setAdminTests(getAdminReadingList());window.addEventListener('reading-tests-updated',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('reading-tests-updated',refresh);window.removeEventListener('storage',refresh)}},[]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('part1');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => window.innerWidth <= 700 ? 5 : 10);
  useEffect(() => setPage(1), [activeTab, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const fetchTests = async () => {
      setLoading(true);
      try {
        const data = await import('../services/mockData/testList.json');
        if (!cancelled) {
          setTests(data.tests || []);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load tests", error);
        if (!cancelled) setLoading(false);
      }
    };

    fetchTests();
    return () => { cancelled = true; };
  }, []);

  const handleDoTest = (testId) => {
    navigate(`/reading/introduction?testId=${testId}&mode=${activeTab}`);
  };

  const filteredTests = [...adminTests,...tests].filter(test => {
    // Filter by type: Full test or Dễ lẻ (Parts)
    const isFull = activeTab === 'full';
    const matchesTab = test.mode ? test.mode === activeTab : isFull ? (test.type === 'full') : (test.type === 'dễ lẻ');

    // Filter by search query
    if (searchQuery.trim() === '') return matchesTab;
    return matchesTab && test.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className={styles.page}>
      <div className={styles.titleContainer}>
        <span className={styles.title}>READING TEST</span>
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
          {/* Search Row */}
          <div className={styles.searchRow}>
            <div className={styles.searchInputContainer}>
              <div className={styles.searchInputWrapper}>
                <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="7" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 20L16 16" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search by test name."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <button className={styles.searchBtn}>
              <span className={styles.searchBtnText}>Search</span>
            </button>
          </div>

          {/* Grid Container */}
          <div className={styles.gridContainer}>
            <div className={styles.gridRow}>
              {loading ? (
                <div style={{ padding: '20px', fontSize: '16px', color: '#666' }}>
                  Loading tests...
                </div>
              ) : filteredTests.length === 0 ? (
                <div style={{ padding: '20px', fontSize: '16px', color: '#666' }}>
                  No tests available for this search/part yet.
                </div>
              ) : (
                filteredTests.slice((page - 1) * pageSize, page * pageSize).map((test, index) => {
                  // Simulate status based on mock index (Completed or Not Started)
                  const isCompleted = page === 1 && index === 0 && activeTab !== 'full';

                  return (
                    <div key={test.id} className={styles.testCard}>
                      <div className={styles.cardTop}>
                        <div className={styles.cardTitle}>{test.title}</div>
                        <div className={styles.cardInfoRow}>
                          <div className={styles.cardImageWrapper}>
                            <img className={styles.cardImage} src={test.thumbnail} alt={test.title} />
                          </div>

                          {isCompleted ? (
                            <div className={styles.cardDetails}>
                              <div className={styles.cardDesc}>Aptis Practice Tests<br />Reading skill</div>
                              <div className={styles.statsList}>
                                <div className={styles.statItem}>
                                  <span className={styles.statLabel}>Submitted:</span>
                                  <span className={styles.statValue}>20:15 - Jan 06, 2026</span>
                                </div>
                                <div className={styles.statItem}>
                                  <span className={styles.statLabel}>Duration:</span>
                                  <span className={styles.statValue}>00:15:30</span>
                                </div>
                                <div className={styles.statItem}>
                                  <span className={styles.statLabel}>Accuracy:</span>
                                  <span className={`${styles.statValue} ${styles.statValueSuccess}`}>
                                    85%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.cardDetails}>
                              <div className={styles.cardDesc} style={{ whiteSpace: 'pre-line' }}>
                                Aptis general practice material.<br />
                                Time limit: {test.duration} mins.<br />
                                Level: {test.level}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.cardActions}>
                        {isCompleted && (
                          <button
                            className={styles.reviewBtn}
                            onClick={() => navigate(`/reading/review/sess-mock`)}
                          >
                            <span className={styles.reviewBtnText}>Review</span>
                          </button>
                        )}
                        <button className={styles.doTestBtn} onClick={() => handleDoTest(test.id)}>
                          <span className={styles.doTestBtnText}>
                            {isCompleted ? 'Try again' : 'Do the test'}
                          </span>
                        </button>
                      </div>

                      <div className={styles.partBadge}>
                        <span className={styles.partBadgeText}>
                          {activeTab === 'full' ? 'Full Test' : `Part ${activeTab.replace('part', '')}`}
                        </span>
                      </div>

                      {isCompleted ? (
                        <div className={styles.statusBadgeCompleted}>
                          <span className={styles.statusBadgeCompletedText}>Completed</span>
                        </div>
                      ) : (
                        <div className={styles.statusBadgeNotStarted}>
                          <span className={styles.statusBadgeNotStartedText}>Not Started</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Pagination page={page} totalItems={filteredTests.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          <div className={styles.commentSectionWrapper} style={{ marginTop: '32px' }}>
            <CommentSection />
          </div>
        </div>
      </div>
    </div>
  );
}
