"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/context";

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
  const { t } = useLanguage();
  const pg = t.projectDetail.playground;
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
        setError(data.message ?? data.error ?? pg.generateFailed);
        return;
      }

      const sql = (data.sql as string | undefined) ?? "";
      setGeneratedSql(sql);
      setEditedSql(sql);
      setConfidence((data.confidence as number | undefined) ?? null);
      setReasoning((data.reasoning as string | undefined) ?? null);
    } catch {
      setError(pg.networkError);
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
        setError(data.message ?? data.error ?? pg.executeFailed);
        return;
      }

      setResult({
        rows: (data.rows as Record<string, unknown>[] | undefined) ?? [],
        columns: (data.columns as string[] | undefined) ?? [],
        row_count: (data.row_count as number | undefined) ?? 0,
      });
    } catch {
      setError(pg.networkError);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{pg.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{projectName}{pg.subtitle}</p>
      </div>

      {/* 스키마 미완료 경고 */}
      {!isSchemaReady && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">{pg.schemaWarningTitle}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{pg.schemaWarningBody}</p>
        </div>
      )}

      {/* Supabase SQL 실행 안내 */}
      {isSupabase && (
        <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{pg.supabaseInfoTitle}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {pg.supabaseInfoBody} <strong>SQL Editor</strong>{pg.supabaseInfoBodySuffix}
          </p>
        </div>
      )}

      {/* 입력 영역 */}
      <Card title={pg.questionCard}>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{pg.questionLabel}</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={pg.questionPlaceholder}
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <Input
            label={pg.hintLabel}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder={pg.hintPlaceholder}
          />

          <div className="flex justify-end">
            <Button onClick={handleGenerateSql} loading={isGenerating} disabled={!question.trim() || isGenerating}>
              {pg.generateSql}
            </Button>
          </div>
        </div>
      </Card>

      {/* 생성된 SQL */}
      {generatedSql !== null && (
        <Card title={pg.generatedSqlCard}>
          <div className="space-y-4">
            {confidence !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-slate-400">{pg.confidenceLabel}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${getConfidenceColor(confidence)}`}>
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            )}

            {reasoning && (
              <div className="rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                <button
                  type="button"
                  onClick={() => setReasoningExpanded((prev) => !prev)}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors rounded-md"
                >
                  <span>{pg.reasoningTitle}</span>
                  <span className="text-gray-400 dark:text-slate-500">{reasoningExpanded ? "▲" : "▼"}</span>
                </button>
                {reasoningExpanded && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-wrap">{reasoning}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{pg.sqlLabel}</label>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(editedSql); }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2 py-1 rounded border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {pg.copy}
                </button>
              </div>
              <textarea
                value={editedSql}
                onChange={(e) => setEditedSql(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 font-mono outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleExecuteSql} loading={isExecuting} disabled={!editedSql.trim() || isExecuting} variant="outline">
                {pg.executeSql}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* 결과 테이블 */}
      {result && (
        <Card title={`${pg.resultCard} (${result.row_count})`}>
          {result.columns.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">{pg.noData}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col} className="px-4 py-2 text-left font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {result.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      {result.columns.map((col) => (
                        <td key={col} className="px-4 py-2 text-gray-700 dark:text-slate-300 whitespace-nowrap max-w-xs truncate">
                          {row[col] === null || row[col] === undefined
                            ? <span className="text-gray-400 dark:text-slate-500 italic">null</span>
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
