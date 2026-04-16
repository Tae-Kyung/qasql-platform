"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { QueryLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 20;

interface LogsFilters {
  success: string;
  date_from: string;
  date_to: string;
}

interface LogsClientProps {
  projectId: string;
  logs: QueryLog[];
  totalCount: number;
  currentPage: number;
  filters: LogsFilters;
}

const SUCCESS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "true", label: "성공만" },
  { value: "false", label: "실패만" },
];

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return "-";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export function LogsClient({
  projectId,
  logs,
  totalCount,
  currentPage,
  filters,
}: LogsClientProps) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const [successFilter, setSuccessFilter] = useState(filters.success);
  const [dateFrom, setDateFrom] = useState(filters.date_from);
  const [dateTo, setDateTo] = useState(filters.date_to);
  const [selectedLog, setSelectedLog] = useState<QueryLog | null>(null);

  const buildSearchParams = useCallback(
    (overrides: Partial<LogsFilters & { page: number }>) => {
      const params = new URLSearchParams();
      const page = overrides.page ?? 1;
      const success = overrides.success ?? successFilter;
      const df = overrides.date_from ?? dateFrom;
      const dt = overrides.date_to ?? dateTo;

      if (page > 1) params.set("page", String(page));
      if (success) params.set("success", success);
      if (df) params.set("date_from", df);
      if (dt) params.set("date_to", dt);

      const qs = params.toString();
      return qs ? `?${qs}` : "";
    },
    [successFilter, dateFrom, dateTo]
  );

  function applyFilters() {
    const params = new URLSearchParams();
    if (successFilter) params.set("success", successFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const qs = params.toString();
    router.push(`/projects/${projectId}/logs${qs ? `?${qs}` : ""}`);
  }

  function resetFilters() {
    setSuccessFilter("");
    setDateFrom("");
    setDateTo("");
    router.push(`/projects/${projectId}/logs`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (filters.success) params.set("success", filters.success);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    const qs = params.toString();
    router.push(`/projects/${projectId}/logs${qs ? `?${qs}` : ""}`);
  }

  function exportCsv() {
    const headers = [
      "시간",
      "질문",
      "SQL",
      "신뢰도(%)",
      "실행여부",
      "성공",
      "응답시간(ms)",
    ];
    const rows = logs.map((log) => [
      log.created_at ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss") : "",
      `"${(log.question ?? "").replace(/"/g, '""')}"`,
      `"${(log.generated_sql ?? "").replace(/"/g, '""')}"`,
      log.confidence != null ? String(Math.round(log.confidence * 100)) : "",
      log.executed ? "O" : "X",
      log.success ? "성공" : "실패",
      log.latency_ms != null ? String(log.latency_ms) : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-logs-page${currentPage}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <Input
              label="시작 날짜"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Input
              label="종료 날짜"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="w-36">
            <Select
              label="결과 필터"
              value={successFilter}
              options={SUCCESS_OPTIONS}
              onChange={(e) => setSuccessFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={applyFilters}>
              적용
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              초기화
            </Button>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              CSV 내보내기
            </Button>
          </div>
        </div>
      </div>

      {/* 결과 요약 */}
      <div className="text-sm text-gray-500">
        전체 <span className="font-medium text-gray-800">{totalCount}</span>건
      </div>

      {/* 로그 테이블 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            조건에 맞는 쿼리 로그가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    시간
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    질문
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    SQL
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    신뢰도
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 whitespace-nowrap">
                    실행
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 whitespace-nowrap">
                    결과
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    응답시간
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {log.created_at
                        ? format(new Date(log.created_at), "MM-dd HH:mm:ss")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-xs">
                      {truncate(log.question, 100)}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 max-w-xs">
                      {truncate(log.generated_sql, 50)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {log.confidence != null
                        ? `${Math.round(log.confidence * 100)}%`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.executed ? (
                        <span className="text-green-600 font-medium">O</span>
                      ) : (
                        <span className="text-gray-400">X</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={log.success ? "success" : "error"}>
                        {log.success ? "성공" : "실패"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                      {log.latency_ms != null ? `${log.latency_ms}ms` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            다음
          </Button>
        </div>
      )}

      {/* 상세 모달 */}
      <Modal
        open={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        title="쿼리 로그 상세"
        className="max-w-2xl"
      >
        {selectedLog && <LogDetail log={selectedLog} />}
      </Modal>
    </div>
  );
}

function LogDetail({ log }: { log: QueryLog }) {
  return (
    <div className="space-y-4 overflow-y-auto max-h-[70vh]">
      {/* 질문 */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          질문
        </h3>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {log.question ?? "-"}
        </p>
      </section>

      {/* SQL */}
      {log.generated_sql && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            생성된 SQL
          </h3>
          <pre className="bg-gray-900 text-green-400 text-xs rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
            {log.generated_sql}
          </pre>
        </section>
      )}

      {/* Reasoning */}
      {log.reasoning && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Reasoning
          </h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {log.reasoning}
          </p>
        </section>
      )}

      {/* 메트릭 */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          실행 정보
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <MetricRow
            label="신뢰도"
            value={
              log.confidence != null
                ? `${Math.round(log.confidence * 100)}%`
                : "-"
            }
          />
          <MetricRow
            label="응답시간"
            value={log.latency_ms != null ? `${log.latency_ms}ms` : "-"}
          />
          <MetricRow
            label="토큰 사용량"
            value={
              log.llm_tokens_used != null ? String(log.llm_tokens_used) : "-"
            }
          />
          <MetricRow
            label="결과"
            value={
              <Badge variant={log.success ? "success" : "error"}>
                {log.success ? "성공" : "실패"}
              </Badge>
            }
          />
          <MetricRow
            label="실행 여부"
            value={log.executed ? "실행됨" : "미실행"}
          />
          {log.row_count != null && (
            <MetricRow label="행 수" value={`${log.row_count}행`} />
          )}
          {log.candidates_tried != null && (
            <MetricRow
              label="후보 시도"
              value={`${log.candidates_tried}개`}
            />
          )}
          {log.candidates_succeeded != null && (
            <MetricRow
              label="후보 성공"
              value={`${log.candidates_succeeded}개`}
            />
          )}
        </div>
      </section>

      {/* 에러 코드 */}
      {log.error_code && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            에러 코드
          </h3>
          <Badge variant="error">{log.error_code}</Badge>
        </section>
      )}

      {/* 시각 */}
      <section>
        <p className="text-xs text-gray-400">
          {log.created_at
            ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")
            : ""}
        </p>
      </section>
    </div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500 min-w-[80px]">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
