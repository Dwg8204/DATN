export function getFilteredEntries(entries, { skill, part, dateRange }) {
  const now = new Date();
  
  return entries.filter(entry => {
    if (skill !== 'all' && entry.skill !== skill) return false;
    if (part !== 'all' && entry.mode !== part && !(part === 'full' && entry.mode === 'full')) return false;
    
    if (dateRange !== 'all') {
      const entryDate = new Date(entry.submittedAt);
      const diffTime = Math.abs(now - entryDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (dateRange === '7' && diffDays > 7) return false;
      if (dateRange === '30' && diffDays > 30) return false;
      if (dateRange === '90' && diffDays > 90) return false;
    }
    
    return true;
  });
}

export function calcSkillDistribution(entries) {
  const counts = entries.reduce((acc, entry) => {
    acc[entry.skill] = (acc[entry.skill] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function calcScoreOverTime(entries, skillFilter = 'all') {
  // Group by date
  const grouped = {};
  entries.forEach(entry => {
    const dateStr = new Date(entry.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    if (!grouped[dateStr]) grouped[dateStr] = {};
    
    if (!grouped[dateStr][entry.skill]) {
      grouped[dateStr][entry.skill] = { total: 0, count: 0 };
    }
    
    let score = 0;
    if (['listening', 'reading', 'grammar'].includes(entry.skill)) {
      score = entry.total > 0 ? (entry.correct / entry.total) * 100 : 0;
    } else {
      score = entry.criteria?.reduce((sum, c) => sum + c.score, 0) / (entry.criteria?.length || 1) || 0;
    }
    
    grouped[dateStr][entry.skill].total += score;
    grouped[dateStr][entry.skill].count += 1;
  });

  // Convert to array and calculate average
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    const [da, ma] = a.split('/');
    const [db, mb] = b.split('/');
    return new Date(`2026-${ma}-${da}`) - new Date(`2026-${mb}-${db}`);
  });

  const chartData = sortedDates.map(date => {
    const dataPoint = { date };
    for (const skill in grouped[date]) {
      if (skillFilter === 'all' || skill === skillFilter) {
        dataPoint[skill] = Math.round(grouped[date][skill].total / grouped[date][skill].count);
      }
    }
    return dataPoint;
  });

  // Inject fake data from 01/09 to 03/09 for visualization purposes
  let fakeData = [
    { date: '01/09', listening: 62, reading: 55 },
    { date: '02/09', speaking: 70, writing: 65 },
    { date: '03/09', grammar: 58, listening: 68 },
  ];

  if (skillFilter !== 'all') {
    fakeData = fakeData.map(item => {
      const newItem = { date: item.date };
      if (item[skillFilter] !== undefined) newItem[skillFilter] = item[skillFilter];
      return newItem;
    });
  }
  
  // Merge fake data with real data (prepend fake data)
  return [...fakeData, ...chartData];
}

export function calcAvgBand(entries) {
  if (entries.length === 0) return 'N/A';
  
  const bandValues = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
  const bandNames = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2' };
  
  let total = 0;
  let count = 0;
  
  entries.forEach(entry => {
    if (entry.cefrLevel && bandValues[entry.cefrLevel]) {
      total += bandValues[entry.cefrLevel];
      count++;
    }
  });
  
  if (count === 0) return 'N/A';
  
  const avg = Math.round(total / count);
  return bandNames[avg] || 'N/A';
}

export function calcBestSkill(entries) {
  if (entries.length === 0) return { name: 'N/A', band: '' };
  
  const bandValues = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
  const bandNames = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2' };
  
  const skillTotals = {};
  const skillCounts = {};
  
  entries.forEach(entry => {
    if (entry.cefrLevel && bandValues[entry.cefrLevel]) {
      skillTotals[entry.skill] = (skillTotals[entry.skill] || 0) + bandValues[entry.cefrLevel];
      skillCounts[entry.skill] = (skillCounts[entry.skill] || 0) + 1;
    }
  });
  
  let bestSkill = 'N/A';
  let bestAvg = 0;
  
  for (const skill in skillTotals) {
    const avg = skillTotals[skill] / skillCounts[skill];
    if (avg > bestAvg) {
      bestAvg = avg;
      bestSkill = skill;
    }
  }
  
  return { 
    name: bestSkill !== 'N/A' ? bestSkill.charAt(0).toUpperCase() + bestSkill.slice(1) : 'N/A', 
    band: bestAvg > 0 ? bandNames[Math.round(bestAvg)] : '' 
  };
}

export function calcWeakSkill(entries) {
  if (entries.length === 0) return { name: 'N/A', band: '' };
  
  const bandValues = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
  const bandNames = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2' };
  
  const skillTotals = {};
  const skillCounts = {};
  
  entries.forEach(entry => {
    if (entry.cefrLevel && bandValues[entry.cefrLevel]) {
      skillTotals[entry.skill] = (skillTotals[entry.skill] || 0) + bandValues[entry.cefrLevel];
      skillCounts[entry.skill] = (skillCounts[entry.skill] || 0) + 1;
    }
  });
  
  let weakSkill = 'N/A';
  let weakAvg = 999;
  
  for (const skill in skillTotals) {
    const avg = skillTotals[skill] / skillCounts[skill];
    if (avg < weakAvg) {
      weakAvg = avg;
      weakSkill = skill;
    }
  }
  
  return { 
    name: weakSkill !== 'N/A' ? weakSkill.charAt(0).toUpperCase() + weakSkill.slice(1) : 'N/A',
    band: weakAvg < 999 ? bandNames[Math.round(weakAvg)] : ''
  };
}

export function calcGoalProgress(entries, goalConfig) {
  if (!goalConfig || !goalConfig.active) return { currentBandEst: 'N/A', completedTests: 0, totalHours: 0 };
  
  const startDate = new Date(goalConfig.startDate);
  startDate.setHours(0,0,0,0);
  
  const relevantEntries = entries.filter(e => e.mode === 'full' && new Date(e.submittedAt) >= startDate);
  
  const completedTests = relevantEntries.length;
  const currentBandEst = calcAvgBand(relevantEntries);
  
  // Calculate total hours from timeSpent (format: "HH:mm:ss")
  let totalHours = 0;
  relevantEntries.forEach(entry => {
    if (entry.timeSpent) {
      const parts = entry.timeSpent.split(':');
      if (parts.length === 3) {
        totalHours += parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60 + parseInt(parts[2], 10) / 3600;
      }
    }
  });
  
  return {
    currentBandEst: currentBandEst !== 'N/A' ? `Band ${currentBandEst}` : 'N/A',
    completedTests,
    totalHours: Number(totalHours.toFixed(2))
  };
}

export function calcCorrectWrongBar(entries) {
  const mcqEntries = entries.filter(e => ['listening', 'reading', 'grammar'].includes(e.skill));
  
  // Group by test name + date (to keep it unique if same test taken twice)
  return mcqEntries.slice(0, 15).map(entry => {
    const dateStr = new Date(entry.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    return {
      name: `${entry.skill} ${dateStr}`,
      correct: entry.correct || 0,
      wrong: entry.wrong || 0,
      skipped: entry.skipped || 0,
      originalDate: entry.submittedAt
    };
  }).sort((a, b) => new Date(a.originalDate) - new Date(b.originalDate));
}

export function calcStreak(entries) {
  if (entries.length === 0) return 0;
  
  // Get unique dates
  const dates = [...new Set(entries.map(e => new Date(e.submittedAt).toLocaleDateString()))]
    .map(d => new Date(d))
    .sort((a, b) => b - a); // Descending

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentDate = dates[0];
  
  // If last activity is older than yesterday, streak is 0
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (currentDate < yesterday) return 0;

  for (let i = 1; i < dates.length; i++) {
    const diff = (currentDate - dates[i]) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
      currentDate = dates[i];
    } else {
      break;
    }
  }
  return streak;
}

export function calcGoalChartData(entries, goalConfig) {
  if (!goalConfig || !goalConfig.active) return [];
  
  const startDate = new Date(goalConfig.startDate);
  startDate.setHours(0,0,0,0);
  
  // Generate date array
  const dates = [];
  for (let i = 0; i < goalConfig.durationDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  // Aggregate fulltests per day per skill
  const fullTests = entries.filter(e => e.mode === 'full');
  const aggregated = {};
  
  fullTests.forEach(test => {
    const d = new Date(test.submittedAt);
    d.setHours(0,0,0,0);
    const dateStr = d.toISOString();
    
    if (!aggregated[dateStr]) aggregated[dateStr] = {};
    aggregated[dateStr][test.skill] = (aggregated[dateStr][test.skill] || 0) + 1;
  });

  // Build chart data
  const chartData = [];
  const skills = ['listening', 'reading', 'writing', 'speaking', 'grammar'];
  const lastActivity = {};
  
  // Initialize last activity tracker
  skills.forEach(s => lastActivity[s] = { count: 0, daysSince: 5 });

  dates.forEach(d => {
    const dateStr = d.toISOString();
    const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    const dayData = { date: formattedDate, fullDate: d };
    
    skills.forEach(skill => {
      const todayCount = aggregated[dateStr]?.[skill] || 0;
      dayData[`${skill}_bar`] = todayCount;
      
      if (todayCount > 0) {
        lastActivity[skill] = { count: todayCount, daysSince: 0 };
        dayData[`${skill}_line`] = todayCount;
      } else {
        lastActivity[skill].daysSince++;
        if (lastActivity[skill].daysSince < 5) {
          dayData[`${skill}_line`] = lastActivity[skill].count;
        } else {
          dayData[`${skill}_line`] = 0;
          lastActivity[skill].count = 0;
        }
      }
    });
    chartData.push(dayData);
  });

  // Filter out future dates from showing in the line (optional, but good for UI)
  const now = new Date();
  now.setHours(0,0,0,0);
  
  return chartData.map(d => {
    if (d.fullDate > now) {
      skills.forEach(s => delete d[`${s}_line`]);
    }
    delete d.fullDate;
    return d;
  });
}
