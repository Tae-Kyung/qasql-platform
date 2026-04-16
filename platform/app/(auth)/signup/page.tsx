"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    email: z.string().email("올바른 이메일을 입력하세요"),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login` },
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="text-4xl">📧</div>
        <h2 className="text-lg font-semibold text-gray-900">이메일을 확인하세요</h2>
        <p className="text-sm text-gray-500">
          인증 링크를 발송했습니다. 이메일에서 링크를 클릭하면 가입이 완료됩니다.
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          로그인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">회원가입</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="you@example.com"
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
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
        {isSubmitting ? "처리 중..." : "가입하기"}
      </button>

      <p className="text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
