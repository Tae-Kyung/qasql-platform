"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function UpdatePasswordPage() {
  const [serverError, setServerError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">새 비밀번호 설정</h2>
        <p className="text-sm text-gray-500 mt-1">8자 이상의 새 비밀번호를 입력하세요.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
        <input
          {...register("password")}
          type="password"
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="8자 이상"
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
        <input
          {...register("confirmPassword")}
          type="password"
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isSubmitting ? "저장 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
