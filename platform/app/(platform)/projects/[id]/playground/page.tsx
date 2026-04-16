import { getCurrentUserOrRedirect } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PlaygroundClient } from "@/components/features/playground/playground-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaygroundPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: project } = await supabase
    .from("qasql_projects")
    .select("name, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  return (
    <PlaygroundClient
      projectId={id}
      projectName={project.name}
    />
  );
}
