"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { CountItem } from "@/lib/analytics/aggregate";

const PALETTE = ["#d97706", "#b45309", "#f59e0b", "#fbbf24", "#92400e", "#ea580c", "#c2410c", "#78350f"];

type BarChartCardProps = {
  data: CountItem[];
  height?: number;
};

export function AnalyticsBarChart({ data, height = 320 }: BarChartCardProps) {
  if (data.length === 0) {
    return <EmptyState />;
  }
  const chartData = data.slice(0, 10).map((d) => ({ name: d.label, count: d.count }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          tick={{ fontSize: 12 }}
          interval={0}
        />
        <Tooltip cursor={{ fill: "rgba(217,119,6,0.08)" }} />
        <Bar dataKey="count" fill="#d97706" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AnalyticsPieChart({ data, height = 320 }: BarChartCardProps) {
  if (data.length === 0) {
    return <EmptyState />;
  }
  const chartData = data.map((d) => ({ name: d.label, value: d.count }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
          ))}
        </Pie>
        <Legend verticalAlign="bottom" height={48} wrapperStyle={{ fontSize: 12 }} />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyState() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-stone-400">
      Not enough data yet.
    </div>
  );
}
