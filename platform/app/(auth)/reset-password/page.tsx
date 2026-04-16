"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
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
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
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
          비밀번호 재설정 링크를 발송했습니다.
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          로그인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">비밀번호 찾기</h2>
        <p className="text-sm text-gray-500 mt-1">
          가입한 이메일 주소로 재설정 링크를 보내드립니다.
        </p>
      </div>

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

      {serverError && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isSubmitting ? "전송 중..." : "재설정 링크 전송"}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-600 hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}
