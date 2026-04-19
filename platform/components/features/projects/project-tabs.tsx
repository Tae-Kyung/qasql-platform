"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./overview-tab";
import { DbConfigTab } from "./db-config-tab";
import { LlmConfigTab } from "./llm-config-tab";
import { ApiKeysTab } from "./api-keys-tab";
import { SchemaTab } from "./schema-tab";
import { DangerTab } from "./danger-tab";
import { PlaygroundClient } from "@/components/features/playground/playground-client";
import { Project, ProjectConfig, ProjectStatus, SchemaStatus } from "@/types";
import { useLanguage } from "@/lib/i18n/context";

const TAB_IDS = ["overview", "db", "llm", "schema", "playground", "apikeys", "danger"] as const;
type TabId = (typeof TAB_IDS)[number];

interface ProjectTabsProps {
  project: Project;
  config: ProjectConfig | null;
}

export function ProjectTabs({ project, config }: ProjectTabsProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: t.projectDetail.tabs.overview },
    { id: "db", label: t.projectDetail.tabs.db },
    { id: "llm", label: t.projectDetail.tabs.llm },
    { id: "schema", label: t.projectDetail.tabs.schema },
    { id: "playground", label: t.projectDetail.tabs.playground },
    { id: "apikeys", label: t.projectDetail.tabs.apikeys },
    { id: "danger", label: t.projectDetail.tabs.danger },
  ];

  return (
    <div className="space-y-6">
      {/* 탭 헤더 */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500",
                tab.id === "danger" && activeTab !== "danger" && "text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
                tab.id === "playground" && activeTab !== "playground" && "text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab project={project} config={config} />
        )}
        {activeTab === "db" && <DbConfigTab projectId={project.id} config={config} />}
        {activeTab === "llm" && <LlmConfigTab projectId={project.id} config={config} />}
        {activeTab === "schema" && (
          <SchemaTab
            projectId={project.id}
            initialStatus={(config?.schema_status ?? "none") as SchemaStatus}
          />
        )}
        {activeTab === "playground" && (
          <PlaygroundClient
            projectId={project.id}
            projectName={project.name}
            schemaStatus={(config?.schema_status ?? "none") as SchemaStatus}
            dbType={config?.db_type ?? null}
          />
        )}
        {activeTab === "apikeys" && <ApiKeysTab projectId={project.id} />}
        {activeTab === "danger" && (
          <DangerTab projectId={project.id} projectName={project.name} />
        )}
      </div>
    </div>
  );
}
