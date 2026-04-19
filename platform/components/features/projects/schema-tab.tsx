"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { SchemaStatus } from "@/types";

interface TableInfo {
  table_name: string;
  columns: { column_name: string; data_type: string }[];
}

interface ReadableName {
  table: string;
  column: string;
  readable: string;
}

interface SchemaTabProps {
  projectId: string;
  initialStatus: SchemaStatus;
}

const STEP_THRESHOLDS = [0, 3, 7, 14];

interface SchemaProgressProps {
  elapsed: number;
  stepLabels: string[];
  elapsedLabel: string;
}

function SchemaProgress({ elapsed, stepLabels, elapsedLabel }: SchemaProgressProps) {
  const stepIndex = STEP_THRESHOLDS.reduce((acc, threshold, i) => (elapsed >= threshold ? i : acc), 0);
  const nextThreshold = STEP_THRESHOLDS[stepIndex + 1] ?? STEP_THRESHOLDS[stepIndex] + 10;
  const stepStart = STEP_THRESHOLDS[stepIndex];
  const stepProgress = Math.min(100, ((elapsed - stepStart) / (nextThreshold - stepStart)) * 100);
  const totalProgress = Math.min(90, (stepIndex / stepLabels.length) * 100 + (stepProgress / stepLabels.length));

  return (
    <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg className="animate-spin h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{stepLabels[stepIndex]}...</span>
        <span className="ml-auto text-xs text-blue-500 dark:text-blue-400">{elapsed}{elapsedLabel}</span>
      </div>
      <div className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-full h-1.5 overflow-hidden">
        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${totalProgress}%` }} />
      </div>
      <div className="space-y-1.5">
        {stepLabels.map((label, i) => {
          const isDone = i < stepIndex;
          const isActive = i === stepIndex;
          return (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className={isDone ? "text-green-500 dark:text-green-400" : isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-slate-600"}>
                {isDone ? "✓" : isActive ? "›" : "○"}
              </span>
              <span className={isDone ? "text-green-600 dark:text-green-400 line-through" : isActive ? "text-blue-700 dark:text-blue-300 font-medium" : "text-gray-400 dark:text-slate-500"}>
                {label}
              </span>
              {isActive && <span className="text-blue-400 dark:text-blue-300">{Math.round(stepProgress)}%</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SchemaTab({ projectId, initialStatus }: SchemaTabProps) {
  const toast = useToast();
  const { t } = useLanguage();
  const s = t.projectDetail.schema;
  const [status, setStatus] = useState<SchemaStatus>(initialStatus);
  const [starting, setStarting] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [readableNames, setReadableNames] = useState<ReadableName[]>([]);
  const [savingNames, setSavingNames] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [savingSelection, setSavingSelection] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepLabels = [s.steps.connecting, s.steps.fetchingTables, s.steps.analyzingColumns, s.steps.savingSchema];

  useEffect(() => {
    if (status === "running") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/schema`);
      if (res.ok) {
        const json = await res.json();
        const loadedTables: TableInfo[] = (json.data?.tables ?? []).sort(
          (a: TableInfo, b: TableInfo) => a.table_name.localeCompare(b.table_name)
        );
        setTables(loadedTables);

        const rn: Record<string, Record<string, string>> = json.data?.readable_names ?? {};
        const flat: ReadableName[] = [];
        for (const [table, cols] of Object.entries(rn)) {
          for (const [column, readable] of Object.entries(cols as Record<string, string>)) {
            flat.push({ table, column, readable });
          }
        }
        if (flat.length > 0) setReadableNames(flat);

        const saved: string[] = json.data?.selected_tables ?? [];
        if (saved.length > 0) {
          setSelectedTables(new Set(saved));
        } else {
          setSelectedTables(new Set(loadedTables.map((tbl) => tbl.table_name)));
        }
      }
    } catch { /* ignore */ }
  }, [projectId]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/setup/status`);
      if (res.ok) {
        const json = await res.json();
        const newStatus: SchemaStatus = json.data?.schema_status ?? "none";
        setStatus(newStatus);
        if (newStatus === "done" || newStatus === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (newStatus === "done") fetchTables();
        }
      }
    } catch { /* ignore */ }
  }, [projectId, fetchTables]);

  useEffect(() => { if (status === "done") fetchTables(); }, [status, fetchTables]);

  useEffect(() => {
    const supabase = createClient();
    let realtimeWorking = false;

    const channel = supabase
      .channel("schema-" + projectId)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "qasql_project_configs", filter: `project_id=eq.${projectId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          realtimeWorking = true;
          const newStatus: SchemaStatus = payload.new?.schema_status ?? "none";
          setStatus(newStatus);
          if (newStatus === "done") fetchTables();
        }
      )
      .subscribe((state: string) => { if (state !== "SUBSCRIBED") return; realtimeWorking = true; });

    const fallbackTimer = setTimeout(() => {
      if (!realtimeWorking) pollingRef.current = setInterval(fetchStatus, 3000);
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(fallbackTimer);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [projectId, fetchStatus, fetchTables]);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/setup`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? s.analysisStartFailed);
      setStatus("running");
      toast.success(s.analysisStarted);
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(fetchStatus, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : s.analysisStartFailed);
    } finally {
      setStarting(false);
    }
  }

  function toggleTable(tableName: string) {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName);
      else next.add(tableName);
      return next;
    });
  }

  function toggleAll() {
    if (selectedTables.size === tables.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(tables.map((tbl) => tbl.table_name)));
    }
  }

  async function handleSaveSelection() {
    setSavingSelection(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/options`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_tables: Array.from(selectedTables) }),
      });
      const text = await res.text();
      if (!res.ok) {
        let errMsg = s.selectionSaveFailed;
        try { errMsg = JSON.parse(text).message ?? errMsg; } catch {}
        throw new Error(errMsg);
      }
      toast.success(s.selectionSaved.replace("{count}", String(selectedTables.size)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : s.selectionSaveFailed);
    } finally {
      setSavingSelection(false);
    }
  }

  function handleReadableChange(table: string, column: string, value: string) {
    setReadableNames((prev) => {
      const exists = prev.find((r) => r.table === table && r.column === column);
      if (exists) return prev.map((r) => r.table === table && r.column === column ? { ...r, readable: value } : r);
      return [...prev, { table, column, readable: value }];
    });
  }

  function getReadable(table: string, column: string) {
    return readableNames.find((r) => r.table === table && r.column === column)?.readable ?? "";
  }

  async function handleSaveReadableNames() {
    setSavingNames(true);
    try {
      const readableNamesMap: Record<string, Record<string, string>> = {};
      readableNames.forEach(({ table, column, readable }) => {
        if (!readableNamesMap[table]) readableNamesMap[table] = {};
        readableNamesMap[table][column] = readable;
      });
      const res = await fetch(`/api/projects/${projectId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readable_names: readableNamesMap }),
      });
      if (!res.ok) throw new Error();
      toast.success(s.readableNamesSaved);
    } catch {
      toast.error(s.readableNamesSaveFailed);
    } finally {
      setSavingNames(false);
    }
  }

  const allSelected = tables.length > 0 && selectedTables.size === tables.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{s.status}</p>
          <StatusBadge status={status} />
        </div>
        <Button onClick={handleStart} loading={starting} disabled={status === "running"} className="self-end">
          {s.startAnalysis}
        </Button>
      </div>

      {status === "running" && (
        <SchemaProgress elapsed={elapsed} stepLabels={stepLabels} elapsedLabel={s.elapsed} />
      )}

      {status === "error" && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">{s.analysisFailed}</p>
          <p className="text-xs text-red-500 mt-1">{s.analysisFailedHint}</p>
        </div>
      )}

      {status === "done" && tables.length === 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 p-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">{s.noTables}</p>
        </div>
      )}

      {tables.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 dark:text-slate-200">
              {s.tableList}
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-slate-400">
                ({selectedTables.size}/{tables.length}{s.tablesSelected})
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={toggleAll}>
                {allSelected ? s.deselectAll : s.selectAll}
              </Button>
              <Button size="sm" onClick={handleSaveSelection} loading={savingSelection}>
                {s.saveSelection}
              </Button>
            </div>
          </div>

          <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-3 py-2">
            <p className="text-xs text-blue-700 dark:text-blue-400">{s.selectionInfo}</p>
          </div>

          {tables.map((table) => {
            const isSelected = selectedTables.has(table.table_name);
            return (
              <div
                key={table.table_name}
                className={`border rounded-lg overflow-hidden transition-colors ${
                  isSelected ? "border-blue-300 dark:border-blue-700" : "border-gray-200 dark:border-slate-700 opacity-60 dark:opacity-70"
                }`}
              >
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 border-b cursor-pointer select-none transition-colors ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      : "bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                  onClick={() => toggleTable(table.table_name)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTable(table.table_name)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <p className="font-mono text-sm font-semibold text-gray-800 dark:text-slate-200 flex-1">
                    {table.table_name}
                  </p>
                  <span className="text-xs text-gray-400 dark:text-slate-500">{table.columns.length}{s.columns}</span>
                  {!isSelected && (
                    <span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded">{s.excluded}</span>
                  )}
                </div>

                {isSelected && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-slate-400">{s.columnName}</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-slate-400">{s.dataType}</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-slate-400">{s.readableName}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map((col) => (
                        <tr key={col.column_name} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                          <td className="py-2 px-4 font-mono text-gray-800 dark:text-slate-200">{col.column_name}</td>
                          <td className="py-2 px-4 text-gray-500 dark:text-slate-400">{col.data_type}</td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              placeholder={s.readableNamePlaceholder}
                              value={getReadable(table.table_name, col.column_name)}
                              onChange={(e) => handleReadableChange(table.table_name, col.column_name, e.target.value)}
                              className="w-full text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded px-2 py-1 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={handleSaveReadableNames} loading={savingNames}>
              {s.saveReadableNames}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
