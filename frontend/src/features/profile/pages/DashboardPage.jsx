import React, { useState, useEffect } from 'react';
import ProfileSidebar from '../components/ProfileSidebar';
import { testAttemptsApi } from '../../test-attempts/services/testAttemptsApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TotalTestsIcon, AvgScoreIcon, AvgBandIcon, StreakIcon, BestSkillIcon, WeakSkillIcon } from '../components/DashboardIcons';
import styles from './DashboardPage.module.css';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';
import { useTranslation } from 'react-i18next';

const DASHBOARD_QUERY_SCHEMA = {
  skillFilter: { ...queryParam.enum(['all', 'listening', 'reading', 'writing', 'speaking', 'grammar'], 'all'), param: 'skill' },
  partFilter: { ...queryParam.enum(['all', 'full', 'part1', 'part2', 'part3', 'part4'], 'all'), param: 'part' },
  dateFilter: { ...queryParam.enum(['all', '7', '30', '90'], 'all'), param: 'range' },
};

const SKILL_COLORS = {
  listening: '#4e79a7',
  reading: '#f28e2c',
  writing: '#e15759',
  speaking: '#76b7b2',
  grammar: '#59a14f'
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [urlState, setUrlState] = useUrlQueryState(DASHBOARD_QUERY_SCHEMA);
  const { skillFilter, partFilter, dateFilter } = urlState;
  const setSkillFilter = value => setUrlState({ skillFilter: value });
  const setPartFilter = value => setUrlState({ partFilter: value });
  const setDateFilter = value => setUrlState({ dateFilter: value });

  useEffect(() => {
    const controller = new AbortController();
    testAttemptsApi.dashboard({ skill: skillFilter, part: partFilter, range: dateFilter, signal: controller.signal })
      .then(result => { setDashboard(result); setLoadError(''); })
      .catch(error => { if (error.code !== 'ERR_CANCELED') { setDashboard(null); setLoadError(t('dashboard.loadError')); } });
    return () => controller.abort();
  }, [skillFilter, partFilter, dateFilter, t]);

  const totalTests = dashboard?.totalTests ?? 0;
  const streak = dashboard?.streak ?? 0;
  const avgBand = dashboard?.averageBand ?? 'N/A';
  const bestSkill = dashboard?.bestSkill?.name ? dashboard.bestSkill : { name: 'N/A', band: '' };
  const weakSkill = dashboard?.weakSkill?.name ? dashboard.weakSkill : { name: 'N/A', band: '' };
  const avgCriteriaScore = dashboard?.averageScore ?? null;
  const scoreOverTimeData = dashboard?.scoreOverTime ?? [];
  const skillDistData = dashboard?.skillDistribution ?? [];
  const skillCounts = dashboard?.skillCounts ?? { all: 0, listening: 0, reading: 0, writing: 0, speaking: 0, grammar: 0 };
  const partCounts = dashboard?.partCounts ?? {};

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="dashboard" />

        <div className={styles.content}>
          <div className={styles.headerBanner}>
            <div className={styles.titleArea}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{t('dashboard.title')}</h1>
                <span className={styles.badge}>{t('dashboard.exam')}</span>
              </div>
              <p className={styles.subtitle}>{t('dashboard.subtitle')}</p>
              {loadError && <p role="alert">{loadError}</p>}
            </div>
            <div className={styles.headerActions}>
            </div>
          </div>

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard} style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #e0f2fe', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)' }}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(2, 132, 199, 0.15)' }}>
                <TotalTestsIcon size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel} style={{ color: '#0284c7', opacity: 0.85 }}>{t('dashboard.totalTests')}</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{totalTests}</span>
                </div>
                <div className={styles.kpiDesc} style={{ color: '#0284c7', opacity: 0.7 }}>{t('dashboard.totalTestsDesc')}</div>
              </div>
            </div>

            <div className={styles.kpiCard} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)' }}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(217, 119, 6, 0.15)' }}>
                <AvgScoreIcon size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel} style={{ color: '#d97706', opacity: 0.85 }}>{t('dashboard.averageScore')}</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{avgCriteriaScore == null ? 'N/A' : `${avgCriteriaScore}%`}</span>
                </div>
                <div className={styles.kpiProgressBar}>
                  <div className={styles.kpiProgressFill} style={{ width: `${avgCriteriaScore ?? 0}%`, background: '#f59e0b' }}></div>
                </div>
              </div>
            </div>

            <div className={styles.kpiCard} style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)' }}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(5, 150, 105, 0.15)' }}>
                <AvgBandIcon size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel} style={{ color: '#059669', opacity: 0.85 }}>{t('dashboard.averageBand')}</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{avgBand}</span>
                </div>
                <div className={styles.kpiDesc} style={{ color: '#059669', opacity: 0.7 }}>{t('dashboard.averageBandDesc')}</div>
              </div>
            </div>

            <div className={styles.kpiCard} style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.15)' }}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(225, 29, 72, 0.15)' }}>
                <StreakIcon size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel} style={{ color: '#e11d48', opacity: 0.85 }}>{t('dashboard.streak')}</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{t('dashboard.days', { count: streak })}</span>
                </div>
                <div className={styles.kpiDesc} style={{ color: '#e11d48', opacity: 0.7 }}>{t('dashboard.streakDesc')}</div>
              </div>
            </div>

            <div className={styles.kpiCard} style={{ background: '#faf5ff', color: '#7e22ce', border: '1px solid #f3e8ff', boxShadow: '0 4px 12px rgba(126, 34, 206, 0.15)' }}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(126, 34, 206, 0.15)' }}>
                <BestSkillIcon size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel} style={{ color: '#7e22ce', opacity: 0.85 }}>{t('dashboard.bestSkill')}</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{bestSkill.name === 'N/A' ? t('dashboard.noData') : t(`nav.${bestSkill.name.toLowerCase()}`, { defaultValue: bestSkill.name })}</span>
                  {bestSkill.band && <span style={{ fontSize: '12px', fontWeight: '800', color: '#6b21a8', background: 'rgba(126, 34, 206, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>{t('dashboard.band', { band: bestSkill.band })}</span>}
                </div>
              </div>
            </div>

            <div className={styles.kpiCard} style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }}>
              <div className={styles.kpiIcon} style={{ background: 'rgba(234, 88, 12, 0.15)' }}>
                <WeakSkillIcon size={24} />
              </div>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel} style={{ color: '#ea580c', opacity: 0.85 }}>{t('dashboard.weakSkill')}</div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{weakSkill.name === 'N/A' ? t('dashboard.noData') : t(`nav.${weakSkill.name.toLowerCase()}`, { defaultValue: weakSkill.name })}</span>
                  {weakSkill.band && <span style={{ fontSize: '12px', fontWeight: '800', color: '#9a3412', background: 'rgba(234, 88, 12, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>{t('dashboard.band', { band: weakSkill.band })}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>{t('dashboard.skill')}:</span>
              <div className={styles.filterBtnGroup}>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'all' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('all'); setPartFilter('all'); }}
                >
                  {t('dashboard.all')}
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'listening' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('listening'); setPartFilter('all'); }}
                >
                  {t('nav.listening')} ({skillCounts.listening})
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'reading' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('reading'); setPartFilter('all'); }}
                >
                  {t('nav.reading')} ({skillCounts.reading})
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'writing' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('writing'); setPartFilter('all'); }}
                >
                  {t('nav.writing')} ({skillCounts.writing})
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'speaking' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('speaking'); setPartFilter('all'); }}
                >
                  {t('nav.speaking')} ({skillCounts.speaking})
                </button>
                <button
                  className={`${styles.filterBtn} ${skillFilter === 'grammar' ? styles.active : ''}`}
                  onClick={() => { setSkillFilter('grammar'); setPartFilter('all'); }}
                >
                  {t('nav.grammar')} ({skillCounts.grammar})
                </button>
              </div>
            </div>

            {skillFilter !== 'all' && (
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>{t('dashboard.part')}:</span>
                <div className={styles.filterBtnGroup}>
                  {['all', 'full', 'part1', 'part2', 'part3', 'part4'].map(part => {
                    if (skillFilter === 'grammar' && (part === 'part3' || part === 'part4')) return null;

                    let label = part;
                    if (part === 'all') label = t('dashboard.all');
                    if (part === 'full') label = t('dashboard.fullTest');
                    if (part.startsWith('part')) label = t('common.part', { number: part.replace('part', '') });

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
              <span className={styles.filterLabel}>{t('dashboard.time')}:</span>
              <div className={styles.filterBtnGroup}>
                <button
                  className={`${styles.filterBtn} ${dateFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setDateFilter('all')}
                >
                  {t('dashboard.allTime')}
                </button>
                <button
                  className={`${styles.filterBtn} ${dateFilter === '7' ? styles.active : ''}`}
                  onClick={() => setDateFilter('7')}
                >
                  {t('dashboard.last7')}
                </button>
                <button
                  className={`${styles.filterBtn} ${dateFilter === '30' ? styles.active : ''}`}
                  onClick={() => setDateFilter('30')}
                >
                  {t('dashboard.last30')}
                </button>
                <button
                  className={`${styles.filterBtn} ${dateFilter === '90' ? styles.active : ''}`}
                  onClick={() => setDateFilter('90')}
                >
                  {t('dashboard.quarter')}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.chartsSection}>
            <div className={styles.chartContainerFull}>
              <h3>{t('dashboard.scoreOverTime')}</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreOverTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend formatter={value => t(`nav.${value}`, { defaultValue: value })} />
                    {(skillFilter === 'all' ? Object.keys(SKILL_COLORS) : [skillFilter]).map(skill => (
                      <Line key={skill} type="monotone" dataKey={skill} stroke={SKILL_COLORS[skill]} strokeWidth={2} activeDot={{ r: 8 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartContainerFull}>
              <h3>{t('dashboard.skillDistribution')}</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={skillDistData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                      {skillDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SKILL_COLORS[entry.name] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend formatter={value => t(`nav.${value}`, { defaultValue: value })} />
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
