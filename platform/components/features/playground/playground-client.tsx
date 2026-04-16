"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface PlaygroundResult {
  rows: Record<string, unknown>[];
  columns: string[];
  row_count: number;
}

interface PlaygroundClientProps {
  projectId: string;
  projectName: string;
  schemaStatus?: string;
  dbType?: string | null;
}

export function PlaygroundClient({ projectId, projectName, schemaStatus, dbType }: PlaygroundClientProps) {
  const isSchemaReady = schemaStatus === "done";
  const isSupabase = dbType === "supabase";
  const [question, setQuestion] = useState("");
  const [hint, setHint] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [editedSql, setEditedSql] = useState("");
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  async function handleGenerateSql() {
    if (!question.trim()) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setGeneratedSql(null);
    setEditedSql("");
    setConfidence(null);
    setReasoning(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/playground`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, hint: hint || undefined, execute: false }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message ?? data.error ?? "SQL 생성에 실패했습니다");
        return;
      }

      const sql = (data.sql as string | undefined) ?? "";
      setGeneratedSql(sql);
      setEditedSql(sql);
      setConfidence((data.confidence as number | undefined) ?? null);
      setReasoning((data.reasoning as string | undefined) ?? null);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExecuteSql() {
    if (!editedSql.trim()) return;

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/playground`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_sql: editedSql }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message ?? data.error ?? "SQL 실행에 실패했습니다");
        return;
      }

      setResult({
        rows: (data.rows as Record<string, unknown>[] | undefined) ?? [],
        columns: (data.columns as string[] | undefined) ?? [],
        row_count: (data.row_count as number | undefined) ?? 0,
      });
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setIsExecuting(false);
    }
  }

  function getConfidenceColor(value: number): string {
    if (value > 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (value > 0.5) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Playground</h1>
        <p className="mt-1 text-sm text-gray-500">{projectName} — 자연어로 데이터를 조회해보세요</p>
      </div>

      {/* 스키마 미완료 경고 */}
      {!isSchemaReady && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700 font-medium">스키마 분석이 필요합니다</p>
          <p className="text-xs text-amber-600 mt-1">스키마 탭에서 분석을 먼저 완료해야 정확한 SQL을 생성할 수 있습니다.</p>
        </div>
      )}

      {/* Supabase SQL 실행 안내 */}
      {isSupabase && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-700 font-medium">Supabase — SQL 복사 후 실행</p>
          <p className="text-xs text-blue-600 mt-1">생성된 SQL을 복사하여 Supabase 대시보드의 <strong>SQL Editor</strong>에서 실행하세요.</p>
        </div>
      )}

      {/* 입력 영역 */}
      <Card title="질문 입력">
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">자연어 질문</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: 지난 달 가장 많이 구매한 상품 10개를 알려줘"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white outline-none transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <Input
            label="힌트 (선택)"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="특정 테이블이나 조건 힌트 입력"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleGenerateSql}
              loading={isGenerating}
              disabled={!question.trim() || isGenerating}
            >
              SQL 생성
            </Button>
          </div>
        </div>
      </Card>

      {/* 결과 영역 — SQL이 생성된 후 표시 */}
      {generatedSql !== null && (
        <Card title="생성된 SQL">
          <div className="space-y-4">
            {/* 신뢰도 */}
            {confidence !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">신뢰도:</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${getConfidenceColor(confidence)}`}
                >
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            )}

            {/* Reasoning */}
            {reasoning && (
              <div className="rounded-md border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setReasoningExpanded((prev) => !prev)}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors rounded-md"
                >
                  <span>추론 과정</span>
                  <span className="text-gray-400">{reasoningExpanded ? "▲" : "▼"}</span>
                </button>
                {reasoningExpanded && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{reasoning}</p>
                  </div>
                )}
              </div>
            )}

            {/* SQL 편집 영역 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">SQL (편집 가능)</label>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(editedSql); }}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  복사
                </button>
              </div>
              <textarea
                value={editedSql}
                onChange={(e) => setEditedSql(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white font-mono outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleExecuteSql}
                loading={isExecuting}
                disabled={!editedSql.trim() || isExecuting}
                variant="outline"
              >
                SQL 실행
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 결과 테이블 */}
      {result && (
        <Card title={`실행 결과 (${result.row_count}행)`}>
          {result.columns.length === 0 ? (
            <p className="text-sm text-gray-500">반환된 데이터가 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {result.columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left font-medium text-gray-700 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50">
                      {result.columns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate"
                        >
                          {row[col] === null || row[col] === undefined
                            ? <span className="text-gray-400 italic">null</span>
                            : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
