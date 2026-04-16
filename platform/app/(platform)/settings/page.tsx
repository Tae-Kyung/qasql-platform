import { getCurrentUserOrRedirect, getUserPlan } from "@/lib/supabase/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PasswordForm } from "@/components/features/settings/password-form";
import { DeleteAccount } from "@/components/features/settings/delete-account";

export default async function SettingsPage() {
  const user = await getCurrentUserOrRedirect();
  const plan = await getUserPlan(user.id);

  const planBadgeVariant: Record<string, "default" | "info" | "success"> = {
    free: "default",
    pro: "info",
    enterprise: "success",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">계정 설정</h1>

      {/* 계정 정보 */}
      <Card title="계정 정보">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">이메일</span>
            <span className="text-sm font-medium text-gray-800">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">플랜</span>
            <Badge variant={planBadgeVariant[plan] ?? "default"}>
              {plan.toUpperCase()}
            </Badge>
          </div>
        </div>
      </Card>

      {/* 비밀번호 변경 */}
      <PasswordForm />

      {/* 계정 삭제 */}
      <DeleteAccount />
    </div>
  );
}
