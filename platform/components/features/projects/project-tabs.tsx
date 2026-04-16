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

const TABS = [
  { id: "overview", label: "개요" },
  { id: "db", label: "DB 설정" },
  { id: "llm", label: "LLM 설정" },
  { id: "schema", label: "스키마" },
  { id: "playground", label: "Playground" },
  { id: "apikeys", label: "API Key" },
  { id: "danger", label: "위험 구역" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ProjectTabsProps {
  project: Project;
  config: ProjectConfig | null;
}

export function ProjectTabs({ project, config }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-6">
      {/* 탭 헤더 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                tab.id === "danger" && activeTab !== "danger" && "text-red-400 hover:text-red-600",
                tab.id === "playground" && activeTab !== "playground" && "text-purple-500 hover:text-purple-700"
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
