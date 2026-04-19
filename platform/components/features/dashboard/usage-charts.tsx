"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useTheme } from "next-themes";

interface DailyData {
  date: string;
  total: number;
  success: number;
  failed: number;
}

interface SuccessRate {
  success: number;
  failed: number;
}

interface UsageChartsProps {
  dailyData: DailyData[];
  successRate: SuccessRate;
  avgLatencyMs: number | null;
  avgConfidence: number | null;
}

const PIE_COLORS = ["#22c55e", "#ef4444"];

interface PieTooltipPayloadItem {
  name: string;
  value: number;
}

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: PieTooltipPayloadItem[];
}

function CustomPieTooltip({ active, payload }: CustomPieTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 dark:text-slate-300">{item.name}</p>
      <p className="text-gray-600 dark:text-slate-400">{item.value.toLocaleString()}건</p>
    </div>
  );
}

interface PieLabelProps {
  cx: number;
  cy: number;
  successRate: number;
  isDark: boolean;
}

function PieCenterLabel({ cx, cy, successRate, isDark }: PieLabelProps) {
  const textColor = isDark ? "#f1f5f9" : "#111827";
  const subColor = isDark ? "#94a3b8" : "#6b7280";
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fill={textColor} style={{ fontSize: 22, fontWeight: 700 }}>
        {successRate.toFixed(1)}%
      </tspan>
      <tspan x={cx} dy="1.4em" fill={subColor} style={{ fontSize: 12 }}>
        성공률
      </tspan>
    </text>
  );
}

export function UsageCharts({
  dailyData,
  successRate,
  avgLatencyMs,
  avgConfidence,
}: UsageChartsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const totalCalls = successRate.success + successRate.failed;
  const successRatePct = totalCalls > 0 ? (successRate.success / totalCalls) * 100 : 0;

  const pieData = [
    { name: "성공", value: successRate.success },
    { name: "실패", value: successRate.failed },
  ];

  const axisTickColor = isDark ? "#94a3b8" : "#6b7280";
  const gridColor = isDark ? "#334155" : "#f0f0f0";
  const tooltipStyle = {
    fontSize: 12,
    border: isDark ? "1px solid #334155" : "1px solid #e5e7eb",
    borderRadius: 6,
    backgroundColor: isDark ? "#1e293b" : "#ffffff",
    color: isDark ? "#f1f5f9" : "#111827",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  };

  return (
    <div className="space-y-6">
      {/* 숫자 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <p className="text-sm text-gray-500 dark:text-slate-400">평균 응답시간</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {avgLatencyMs !== null ? `${Math.round(avgLatencyMs).toLocaleString()} ms` : "-"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-slate-400">평균 신뢰도</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {avgConfidence !== null ? `${(avgConfidence * 100).toFixed(1)}%` : "-"}
          </p>
        </Card>
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 일별 API 호출 수 라인 차트 */}
        <Card title="일별 API 호출 수 (최근 30일)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: axisTickColor }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: axisTickColor }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, color: axisTickColor }} />
              <Line
                type="monotone"
                dataKey="total"
                name="전체"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="success"
                name="성공"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* 성공률 파이 차트 */}
        <Card title="성공/실패 비율">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
                <PieCenterLabel cx={0} cy={0} successRate={successRatePct} isDark={isDark} />
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, color: axisTickColor }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
