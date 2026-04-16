import { getCurrentUserOrRedirect } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/components/features/projects/project-tabs";
import { Project, ProjectConfig } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: project } = await supabase
    .from("qasql_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("*")
    .eq("project_id", id)
    .single();

  const maskedConfig = config
    ? {
        ...config,
        db_password_enc: config.db_password_enc ? "****" : null,
        supabase_key_enc: config.supabase_key_enc ? "****" : null,
        llm_api_key_enc: config.llm_api_key_enc ? "****" : null,
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-sm text-gray-500">{project.description}</p>
        )}
      </div>

      <ProjectTabs
        project={project as Project}
        config={maskedConfig as ProjectConfig | null}
      />
    </div>
  );
}
