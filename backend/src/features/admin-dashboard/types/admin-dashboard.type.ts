export const DASHBOARD_PERIODS = [
  'this-year',
  '12-months',
  '6-months',
  '30-days',
  'week',
  '24-hours',
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
export type DashboardBucket = 'month' | 'day' | 'hour';
export type DashboardComponent = 'GRAMMAR_VOCAB' | 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING';

export interface DashboardRange {
  key: DashboardPeriod;
  label: string;
  timezone: 'Asia/Bangkok';
  bucket: DashboardBucket;
  start: Date;
  end: Date;
  comparisonStart: Date;
  comparisonEnd: Date;
}

export interface DashboardTrendPoint {
  key: string;
  label: string;
  value: number;
}

export interface DashboardSeriesPoint extends Omit<DashboardTrendPoint, 'value'> {
  GRAMMAR_VOCAB: number;
  READING: number;
  LISTENING: number;
  WRITING: number;
  SPEAKING: number;
}

export interface DashboardMetric {
  value: number;
  previousValue: number;
  changePercent: number | null;
  changeLabel: string;
  trend: DashboardTrendPoint[];
}

export interface AdminDashboardResponse {
  period: {
    key: DashboardPeriod;
    label: string;
    timezone: string;
    bucket: DashboardBucket;
    start: string;
    end: string;
    comparisonStart: string;
    comparisonEnd: string;
  };
  metrics: {
    activeLearners: DashboardMetric;
    newUsers: DashboardMetric;
  };
  series: {
    testsCreated: DashboardSeriesPoint[];
    testActivity: DashboardSeriesPoint[];
  };
  generatedAt: string;
}

export interface DashboardBucketRow {
  bucket: Date | string;
  value: string;
}

export interface DashboardComponentBucketRow extends DashboardBucketRow {
  component: DashboardComponent;
}
