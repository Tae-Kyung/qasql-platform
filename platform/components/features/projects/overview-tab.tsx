"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/i18n/context";
import { Project, ProjectConfig, ProjectStatus, SchemaStatus } from "@/types";
import { format } from "date-fns";

type FormValues = { name: string; description?: string };

interface OverviewTabProps {
  project: Project;
  config: ProjectConfig | null;
  onStatusChange?: (status: ProjectStatus) => void;
}

interface CheckItem {
  label: string;
  done: boolean;
  hint: string;
}

export function OverviewTab({ project, config, onStatusChange }: OverviewTabProps) {
  const toast = useToast();
  const { t } = useLanguage();
  const ov = t.projectDetail.overview;
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ProjectStatus>(project.status);

  const schema = z.object({
    name: z.string().min(1, ov.nameError).max(100, ov.nameLengthError),
    description: z.string().max(500, ov.descriptionLengthError).optional(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
    },
  });

  const checks: CheckItem[] = [
    { label: ov.dbConfig, done: !!config?.db_type, hint: ov.dbConfigHint },
    { label: ov.llmConfig, done: !!config?.llm_provider, hint: ov.llmConfigHint },
    { label: ov.schemaAnalysis, done: (config?.schema_status as SchemaStatus) === "done", hint: ov.schemaAnalysisHint },
  ];
  const allDone = checks.every((c) => c.done);
  const canActivate = allDone && currentStatus !== "active";

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      toast.success(ov.saveSuccess);
    } catch {
      toast.error(ov.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    setActivating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error();
      setCurrentStatus("active");
      onStatusChange?.("active");
      toast.success(ov.activateSuccess);
    } catch {
      toast.error(ov.activateFailed);
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 상태 & 날짜 */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400">{ov.status}</p>
          <StatusBadge status={currentStatus} />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400">{ov.createdAt}</p>
          <p className="text-sm text-gray-700 dark:text-slate-300">{format(new Date(project.created_at), "yyyy-MM-dd HH:mm")}</p>
        </div>
      </div>

      {/* 설정 완료 체크리스트 */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{ov.setupProgress}</p>
        <div className="space-y-2">
          {checks.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                item.done ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
              }`}>
                {item.done ? "✓" : "○"}
              </span>
              <div>
                <p className={`text-sm font-medium ${item.done ? "text-gray-700 dark:text-slate-300" : "text-gray-500 dark:text-slate-400"}`}>
                  {item.label}
                </p>
                {!item.done && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{item.hint}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 활성화 버튼 */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
          {currentStatus === "active" ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="font-semibold">✓</span>
              <span>{ov.projectActive}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {allDone ? ov.allDone : `${checks.filter(c => !c.done).length}${ov.itemsIncomplete}`}
              </p>
              <Button onClick={handleActivate} loading={activating} disabled={!canActivate} size="sm">
                {ov.activateProject}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 이름/설명 편집 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <Input
          label={ov.projectName}
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{ov.description}</label>
          <textarea
            rows={4}
            className="w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-gray-400 dark:placeholder:text-slate-500"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-red-500">{errors.description.message}</p>
          )}
        </div>

        <Button type="submit" loading={saving}>
          {ov.save}
        </Button>
      </form>
    </div>
  );
}
