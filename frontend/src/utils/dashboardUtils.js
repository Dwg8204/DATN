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

  return chartData;
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

