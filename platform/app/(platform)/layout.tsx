import { getCurrentUser, getUserPlan } from "@/lib/supabase/auth";
import { SidebarNav } from "@/components/features/layout/sidebar-nav";
import { ToastProvider } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = await getUserPlan(user.id);

  const planBadgeVariant: Record<string, "default" | "info" | "success"> = {
    free: "default",
    pro: "info",
    enterprise: "success",
  };

  return (
    <ToastProvider>
      <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
        {/* 사이드바 */}
        <aside className="w-60 shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col fixed inset-y-0 left-0 z-30">
          {/* 로고 */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-slate-700">
            <span className="text-xl font-bold text-blue-600">QA-SQL</span>
          </div>
          <SidebarNav />
        </aside>

        {/* 메인 영역 */}
        <div className="flex-1 flex flex-col ml-60">
          {/* 헤더 */}
          <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-end px-6 gap-3 sticky top-0 z-20">
            <Badge variant={planBadgeVariant[plan] ?? "default"}>
              {plan.toUpperCase()}
            </Badge>
            <span className="text-sm text-gray-600 dark:text-slate-400">{user.email}</span>
          </header>

          {/* 콘텐츠 */}
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
