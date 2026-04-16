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
  const total = payload.reduce((sum: number, p: PieTooltipPayloadItem) => sum + p.value, 0);
  // total from outer scope via closure is not available here; recalculate via props is not possible
  // We'll show count + label only; percentage shown in center label
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-sm">
      <p className="font-medium text-gray-700">{item.name}</p>
      <p className="text-gray-600">{item.value.toLocaleString()}건</p>
    </div>
  );
}

interface PieLabelProps {
  cx: number;
  cy: number;
  successRate: number;
}

function PieCenterLabel({ cx, cy, successRate }: PieLabelProps) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" className="fill-gray-900" style={{ fontSize: 22, fontWeight: 700 }}>
        {successRate.toFixed(1)}%
      </tspan>
      <tspan x={cx} dy="1.4em" className="fill-gray-500" style={{ fontSize: 12 }}>
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
  const totalCalls = successRate.success + successRate.failed;
  const successRatePct = totalCalls > 0 ? (successRate.success / totalCalls) * 100 : 0;

  const pieData = [
    { name: "성공", value: successRate.success },
    { name: "실패", value: successRate.failed },
  ];

  return (
    <div className="space-y-6">
      {/* 숫자 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <p className="text-sm text-gray-500">평균 응답시간</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {avgLatencyMs !== null ? `${Math.round(avgLatencyMs).toLocaleString()} ms` : "-"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">평균 신뢰도</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
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
                <PieCenterLabel cx={0} cy={0} successRate={successRatePct} />
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
