import React, { useState, useEffect, useMemo } from 'react';
import ProfileSidebar from '../components/ProfileSidebar';
import { getHistoryEntries } from '../../../utils/historyStorage';
import {
  getFilteredEntries,
  calcSkillDistribution,
  calcScoreOverTime,
  calcStreak,
  calcAvgBand,
  calcBestSkill,
  calcWeakSkill,
  calcGoalProgress
} from '../../../utils/dashboardUtils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { ClipboardList, Target, Trophy, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import styles from './DashboardPage.module.css';

const SKILL_COLORS = {
  listening: '#4e79a7',
  reading: '#f28e2c',
  writing: '#e15759',
  speaking: '#76b7b2',
  grammar: '#59a14f'
};

export default function DashboardPage() {
  const [entries, setEntries] = useState([]);
  const [skillFilter, setSkillFilter] = useState('all');
  const [partFilter, setPartFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, 7, 30, 90

  useEffect(() => {
    setEntries(getHistoryEntries());
  }, []);

  const filteredEntries = useMemo(() => {
    return getFilteredEntries(entries, { skill: skillFilter, part: partFilter, dateRange: dateFilter });
  }, [entries, skillFilter, partFilter, dateFilter]);

  // Derived stats (overall, independent of filters except when specified)
  const totalTests = entries.length;
  const streak = calcStreak(entries);
  const avgBand = calcAvgBand(entries);
  const bestSkill = calcBestSkill(entries);
  const weakSkill = calcWeakSkill(entries);

  // Criteria average
  const criteriaEntries = entries.filter(e => ['speaking', 'writing'].includes(e.skill));
  const avgCriteriaScore = criteriaEntries.length > 0
    ? Math.round(criteriaEntries.reduce((sum, e) => {
      const avg = e.criteria?.reduce((s, c) => s + c.score, 0) / (e.criteria?.length || 1) || 0;
      return sum + avg;
    }, 0) / criteriaEntries.length)
    : 0;

  // Chart data (uses filters)
  const scoreOverTimeData = useMemo(() => calcScoreOverTime(filteredEntries), [filteredEntries]);

  // Skill dist always shows all skills, ignores skill/part filter, but respects date filter
  const dateFilteredOnly = useMemo(() => {
    return getFilteredEntries(entries, { skill: 'all', part: 'all', dateRange: dateFilter });
  }, [entries, dateFilter]);
  const skillDistData = useMemo(() => calcSkillDistribution(dateFilteredOnly), [dateFilteredOnly]);

  // Calculate how many entries for each skill to show in pill badges
  const skillCounts = useMemo(() => {
    const counts = { all: entries.length, listening: 0, reading: 0, writing: 0, speaking: 0, grammar: 0 };
    entries.forEach(e => {
      if (counts[e.skill] !== undefined) counts[e.skill]++;
    });
    return counts;
  }, [entries]);

  const partCounts = useMemo(() => {
    const counts = {};
    const relevantHistory = skillFilter === 'all' ? entries : entries.filter(e => e.skill === skillFilter);
    relevantHistory.forEach(entry => {
      counts[entry.mode] = (counts[entry.mode] || 0) + 1;
    });
    return counts;
  }, [entries, skillFilter]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="dashboard" />

        <div className={styles.content}>
          <div className={styles.headerBanner}>
            <div className={styles.titleArea}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>Learning Overview</h1>
                <span className={styles.badge}>Aptis ESOL Exam</span>
              </div>
              <p className={styles.subtitle}>Track performance metrics, average scores, and your path to target Aptis bands.</p>
            </div>
            <div className={styles.headerActions}>
            </div>
          </div>

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #e0f2fe' }}>
                <ClipboardList size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>Total Tests Completed</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{totalTests}</span>
                </div>
                <div className={styles.kpiDesc}>Overall finished tests</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' }}>
                <Target size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>Average Score (Criteria)</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{avgCriteriaScore}%</span>
                </div>
                <div className={styles.kpiProgressBar}>
                  <div className={styles.kpiProgressFill} style={{ width: `${avgCriteriaScore}%`, background: '#f59e0b' }}></div>
                </div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }}>
                <Trophy size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>Average Band (Avg Band)</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue} style={{ color: '#059669' }}>{avgBand}</span>
                </div>
                <div className={styles.kpiDesc}>Based on test history</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6' }}>
                <Clock size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>Learning Streak</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{streak} days</span>
                </div>
                <div className={styles.kpiDesc}>Current active streak</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#faf5ff', color: '#7e22ce', border: '1px solid #f3e8ff' }}>
                <CheckCircle size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>Best Skill</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue} style={{ fontSize: '20px', color: '#581c87' }}>{bestSkill.name}</span>
                  {bestSkill.band && <span style={{ fontSize: '12px', fontWeight: '800', color: '#6b21a8', background: '#f3e8ff', padding: '2px 8px', borderRadius: '6px' }}>Band {bestSkill.band}</span>}
                </div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' }}>
                <AlertTriangle size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>Needs Improvement (Weakest Skill)</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue} style={{ fontSize: '20px', color: '#431407' }}>{weakSkill.name}</span>
                  {weakSkill.band && <span style={{ fontSize: '12px', fontWeight: '800', color: '#9a3412', background: '#ffedd5', padding: '2px 8px', borderRadius: '6px' }}>Band {weakSkill.band}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Skill:</span>
              <div className={styles.filterBtnGroup}>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'all' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('all'); setPartFilter('all'); }}
                >
                  All
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'listening' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('listening'); setPartFilter('all'); }}
                >
                  Listening ({skillCounts.listening})
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'reading' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('reading'); setPartFilter('all'); }}
                >
                  Reading ({skillCounts.reading})
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'writing' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('writing'); setPartFilter('all'); }}
                >
                  Writing ({skillCounts.writing})
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'speaking' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('speaking'); setPartFilter('all'); }}
                >
                  Speaking ({skillCounts.speaking})
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'grammar' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('grammar'); setPartFilter('all'); }}
                >
                  Grammar & Vocab ({skillCounts.grammar})
                </button>
              </div>
            </div>

            {skillFilter !== 'all' && (
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Part:</span>
                <div className={styles.filterBtnGroup}>
                  {['all', 'full', 'part1', 'part2', 'part3', 'part4'].map(part => {
                    if (skillFilter === 'grammar' && (part === 'part3' || part === 'part4')) return null;

                    let label = part;
                    if (part === 'all') label = 'All';
                    if (part === 'full') label = 'Full Test';
                    if (part.startsWith('part')) label = part.replace('part', 'Part ');

                    return (
                      <button
                        key={part}
                        className={`${styles.filterBtn} ${partFilter === part ? styles.active : ''}`}
                        onClick={() => setPartFilter(part)}
                      >
                        {label}
                        {part !== 'all' && partCounts[part] !== undefined && (
                          ` (${partCounts[part]})`
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Time:</span>
              <div className={styles.filterBtnGroup}>
                <button
                  className={`${styles.filterBtn} ${dateFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setDateFilter('all')}
                >
                  All Time
                </button>
                <button
                  className={`${styles.filterBtn} ${dateFilter === '7' ? styles.active : ''}`}
                  onClick={() => setDateFilter('7')}
                >
                  Last 7 days
                </button>
                <button
                  className={`${styles.filterBtn} ${dateFilter === '30' ? styles.active : ''}`}
                  onClick={() => setDateFilter('30')}
                >
                  Last 30 days
                </button>
                <button
                  className={`${styles.filterBtn} ${dateFilter === '90' ? styles.active : ''}`}
                  onClick={() => setDateFilter('90')}
                >
                  This Quarter
                </button>
              </div>
            </div>
          </div>

          <div className={styles.chartsSection}>
            <div className={styles.chartContainerFull}>
              <h3>Score Over Time</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreOverTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    {Object.keys(SKILL_COLORS).map(skill => (
                      <Line key={skill} type="monotone" dataKey={skill} stroke={SKILL_COLORS[skill]} strokeWidth={2} activeDot={{ r: 8 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartContainerFull}>
              <h3>Skill Distribution</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={skillDistData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                      {skillDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SKILL_COLORS[entry.name] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
