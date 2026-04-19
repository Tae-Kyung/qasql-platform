"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/context";

export default function NewProjectPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [planError, setPlanError] = useState<string | null>(null);

  const schema = z.object({
    name: z
      .string()
      .min(1, t.newProject.nameError)
      .max(100, t.newProject.nameLengthError),
    description: z
      .string()
      .max(500, t.newProject.descriptionLengthError)
      .optional(),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setPlanError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (res.status === 403) {
        setPlanError(json.message ?? t.newProject.planLimitError);
        return;
      }

      if (!res.ok) {
        throw new Error(json.message ?? t.newProject.planLimitError);
      }

      router.push(`/projects/${json.data.id}`);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : t.newProject.unknownError);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.newProject.title}</h1>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t.newProject.name}
            placeholder={t.newProject.namePlaceholder}
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t.newProject.description}
            </label>
            <textarea
              rows={4}
              placeholder={t.newProject.descriptionPlaceholder}
              className="w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-gray-400 dark:placeholder:text-slate-500"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {planError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-400">
              {planError}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/projects")}
            >
              {t.newProject.cancel}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {t.newProject.submit}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
