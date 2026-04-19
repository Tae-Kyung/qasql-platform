"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

export default function SignupPage() {
  const { t } = useLanguage();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const schema = z
    .object({
      email: z.string().email(t.auth.signup.emailError),
      password: z.string().min(8, t.auth.signup.passwordError),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t.auth.signup.confirmError,
      path: ["confirmPassword"],
    });
  type FormValues = z.infer<typeof schema>;

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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          {t.auth.signup.checkEmailTitle}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">{t.auth.signup.checkEmailBody}</p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          {t.auth.signup.goToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">
        {t.auth.signup.title}
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t.auth.signup.email}
        </label>
        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          placeholder="you@example.com"
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t.auth.signup.password}
        </label>
        <input
          {...register("password")}
          type="password"
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t.auth.signup.passwordPlaceholder}
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t.auth.signup.confirmPassword}
        </label>
        <input
          {...register("confirmPassword")}
          type="password"
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isSubmitting ? t.common.processing : t.auth.signup.submit}
      </button>

      <p className="text-center text-sm text-gray-500 dark:text-slate-400">
        {t.auth.signup.hasAccount}{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          {t.auth.signup.loginLink}
        </Link>
      </p>
    </form>
  );
}
