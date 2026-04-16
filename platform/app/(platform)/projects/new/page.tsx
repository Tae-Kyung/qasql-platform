"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const schema = z.object({
  name: z
    .string()
    .min(1, "프로젝트 이름을 입력하세요")
    .max(100, "이름은 100자 이하여야 합니다"),
  description: z
    .string()
    .max(500, "설명은 500자 이하여야 합니다")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewProjectPage() {
  const router = useRouter();
  const [planError, setPlanError] = useState<string | null>(null);

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
        setPlanError(json.message ?? "현재 플랜에서 프로젝트를 더 이상 생성할 수 없습니다.");
        return;
      }

      if (!res.ok) {
        throw new Error(json.message ?? "프로젝트 생성 실패");
      }

      router.push(`/projects/${json.data.id}`);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">새 프로젝트 생성</h1>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="프로젝트 이름"
            placeholder="예: 내 SQL 프로젝트"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">설명 (선택)</label>
            <textarea
              rows={4}
              placeholder="프로젝트 설명을 입력하세요"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {planError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {planError}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/projects")}
            >
              취소
            </Button>
            <Button type="submit" loading={isSubmitting}>
              프로젝트 생성
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
