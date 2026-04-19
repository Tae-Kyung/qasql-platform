import { getCurrentUserOrRedirect, getUserPlan } from "@/lib/supabase/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PasswordForm } from "@/components/features/settings/password-form";
import { DeleteAccount } from "@/components/features/settings/delete-account";
import { getServerT } from "@/lib/i18n/server";

export default async function SettingsPage() {
  const [user, t] = await Promise.all([getCurrentUserOrRedirect(), getServerT()]);
  const plan = await getUserPlan(user.id);

  const planBadgeVariant: Record<string, "default" | "info" | "success"> = {
    free: "default",
    pro: "info",
    enterprise: "success",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.settings.title}</h1>

      <Card title={t.settings.accountInfo}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-slate-400">{t.settings.email}</span>
            <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-slate-400">{t.settings.plan}</span>
            <Badge variant={planBadgeVariant[plan] ?? "default"}>
              {plan.toUpperCase()}
            </Badge>
          </div>
        </div>
      </Card>

      <PasswordForm />
      <DeleteAccount />
    </div>
  );
}
