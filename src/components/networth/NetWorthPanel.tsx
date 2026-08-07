import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { formatMoney } from '../../lib/money';
import './NetWorthPanel.css';

interface NetWorthPanelProps {
  current: number;
  series: { month: string; value: number }[];
}

export function NetWorthPanel({ current, series }: NetWorthPanelProps) {
  const chartData = series.map((s) => ({ month: s.month, value: s.value / 100 }));

  return (
    <div className="hero">
      <span className="heroLabel">Net worth</span>
      <span className="heroBig tabular">{formatMoney(current)}</span>
      <div className="heroChart">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--up)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--up)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
            <Area type="monotone" dataKey="value" stroke="var(--up)" strokeWidth={2} fill="url(#netWorthFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
