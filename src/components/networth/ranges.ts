import type { NetWorthGranularity } from '../../lib/repository';

export type NetWorthRange = '1M' | '3M' | '1Y';

export const RANGE_LABELS: Record<NetWorthRange, string> = {
  '1M': '1M',
  '3M': '3M',
  '1Y': '1Y',
};

export const RANGE_CONFIG: Record<NetWorthRange, { periods: number; granularity: NetWorthGranularity }> = {
  '1M': { periods: 30, granularity: 'day' },
  '3M': { periods: 90, granularity: 'day' },
  '1Y': { periods: 12, granularity: 'month' },
};
