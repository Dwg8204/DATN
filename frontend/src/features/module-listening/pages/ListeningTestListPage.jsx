import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CommentSection from '../../../components/shared/CommentSection/CommentSection';
import styles from './ListeningTestListPage.module.css';

const TABS = [
  { id: 'part1', label: 'Part 1' },
  { id: 'part2', label: 'Part 2' },
  { id: 'part3', label: 'Part 3' },
  { id: 'part4', label: 'Part 4' },
  { id: 'full', label: 'Full Listening test' },
];

const MOCK_TESTS = [
  {
    id: 1,
    title: 'Booking a Flight',
    desc: 'Information recognition\nAptis Practice Tests',
    part: 'Part 1',
    status: 'Completed',
    submitted: '20:15 - Jan 06, 2026',
    duration: '00:05:30',
    accuracy: 80,
  },
  {
    id: 2,
    title: 'People talking about their holidays',
    desc: 'Information matching\nActual Tests',
    part: 'Part 2',
    status: 'Completed',
    submitted: '21:00 - Jan 29, 2026',
    duration: '00:08:45',
    accuracy: 100,
  },
  {
    id: 3,
    title: 'A couple planning a weekend trip',
    desc: 'Inference/discussion\nTrainer & Practice Tests+',
    part: 'Part 3',
    status: 'Completed',
    submitted: '10:20 - Feb 24, 2026',
    duration: '00:12:00',
    accuracy: 35,
  },
  {
    id: 4,
    title: 'A lecture on climate change',
    desc: 'Identifying opinions\nForecast Quarter 1/2026',
    part: 'Part 4',
    status: 'Not Started',
  }
];

export default function ListeningTestListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('part1');

  const handleDoTest = (testId) => {
    // Navigate to the generic introduction page
    navigate(`/listening/introduction`);
  };

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
              <path d="M7 10L12 15L17 10" stroke="#131927" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
              {MOCK_TESTS.map((test) => (
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
                      <button className={styles.reviewBtn}>
                        <span className={styles.reviewBtnText}>Review</span>
                      </button>
                    )}
                    <button className={styles.doTestBtn} onClick={() => handleDoTest(test.id)}>
                      <span className={styles.doTestBtnText}>{test.status === 'Completed' ? 'Try again' : 'Do the test'}</span>
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

          <div className={styles.commentSectionWrapper} style={{ marginTop: '32px' }}>
            <CommentSection />
          </div>
        </div>
      </div>
    </div>
  );
}
