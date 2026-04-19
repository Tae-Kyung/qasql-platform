"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const schema = z.object({
    email: z.string().email(t.auth.resetPassword.emailError),
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          {t.auth.resetPassword.checkEmailTitle}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t.auth.resetPassword.checkEmailBody}
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          {t.auth.resetPassword.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          {t.auth.resetPassword.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {t.auth.resetPassword.description}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t.auth.resetPassword.email}
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
        {isSubmitting ? t.auth.resetPassword.submitting : t.auth.resetPassword.submit}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-600 hover:underline">
          {t.auth.resetPassword.backToLogin}
        </Link>
      </p>
    </form>
  );
}
