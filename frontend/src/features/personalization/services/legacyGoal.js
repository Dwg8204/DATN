export const LEGACY_GOAL_KEY = 'aptimate.dashboard_goal';

export function readLegacyGoal(storage) {
  try {
    const saved = JSON.parse(storage.getItem(LEGACY_GOAL_KEY));
    if (!saved?.active) return null;
    const goal = { targetCefr: saved.targetBand, targetTests: Number(saved.targetTests), durationDays: Number(saved.durationDays) };
    if (!['A1', 'A2', 'B1', 'B2', 'C'].includes(goal.targetCefr) || !Number.isInteger(goal.targetTests) || goal.targetTests < 1 || goal.targetTests > 500 || !Number.isInteger(goal.durationDays) || goal.durationDays < 3 || goal.durationDays > 180) return null;
    return goal;
  } catch { return null; }
}
