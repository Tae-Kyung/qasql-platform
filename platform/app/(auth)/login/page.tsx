"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const [serverError, setServerError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setServerError("이메일 또는 비밀번호가 올바르지 않습니다");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">로그인</h2>

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
          autoComplete="current-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      {serverError && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isSubmitting ? "처리 중..." : "로그인"}
      </button>

      <div className="flex justify-between text-sm text-gray-500">
        <Link href="/reset-password" className="hover:text-gray-700">
          비밀번호 찾기
        </Link>
        <Link href="/signup" className="text-blue-600 hover:underline">
          회원가입
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
