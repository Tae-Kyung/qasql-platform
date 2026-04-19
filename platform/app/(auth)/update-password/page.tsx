"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

export default function UpdatePasswordPage() {
  const { t } = useLanguage();
  const [serverError, setServerError] = useState("");
  const router = useRouter();

  const schema = z
    .object({
      password: z.string().min(8, t.auth.updatePassword.passwordError),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t.auth.updatePassword.confirmError,
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          {t.auth.updatePassword.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {t.auth.updatePassword.description}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t.auth.updatePassword.newPassword}
        </label>
        <input
          {...register("password")}
          type="password"
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t.auth.updatePassword.newPasswordPlaceholder}
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t.auth.updatePassword.confirmPassword}
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
        {isSubmitting ? t.auth.updatePassword.submitting : t.auth.updatePassword.submit}
      </button>
    </form>
  );
}
