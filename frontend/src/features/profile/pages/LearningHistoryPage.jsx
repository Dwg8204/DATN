import Pagination from '../../../components/common/Pagination';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { getHistoryEntries } from '../../../utils/historyStorage';
import { ClipboardList, Calendar, Clock, FileText, Search } from 'lucide-react';
import styles from './LearningHistoryPage.module.css';
import AnswerSelect from '../../../components/common/AnswerSelect';

export default function LearningHistoryPage() {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => window.innerWidth <= 700 ? 5 : 10);
  const [sortOrder, setSortOrder] = useState('desc');
  const [skillFilter, setSkillFilter] = useState('all');
  const [partFilter, setPartFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setHistory(getHistoryEntries());
  }, []);

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
    setPage(1);
  };
  const handleSkillChange = (skill) => {
    setSkillFilter(skill);
    setPartFilter('all');
    setAppliedSearch('');
    setSearchInput('');
    setPage(1);
  };
  const handlePartChange = (part) => {
    setPartFilter(part);
    setAppliedSearch('');
    setSearchInput('');
    setPage(1);
  };

  const handleSearch = () => {
    setAppliedSearch(searchInput);
    setPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const skillCounts = React.useMemo(() => {
    const counts = {};
    history.forEach(entry => {
      counts[entry.skill] = (counts[entry.skill] || 0) + 1;
    });
    return counts;
  }, [history]);

  const partCounts = React.useMemo(() => {
    const counts = {};
    const relevantHistory = skillFilter === 'all' ? history : history.filter(e => e.skill === skillFilter);
    relevantHistory.forEach(entry => {
      counts[entry.mode] = (counts[entry.mode] || 0) + 1;
    });
    return counts;
  }, [history, skillFilter]);

  const filteredHistory = history
    .filter(entry => {
      if (appliedSearch) {
        const normalizedSearch = appliedSearch.toLowerCase().replace(/\s+/g, '');
        const normalizedName = entry.testName.toLowerCase().replace(/\s+/g, '');
        return normalizedName.includes(normalizedSearch);
      }
      if (skillFilter !== 'all' && entry.skill !== skillFilter) return false;
      if (partFilter !== 'all' && entry.mode !== partFilter && !(partFilter === 'full' && entry.mode === 'full')) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.submittedAt);
      const dateB = new Date(b.submittedAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  useEffect(() => setPage(1), [skillFilter, partFilter, sortOrder]);

  const currentEntries = filteredHistory.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="history" />

        <div className={styles.content}>
          <div className={styles.header}>
            <h2>My Learning History</h2>
          </div>

          <div className={styles.filters}>
            <div className={styles.searchSortRow}>
              <div className={styles.sortRow}>
                <span className={styles.filterLabel}>Sort by:</span>
                <AnswerSelect className={styles.select} value={sortOrder} onChange={handleSortChange} options={[{value:'desc',label:'Newest first'},{value:'asc',label:'Oldest first'}]} ariaLabel="Sort test history"/>
              </div>

              <div className={styles.searchRow}>
                <input
                  type="text"
                  placeholder="Search by test name (e.g. Aptis Grammar...)"
                  className={styles.searchInput}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className={`${styles.searchBtn} ${searchInput !== appliedSearch ? styles.highlight : ''}`}
                  onClick={handleSearch}
                >
                  <Search size={18} /> Search
                </button>
              </div>
            </div>

            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Skill:</span>
              <div className={styles.filterBtnGroup}>
                {['all', 'listening', 'reading', 'writing', 'speaking', 'grammar'].map(skill => (
                  <button
                    key={skill}
                    className={`${styles.filterBtn} ${skillFilter === skill && !appliedSearch ? styles.active : ''}`}
                    onClick={() => handleSkillChange(skill)}
                  >
                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                    {skill !== 'all' && skillCounts[skill] !== undefined && (
                      <span className={styles.filterCount}>({skillCounts[skill]})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {skillFilter !== 'all' && (
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Part:</span>
                <div className={styles.filterBtnGroup}>
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
                        className={`${styles.filterBtn} ${partFilter === part && !appliedSearch ? styles.active : ''}`}
                        onClick={() => handlePartChange(part)}
                      >
                        {label}
                        {part !== 'all' && partCounts[part] !== undefined && (
                          <span className={styles.filterCount}>({partCounts[part]})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
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
              {currentEntries.map(entry => (
                <div key={entry.id} className={`${styles.card} ${styles.clickableCard}`} onClick={() => navigate(entry.reviewUrl)}>
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
          <Pagination page={page} totalItems={filteredHistory.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </div>
  );
}
