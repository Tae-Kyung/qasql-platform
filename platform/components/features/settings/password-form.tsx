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

const schema = z
  .object({
    newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function PasswordForm() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

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
      toast.success("비밀번호가 변경되었습니다.");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="비밀번호 변경">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <Input
          label="새 비밀번호"
          type="password"
          placeholder="8자 이상"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Input
          label="새 비밀번호 확인"
          type="password"
          placeholder="비밀번호 재입력"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" loading={saving}>
          비밀번호 변경
        </Button>
      </form>
    </Card>
  );
}
