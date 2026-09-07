import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { getHistoryEntries } from '../../../utils/historyStorage';
import { ClipboardList, Calendar, Clock, FileText } from 'lucide-react';
import styles from './LearningHistoryPage.module.css';

export default function LearningHistoryPage() {
  const [history, setHistory] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [skillFilter, setSkillFilter] = useState('all');
  const [partFilter, setPartFilter] = useState('all');

  useEffect(() => {
    setHistory(getHistoryEntries());
  }, []);

  const handleSortChange = (e) => setSortOrder(e.target.value);
  const handleSkillChange = (skill) => {
    setSkillFilter(skill);
    setPartFilter('all');
  };
  const handlePartChange = (part) => setPartFilter(part);

  const filteredHistory = history
    .filter(entry => skillFilter === 'all' || entry.skill === skillFilter)
    .filter(entry => partFilter === 'all' || entry.mode === partFilter || (partFilter === 'full' && entry.mode === 'full'))
    .sort((a, b) => {
      const dateA = new Date(a.submittedAt);
      const dateB = new Date(b.submittedAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });



  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="history" />
        
        <div className={styles.content}>
          <div className={styles.header}>
            <h2>My Learning History</h2>
          </div>

          <div className={styles.filters}>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Sort by:</span>
              <select className={styles.select} value={sortOrder} onChange={handleSortChange}>
                <option value="desc">Mới nhất trước</option>
                <option value="asc">Cũ nhất trước</option>
              </select>
            </div>
            
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Skill:</span>
              {['all', 'listening', 'reading', 'writing', 'speaking', 'grammar'].map(skill => (
                <button 
                  key={skill}
                  className={`${styles.filterBtn} ${skillFilter === skill ? styles.active : ''}`}
                  onClick={() => handleSkillChange(skill)}
                >
                  {skill.charAt(0).toUpperCase() + skill.slice(1)}
                </button>
              ))}
            </div>

            {skillFilter !== 'all' && (
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Part:</span>
                {['all', 'full', 'part1', 'part2', 'part3', 'part4'].map(part => {
                  // Grammar only has part 1 and 2
                  if (skillFilter === 'grammar' && (part === 'part3' || part === 'part4')) return null;
                  
                  let label = part;
                  if (part === 'all') label = 'All Parts';
                  if (part === 'full') label = 'Full Test';
                  if (part.startsWith('part')) label = part.replace('part', 'Part ');

                  return (
                    <button 
                      key={part}
                      className={`${styles.filterBtn} ${partFilter === part ? styles.active : ''}`}
                      onClick={() => handlePartChange(part)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <div className={styles.emptyState}>
              <ClipboardList size={48} />
              <h3>No tests found</h3>
              <p>You haven't completed any tests matching these filters yet.</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {filteredHistory.map(entry => (
                <div key={entry.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <div className={styles.cardTitleWrap}>
                        <span className={`${styles.skillBadge} ${styles[entry.skill]}`}>
                          {entry.skill}
                        </span>
                        <h3 className={styles.testName}>{entry.testName}</h3>
                        <span className={styles.modeBadge}>
                          {entry.mode === 'full' ? 'Full Test' : entry.mode.replace('part', 'Part ')}
                        </span>
                      </div>
                      <div className={styles.metaInfo}>
                        <span className={styles.metaItem}>
                          <Calendar size={14} />
                          {new Date(entry.submittedAt).toLocaleString('vi-VN')}
                        </span>
                        <span className={styles.metaItem}>
                          <Clock size={14} />
                          {entry.timeSpent}
                        </span>
                        {entry.cefrLevel && (
                          <span className={styles.metaItem}>
                            <span className={styles.cefrBadge}>CEFR / Band: {entry.cefrLevel}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardAction}>
                      <Link to={entry.reviewUrl} className={styles.reviewBtn}>
                        <FileText size={16} />
                        Review Result
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
