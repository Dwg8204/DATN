import React, { useState, useEffect, useMemo } from 'react';
import ProfileSidebar from '../components/ProfileSidebar';
import { getHistoryEntries } from '../../../utils/historyStorage';
import { 
  getFilteredEntries, 
  calcSkillDistribution, 
  calcScoreOverTime, 
  calcCorrectWrongBar, 
  calcStreak,
  calcGoalChartData
} from '../../../utils/dashboardUtils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
  ComposedChart
} from 'recharts';
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
  
  // Goal state
  const [goalConfig, setGoalConfig] = useState(() => {
    const saved = localStorage.getItem('aptimate.dashboard_goal');
    return saved ? JSON.parse(saved) : { active: false, startDate: new Date().toISOString(), durationDays: 30, targetPerSkill: 2 };
  });

  const [tempGoalTarget, setTempGoalTarget] = useState(goalConfig.targetPerSkill);
  const [tempGoalDays, setTempGoalDays] = useState(goalConfig.durationDays);

  useEffect(() => {
    setEntries(getHistoryEntries());
  }, []);

  const filteredEntries = useMemo(() => {
    return getFilteredEntries(entries, { skill: skillFilter, part: partFilter, dateRange: dateFilter });
  }, [entries, skillFilter, partFilter, dateFilter]);

  // Derived stats
  const totalTests = filteredEntries.length;
  const streak = calcStreak(entries);
  
  const mostActiveSkill = useMemo(() => {
    const dist = calcSkillDistribution(filteredEntries);
    if (dist.length === 0) return 'N/A';
    return dist.sort((a, b) => b.value - a.value)[0].name;
  }, [filteredEntries]);

  // Two separate averages
  const mcqEntries = filteredEntries.filter(e => ['listening', 'reading', 'grammar'].includes(e.skill));
  const criteriaEntries = filteredEntries.filter(e => ['speaking', 'writing'].includes(e.skill));

  const avgMcqAccuracy = mcqEntries.length > 0 
    ? Math.round(mcqEntries.reduce((sum, e) => sum + (e.total > 0 ? (e.correct / e.total) * 100 : 0), 0) / mcqEntries.length)
    : 0;

  const avgCriteriaScore = criteriaEntries.length > 0
    ? Math.round(criteriaEntries.reduce((sum, e) => {
        const avg = e.criteria?.reduce((s, c) => s + c.score, 0) / (e.criteria?.length || 1) || 0;
        return sum + avg;
      }, 0) / criteriaEntries.length)
    : 0;

  // Chart data
  const scoreOverTimeData = useMemo(() => calcScoreOverTime(filteredEntries), [filteredEntries]);
  const skillDistData = useMemo(() => calcSkillDistribution(filteredEntries), [filteredEntries]);
  const correctWrongData = useMemo(() => calcCorrectWrongBar(filteredEntries), [filteredEntries]);
  const goalChartData = useMemo(() => calcGoalChartData(entries, goalConfig), [entries, goalConfig]);

  const handleSaveGoal = () => {
    const newConfig = {
      active: true,
      startDate: new Date().toISOString(),
      durationDays: Number(tempGoalDays),
      targetPerSkill: Number(tempGoalTarget)
    };
    setGoalConfig(newConfig);
    localStorage.setItem('aptimate.dashboard_goal', JSON.stringify(newConfig));
  };

  const handleDeactivateGoal = () => {
    const newConfig = { ...goalConfig, active: false };
    setGoalConfig(newConfig);
    localStorage.setItem('aptimate.dashboard_goal', JSON.stringify(newConfig));
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="dashboard" />
        
        <div className={styles.content}>
          <h1 className={styles.title}>Dashboard</h1>

          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Skill:</label>
              <select className={styles.select} value={skillFilter} onChange={(e) => { setSkillFilter(e.target.value); setPartFilter('all'); }}>
                <option value="all">All Skills</option>
                <option value="listening">Listening</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
                <option value="grammar">Grammar & Vocab</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>Part:</label>
              <select className={styles.select} value={partFilter} onChange={(e) => setPartFilter(e.target.value)}>
                <option value="all">All Parts</option>
                <option value="full">Full Test</option>
                <option value="part1">Part 1</option>
                <option value="part2">Part 2</option>
                <option value="part3">Part 3</option>
                <option value="part4">Part 4</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Date Range:</label>
              <select className={styles.select} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="all">All Time</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>
          </div>

          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <span className={styles.cardTitle}>Total Tests</span>
              <span className={styles.cardValue}>{totalTests}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardTitle}>Avg Accuracy (MCQ)</span>
              <span className={styles.cardValue}>{avgMcqAccuracy}%</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardTitle}>Avg Score (Criteria)</span>
              <span className={styles.cardValue}>{avgCriteriaScore}%</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardTitle}>Best Streak</span>
              <span className={styles.cardValue}>{streak} days</span>
            </div>
          </div>

          <div className={styles.chartsGrid}>
            <div className={`${styles.chartContainer} ${styles.fullWidthChart}`}>
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
                      <Line key={skill} type="monotone" dataKey={skill} stroke={SKILL_COLORS[skill]} activeDot={{ r: 8 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartContainer}>
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

            <div className={styles.chartContainer}>
              <h3>Correct/Wrong/Skipped (MCQ)</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={correctWrongData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{fontSize: 10}} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="correct" stackId="a" fill="#43B75D" />
                    <Bar dataKey="wrong" stackId="a" fill="#DA1E21" />
                    <Bar dataKey="skipped" stackId="a" fill="#aaa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className={styles.goalSection}>
            <div className={styles.goalHeader}>
              <h3>Learning Goal Tracker</h3>
              {goalConfig.active ? (
                <button className={styles.btnSecondary} onClick={handleDeactivateGoal}>Deactivate Goal</button>
              ) : null}
            </div>

            {!goalConfig.active ? (
              <div>
                <p style={{marginBottom: 16}}>Set a goal to practice full tests for each skill over a specific number of days.</p>
                <div className={styles.goalSettings}>
                  <span>Target: </span>
                  <input type="number" min="1" value={tempGoalTarget} onChange={(e) => setTempGoalTarget(e.target.value)} />
                  <span> full tests per skill in </span>
                  <input type="number" min="1" value={tempGoalDays} onChange={(e) => setTempGoalDays(e.target.value)} />
                  <span> days.</span>
                  <button className={styles.btnPrimary} onClick={handleSaveGoal}>Activate</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{marginBottom: 16}}>
                  Goal Active: {goalConfig.targetPerSkill} full tests per skill over {goalConfig.durationDays} days.
                </p>
                <div className={styles.chartWrapper} style={{height: 400}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={goalChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" label={{ value: 'Tests Today', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 1']} label={{ value: 'Last Activity (Tests)', angle: 90, position: 'insideRight' }} />
                      <Tooltip />
                      <Legend />
                      
                      {/* Bars for daily count */}
                      {Object.keys(SKILL_COLORS).map(skill => (
                        <Bar key={`${skill}_bar`} yAxisId="left" dataKey={`${skill}_bar`} stackId="a" fill={SKILL_COLORS[skill]} name={`${skill} (Today)`} />
                      ))}

                      {/* Lines for last activity */}
                      {Object.keys(SKILL_COLORS).map(skill => (
                        <Line key={`${skill}_line`} yAxisId="right" type="stepAfter" dataKey={`${skill}_line`} stroke={SKILL_COLORS[skill]} strokeWidth={3} name={`${skill} (Trend)`} connectNulls />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
