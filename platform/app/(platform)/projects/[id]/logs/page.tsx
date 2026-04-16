import { getCurrentUserOrRedirect } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { QueryLog } from "@/types";
import { LogsClient } from "@/components/features/logs/logs-client";

const PAGE_SIZE = 20;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LogsPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  const { id } = await params;
  const sp = await searchParams;

  // Parse filters from URL
  const pageParam = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const successParam = typeof sp.success === "string" ? sp.success : "";
  const dateFrom = typeof sp.date_from === "string" ? sp.date_from : "";
  const dateTo = typeof sp.date_to === "string" ? sp.date_to : "";

  const supabase = await createServiceClient();

  // Verify project ownership
  const { data: project } = await supabase
    .from("qasql_projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  // Build query
  const offset = (currentPage - 1) * PAGE_SIZE;

  let query = supabase
    .from("qasql_query_logs")
    .select("*", { count: "exact" })
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (successParam === "true") {
    query = query.eq("success", true);
  } else if (successParam === "false") {
    query = query.eq("success", false);
  }

  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
  }

  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  const { data: logs, count } = await query;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">쿼리 히스토리</h1>
        <p className="mt-1 text-sm text-gray-500">
          이 프로젝트에서 실행된 쿼리 로그를 확인합니다.
        </p>
      </div>

      <LogsClient
        projectId={id}
        logs={(logs ?? []) as QueryLog[]}
        totalCount={count ?? 0}
        currentPage={currentPage}
        filters={{
          success: successParam,
          date_from: dateFrom,
          date_to: dateTo,
        }}
      />
    </div>
  );
}
