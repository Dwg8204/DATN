import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CommentSection from '../components/shared/CommentSection/CommentSection';
import styles from './TestListPage.module.css';
import { GRAMMAR_VOCAB_CONFIG } from '../features/grammar_vocab/config/grammarVocabConfig';

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

export default function TestListPage() {
  const { skill } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('part1');

  // Helper to get config based on skill
  const getConfig = () => {
    if (skill === 'grammar-vocab') return GRAMMAR_VOCAB_CONFIG;
    // fallback config
    return { tabs: [{ id: 'part1', label: 'Part 1' }] };
  };

  const currentConfig = getConfig();
  const tests = currentConfig.tests || MOCK_TESTS;
  const filteredTests = tests.filter((test) => !test.tabId || test.tabId === activeTab);

  // Helper to format skill name nicely
  const formatSkillName = (skillStr) => {
    if (!skillStr) return 'TEST';
    return skillStr.replace(/-/g, ' ').toUpperCase() + ' TEST';
  };

  const title = currentConfig.title || formatSkillName(skill);

  const handleDoTest = (testId) => {
    // Navigate to the generic introduction page with testId and mode in query params
    navigate(`/${skill}/introduction?testId=${testId}&mode=${activeTab}`);
  };

  const handleReviewTest = (test) => {
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
          Choose passage
          <div className={styles.tabsIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10L12 15L17 10" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <div className={styles.tabsContainer}>
          {currentConfig.tabs.map((tab) => (
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
                  <circle cx="11" cy="11" r="7" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 20L16 16" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input type="text" className={styles.searchInput} placeholder="Search by test name." />
              </div>
            </div>
            <button className={styles.searchBtn}>
              <span className={styles.searchBtnText}>Search</span>
            </button>
          </div>

          <div className={styles.gridContainer}>
            <div className={styles.gridRow}>
              {filteredTests.map((test) => (
                <div key={test.id} className={styles.testCard}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitle}>{test.title}</div>
                    <div className={styles.cardInfoRow}>
                      <div className={styles.cardImageWrapper}>
                        <img className={styles.cardImage} src="https://placehold.co/157x79" alt="Thumbnail" />
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
                      <button className={styles.reviewBtn} onClick={() => handleReviewTest(test)}>
                        <span className={styles.reviewBtnText}>Review</span>
                      </button>
                    )}
                    <button className={styles.doTestBtn} onClick={() => handleDoTest(test.id)}>
                      <span className={styles.doTestBtnText}>Do the test</span>
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
              ))}
            </div>
          </div>
          
          <div className={styles.commentSectionWrapper}>
            <CommentSection />
          </div>
        </div>
      </div>
    </div>
  );
}
