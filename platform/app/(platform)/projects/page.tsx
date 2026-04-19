import { getCurrentUserOrRedirect } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { Project, ProjectStatus } from "@/types";
import { getServerT } from "@/lib/i18n/server";

export default async function ProjectsPage() {
  const [user, t] = await Promise.all([getCurrentUserOrRedirect(), getServerT()]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createServiceClient();

  const { data: projects } = await supabase
    .from("qasql_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    ((projects ?? []) as Project[]).map(async (p: Project) => {
      const { count } = await supabase
        .from("qasql_query_logs")
        .select("*", { count: "exact", head: true })
        .eq("project_id", p.id);

      const { data: lastLog } = await supabase
        .from("qasql_query_logs")
        .select("created_at")
        .eq("project_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { data: config } = await supabase
        .from("qasql_project_configs")
        .select("db_type, llm_provider")
        .eq("project_id", p.id)
        .single();

      return {
        ...p,
        api_call_count: count ?? 0,
        last_queried_at: lastLog?.created_at ?? null,
        db_type: config?.db_type ?? null,
        llm_provider: config?.llm_provider ?? null,
      };
    })
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.projects.title}</h1>
        <Link href="/projects/new">
          <Button>{t.projects.newProject}</Button>
        </Link>
      </div>

      {enriched.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">
            {t.projects.noProjects}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enriched.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-semibold text-gray-900 dark:text-slate-100 truncate flex-1 mr-2">
                    {project.name}
                  </h2>
                  <StatusBadge status={project.status as ProjectStatus} />
                </div>

                <div className="space-y-2 text-sm text-gray-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>{t.projects.apiCalls}</span>
                    <span className="font-medium text-gray-700 dark:text-slate-300">
                      {project.api_call_count}{t.projects.callsUnit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.projects.lastQueried}</span>
                    <span className="font-medium text-gray-700 dark:text-slate-300">
                      {project.last_queried_at
                        ? format(new Date(project.last_queried_at), "MM/dd HH:mm")
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.projects.db}</span>
                    <span className="font-medium text-gray-700 dark:text-slate-300">{project.db_type ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.projects.llm}</span>
                    <span className="font-medium text-gray-700 dark:text-slate-300">{project.llm_provider ?? "-"}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
