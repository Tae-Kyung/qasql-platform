import { getCurrentUserOrRedirect } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { UsageCharts } from "@/components/features/dashboard/usage-charts";
import { format, subDays } from "date-fns";
import { getServerT } from "@/lib/i18n/server";

interface QueryLogRow {
  id: string;
  question: string | null;
  generated_sql: string | null;
  success: boolean;
  confidence: number | null;
  created_at: string;
}

interface QueryLogWithLatency {
  success: boolean;
  latency_ms: number | null;
  confidence: number | null;
  created_at: string;
}

export default async function DashboardPage() {
  const [user, t] = await Promise.all([getCurrentUserOrRedirect(), getServerT()]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createServiceClient();

  // 프로젝트 수
  const { count: projectCount } = await supabase
    .from("qasql_projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // 이번달 API 호출 수
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count: monthlyApiCount } = await supabase
    .from("qasql_query_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthStart);

  // 평균 신뢰도 (성공한 것만)
  const { data: confidenceData } = await supabase
    .from("qasql_query_logs")
    .select("confidence")
    .eq("success", true)
    .not("confidence", "is", null);

  const avgConfidence =
    confidenceData && (confidenceData as { confidence: number | null }[]).length > 0
      ? (confidenceData as { confidence: number | null }[]).reduce(
          (sum: number, r: { confidence: number | null }) => sum + (r.confidence ?? 0),
          0
        ) / (confidenceData as { confidence: number | null }[]).length
      : null;

  // 최근 쿼리 로그 5건
  const { data: recentLogs } = await supabase
    .from("qasql_query_logs")
    .select("id, question, generated_sql, success, confidence, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const typedLogs: QueryLogRow[] = recentLogs ?? [];

  // ── 차트용 데이터 ─────────────────────────────────────────

  // 최근 30일 로그 전체 조회 (날짜별 집계 + 평균 응답시간 계산용)
  const thirtyDaysAgo = subDays(now, 30);
  const { data: logsRaw } = await supabase
    .from("qasql_query_logs")
    .select("success, latency_ms, confidence, created_at")
    .gte("created_at", thirtyDaysAgo.toISOString());

  const logs30: QueryLogWithLatency[] = logsRaw ?? [];

  // 날짜별 집계 (빈 날짜 0으로 채우기)
  const dateMap = new Map<string, { total: number; success: number; failed: number }>();

  // 최근 30일 날짜 키 미리 생성 (0으로 초기화)
  for (let i = 29; i >= 0; i--) {
    const d = subDays(now, i);
    const key = format(d, "MM/dd");
    dateMap.set(key, { total: 0, success: 0, failed: 0 });
  }

  // 로그 집계
  for (const log of logs30) {
    const key = format(new Date(log.created_at), "MM/dd");
    const existing = dateMap.get(key);
    if (existing) {
      existing.total += 1;
      if (log.success) {
        existing.success += 1;
      } else {
        existing.failed += 1;
      }
    }
  }

  const dailyData = Array.from(dateMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  // 성공/실패 전체 합계 (30일)
  const successRate = logs30.reduce(
    (acc, log) => {
      if (log.success) acc.success += 1;
      else acc.failed += 1;
      return acc;
    },
    { success: 0, failed: 0 }
  );

  // 평균 응답시간 (30일, latency_ms 있는 것만)
  const latencyLogs = logs30.filter((l) => l.latency_ms !== null);
  const avgLatencyMs =
    latencyLogs.length > 0
      ? latencyLogs.reduce((sum, l) => sum + (l.latency_ms ?? 0), 0) / latencyLogs.length
      : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.dashboard.title}</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t.dashboard.projectCount}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{(projectCount as number | null) ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t.dashboard.monthlyApiCalls}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{(monthlyApiCount as number | null) ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t.dashboard.avgConfidence}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {avgConfidence !== null ? `${(avgConfidence * 100).toFixed(1)}%` : "-"}
          </p>
        </Card>
      </div>

      {/* 사용량 차트 */}
      <UsageCharts
        dailyData={dailyData}
        successRate={successRate}
        avgLatencyMs={avgLatencyMs}
        avgConfidence={avgConfidence}
      />

      {/* 최근 쿼리 로그 */}
      <Card title={t.dashboard.recentQueryLogs}>
        {typedLogs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">{t.dashboard.noLogs}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">{t.dashboard.col.question}</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">{t.dashboard.col.status}</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">{t.dashboard.col.confidence}</th>
                  <th className="text-left py-2 font-medium text-gray-600 dark:text-slate-400">{t.dashboard.col.datetime}</th>
                </tr>
              </thead>
              <tbody>
                {typedLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                    <td className="py-2 pr-4 text-gray-800 dark:text-slate-200 max-w-xs truncate">
                      {log.question ?? "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.success
                            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {log.success ? t.dashboard.success : t.dashboard.failed}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-slate-400">
                      {log.confidence !== null
                        ? `${(log.confidence * 100).toFixed(0)}%`
                        : "-"}
                    </td>
                    <td className="py-2 text-gray-500 dark:text-slate-500 text-xs">
                      {format(new Date(log.created_at), "MM/dd HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
