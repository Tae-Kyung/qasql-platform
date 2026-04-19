"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

export function PasswordForm() {
  const { t } = useLanguage();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const schema = z
    .object({
      newPassword: z.string().min(8, t.settings.passwordMinError),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t.settings.passwordMatchError,
      path: ["confirmPassword"],
    });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });
      if (error) throw new Error(error.message);
      toast.success(t.settings.passwordChanged);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settings.passwordChangeFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t.settings.changePassword}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <Input
          label={t.settings.newPassword}
          type="password"
          placeholder={t.settings.newPasswordPlaceholder}
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Input
          label={t.settings.confirmPassword}
          type="password"
          placeholder={t.settings.confirmPasswordPlaceholder}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" loading={saving}>
          {t.settings.savePassword}
        </Button>
      </form>
    </Card>
  );
}
