import { Injectable } from '@nestjs/common';
import { dashboardBucketKey, dashboardBuckets, dashboardRange } from '../helpers/dashboard-period.helper';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository';
import {
  AdminDashboardResponse, DashboardBucketRow, DashboardComponent, DashboardComponentBucketRow,
  DashboardMetric, DashboardPeriod, DashboardRange, DashboardSeriesPoint, DashboardTrendPoint,
} from '../types/admin-dashboard.type';

const COMPONENTS: DashboardComponent[] = ['READING', 'LISTENING', 'WRITING', 'GRAMMAR_VOCAB', 'SPEAKING'];
const CACHE_TTL_MS = 30_000;

type CacheEntry = { expiresAt: number; value: AdminDashboardResponse };

@Injectable()
export class AdminDashboardService {
  private readonly cache = new Map<DashboardPeriod, CacheEntry>();
  private readonly pending = new Map<DashboardPeriod, Promise<AdminDashboardResponse>>();

  constructor(private readonly repository: AdminDashboardRepository) {}

  get(period: DashboardPeriod): Promise<AdminDashboardResponse> {
    const cached = this.cache.get(period);
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);
    const inFlight = this.pending.get(period);
    if (inFlight) return inFlight;

    const request = this.load(period)
      .then(value => {
        this.cache.set(period, { value, expiresAt: Date.now() + CACHE_TTL_MS });
        return value;
      })
      .finally(() => this.pending.delete(period));
    this.pending.set(period, request);
    return request;
  }

  private async load(period: DashboardPeriod): Promise<AdminDashboardResponse> {
    const range = dashboardRange(period);
    const [totals, activeTrend, usersTrend, testsCreated, testActivity] = await Promise.all([
      this.repository.totals(range),
      this.repository.activeLearnerTrend(range),
      this.repository.newUserTrend(range),
      this.repository.testsCreated(range),
      this.repository.testActivity(range),
    ]);
    return {
      period: {
        key: range.key,
        label: range.label,
        timezone: range.timezone,
        bucket: range.bucket,
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        comparisonStart: range.comparisonStart.toISOString(),
        comparisonEnd: range.comparisonEnd.toISOString(),
      },
      metrics: {
        activeLearners: this.metric(Number(totals.active_current), Number(totals.active_previous), activeTrend, range),
        newUsers: this.metric(Number(totals.users_current), Number(totals.users_previous), usersTrend, range),
      },
      series: {
        testsCreated: this.componentSeries(testsCreated, range),
        testActivity: this.componentSeries(testActivity, range),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private metric(
    value: number,
    previousValue: number,
    rows: DashboardBucketRow[],
    range: DashboardRange,
  ): DashboardMetric {
    let changePercent: number | null;
    let changeLabel: string;
    if (previousValue === 0 && value > 0) {
      changePercent = null;
      changeLabel = 'New';
    } else {
      changePercent = previousValue === 0 ? 0 : Number((((value - previousValue) / previousValue) * 100).toFixed(1));
      changeLabel = `${changePercent > 0 ? '+' : ''}${changePercent}%`;
    }
    return { value, previousValue, changePercent, changeLabel, trend: this.trend(rows, range) };
  }

  private trend(rows: DashboardBucketRow[], range: DashboardRange): DashboardTrendPoint[] {
    const values = new Map(rows.map(row => [dashboardBucketKey(row.bucket, range.bucket), Number(row.value)]));
    return dashboardBuckets(range).map(bucket => ({ key: bucket.key, label: bucket.label, value: values.get(bucket.key) ?? 0 }));
  }

  private componentSeries(rows: DashboardComponentBucketRow[], range: DashboardRange): DashboardSeriesPoint[] {
    const values = new Map(rows.map(row => [
      `${dashboardBucketKey(row.bucket, range.bucket)}:${row.component}`,
      Number(row.value),
    ]));
    return dashboardBuckets(range).map(bucket => {
      const point = {
        key: bucket.key,
        label: bucket.label,
        GRAMMAR_VOCAB: 0,
        READING: 0,
        LISTENING: 0,
        WRITING: 0,
        SPEAKING: 0,
      };
      COMPONENTS.forEach(component => {
        point[component] = values.get(`${bucket.key}:${component}`) ?? 0;
      });
      return point;
    });
  }
}
