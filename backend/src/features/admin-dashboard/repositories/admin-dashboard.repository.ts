import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  DashboardBucket, DashboardBucketRow, DashboardComponentBucketRow, DashboardRange,
} from '../types/admin-dashboard.type';

type DashboardTotals = {
  active_current: string;
  active_previous: string;
  users_current: string;
  users_previous: string;
};

@Injectable()
export class AdminDashboardRepository {
  constructor(private readonly dataSource: DataSource) {}

  async totals(range: DashboardRange): Promise<DashboardTotals> {
    const rows = await this.dataSource.query<DashboardTotals[]>(
      `SELECT
         (SELECT count(DISTINCT student_id) FROM test_attempts
          WHERE started_at >= $1 AND started_at < $2)::text AS active_current,
         (SELECT count(DISTINCT student_id) FROM test_attempts
          WHERE started_at >= $3 AND started_at < $4)::text AS active_previous,
         (SELECT count(*) FROM users u JOIN roles r ON r.id=u.role_id
          WHERE r.code <> 'ADMIN' AND u.created_at >= $1 AND u.created_at < $2)::text AS users_current,
         (SELECT count(*) FROM users u JOIN roles r ON r.id=u.role_id
          WHERE r.code <> 'ADMIN' AND u.created_at >= $3 AND u.created_at < $4)::text AS users_previous`,
      [range.start, range.end, range.comparisonStart, range.comparisonEnd],
    );
    return rows[0];
  }

  activeLearnerTrend(range: DashboardRange): Promise<DashboardBucketRow[]> {
    return this.dataSource.query<DashboardBucketRow[]>(
      `SELECT ${this.bucketExpression('started_at', range.bucket)} AS bucket,
              count(DISTINCT student_id)::text AS value
       FROM test_attempts
       WHERE started_at >= $1 AND started_at < $2
       GROUP BY bucket ORDER BY bucket`,
      [range.start, range.end],
    );
  }

  newUserTrend(range: DashboardRange): Promise<DashboardBucketRow[]> {
    return this.dataSource.query<DashboardBucketRow[]>(
      `SELECT ${this.bucketExpression('u.created_at', range.bucket)} AS bucket, count(*)::text AS value
       FROM users u JOIN roles r ON r.id=u.role_id
       WHERE r.code <> 'ADMIN' AND u.created_at >= $1 AND u.created_at < $2
       GROUP BY bucket ORDER BY bucket`,
      [range.start, range.end],
    );
  }

  testsCreated(range: DashboardRange): Promise<DashboardComponentBucketRow[]> {
    return this.dataSource.query<DashboardComponentBucketRow[]>(
      `SELECT ${this.bucketExpression('created_at', range.bucket)} AS bucket,
              component, count(*)::text AS value
       FROM tests WHERE created_at >= $1 AND created_at < $2
       GROUP BY bucket, component ORDER BY bucket, component`,
      [range.start, range.end],
    );
  }

  testActivity(range: DashboardRange): Promise<DashboardComponentBucketRow[]> {
    return this.dataSource.query<DashboardComponentBucketRow[]>(
      `SELECT ${this.bucketExpression('started_at', range.bucket)} AS bucket,
              component, count(*)::text AS value
       FROM test_attempts WHERE started_at >= $1 AND started_at < $2
       GROUP BY bucket, component ORDER BY bucket, component`,
      [range.start, range.end],
    );
  }

  private bucketExpression(column: string, bucket: DashboardBucket): string {
    return `date_trunc('${bucket}', ${column} AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok'`;
  }
}
