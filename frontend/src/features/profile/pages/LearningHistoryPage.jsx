import Pagination from '../../../components/common/Pagination';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { getHistoryEntries } from '../../../utils/historyStorage';
import { ClipboardList, Calendar, Clock, FileText, Search } from 'lucide-react';
import styles from './LearningHistoryPage.module.css';
import AnswerSelect from '../../../components/common/AnswerSelect';
import { testAttemptsApi } from '../../test-attempts/services/testAttemptsApi';
import { formatDuration } from '../../test-attempts/utils/attemptTime';
import { getApiError } from '../../../services/apiError';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';

const HISTORY_QUERY_SCHEMA = {
  skillFilter: { ...queryParam.enum(['all', 'listening', 'reading', 'writing', 'speaking', 'grammar'], 'all'), param: 'skill' },
  partFilter: { ...queryParam.enum(['all', 'full', 'part1', 'part2', 'part3', 'part4'], 'all'), param: 'part' },
  sortOrder: { ...queryParam.enum(['desc', 'asc'], 'desc'), param: 'sort' },
  appliedSearch: { ...queryParam.string(''), param: 'q' },
  page: queryParam.positiveInt(1),
  pageSize: { ...queryParam.positiveInt(() => window.innerWidth <= 700 ? 5 : 10, 100), param: 'size' },
};

export default function LearningHistoryPage() {
  const [history, setHistory] = useState([]);
  const [urlState, setUrlState] = useUrlQueryState(HISTORY_QUERY_SCHEMA);
  const { page, pageSize, sortOrder, skillFilter, partFilter, appliedSearch } = urlState;
  const [searchInput, setSearchInput] = useState(appliedSearch);
  const setPage = next => setUrlState(current => ({ page: typeof next === 'function' ? next(current.page) : next }));
  const setPageSize = next => setUrlState(current => ({ pageSize: typeof next === 'function' ? next(current.pageSize) : next, page: 1 }));
  const navigate = useNavigate();
  const [remote, setRemote] = useState({ entries: [], total: 0, loading: false, error: '' });

  useEffect(() => {
    setHistory(getHistoryEntries());
  }, []);

  useEffect(() => setSearchInput(appliedSearch), [appliedSearch]);

  useEffect(() => {
    if (skillFilter !== 'grammar') return undefined;
    const controller = new AbortController();
    setRemote(current => ({ ...current, loading: true, error: '' }));
    testAttemptsApi.history({
      page, pageSize, component: 'GRAMMAR_VOCAB', mode: partFilter,
      search: appliedSearch, sort: sortOrder, signal: controller.signal,
    }).then(result => setRemote({
      entries: (result.data ?? []).map(attempt => ({
        id: attempt.attemptId,
        skill: 'grammar',
        testName: attempt.title || 'Grammar & Vocabulary Test',
        mode: attempt.scope === 'FULL_SKILL' ? 'full' : `part${attempt.partNumber}`,
        submittedAt: attempt.submittedAt,
        timeSpent: attempt.startedAt && attempt.submittedAt ? formatDuration(attempt.startedAt, attempt.submittedAt) : '--:--:--',
        reviewUrl: `/grammar-vocab/result-detail?attemptId=${attempt.attemptId}`,
      })),
      total: result.pagination?.totalItems ?? 0,
      loading: false,
      error: '',
    })).catch(error => {
      if (error.code !== 'ERR_CANCELED') setRemote({ entries: [], total: 0, loading: false,
        error: getApiError(error, 'Unable to load your Grammar & Vocabulary history.') });
    });
    return () => controller.abort();
  }, [appliedSearch, page, pageSize, partFilter, skillFilter, sortOrder]);

  const handleSortChange = (e) => {
    setUrlState({ sortOrder: e.target.value, page: 1 });
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

  const localFilteredHistory = history
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

  const isRemoteGrammar = skillFilter === 'grammar';
  const filteredHistory = isRemoteGrammar ? remote.entries : localFilteredHistory;
  const currentEntries = isRemoteGrammar ? remote.entries : filteredHistory.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="history" />

        <div className={styles.content}>
          <div className={styles.header}>
            <h2>Learning History</h2>
          </div>

          <div className={styles.filters}>
            <div className={styles.searchSortRow}>
              <div className={styles.sortRow}>
                <span className={styles.filterLabel}>Sort by:</span>
                <AnswerSelect className={styles.select} value={sortOrder} onChange={handleSortChange} options={[{ value: 'desc', label: 'Newest first' }, { value: 'asc', label: 'Oldest first' }]} ariaLabel="Sort test history" />
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

          {remote.loading && isRemoteGrammar ? <div className={styles.emptyState}><p>Loading history…</p></div> : remote.error && isRemoteGrammar ? (
            <div className={styles.emptyState}><h3>Unable to load history</h3><p>{remote.error}</p></div>
          ) : filteredHistory.length === 0 ? (
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
          <Pagination page={page} totalItems={isRemoteGrammar ? remote.total : filteredHistory.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </div>
  );
}
