"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { LlmProvider, ProjectConfig } from "@/types";

const LLM_PROVIDER_OPTIONS = [
  { value: "ollama", label: "Ollama" },
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
];

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  ollama: "llama3",
  anthropic: "claude-3-5-sonnet-20241022",
  openai: "gpt-4o",
};

interface LlmConfigTabProps {
  projectId: string;
  config: ProjectConfig | null;
}

export function LlmConfigTab({ projectId, config }: LlmConfigTabProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [provider, setProvider] = useState<LlmProvider>(config?.llm_provider ?? "openai");
  const [model, setModel] = useState(config?.llm_model ?? DEFAULT_MODELS[config?.llm_provider ?? "openai"]);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(config?.llm_base_url ?? "");

  const hasSavedApiKey = !!config?.llm_api_key_enc;

  function handleProviderChange(newProvider: LlmProvider) {
    setProvider(newProvider);
    setModel(DEFAULT_MODELS[newProvider]);
    setApiKey("");
    setBaseUrl("");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const llmBody: Record<string, unknown> = {
        llm_provider: provider,
        llm_model: model,
      };

      if (provider !== "ollama" && apiKey) {
        llmBody.llm_api_key = apiKey;
      }
      if (provider === "ollama" && baseUrl) {
        llmBody.llm_base_url = baseUrl;
      }

      const res = await fetch(`/api/projects/${projectId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llm: llmBody }),
      });
      if (!res.ok) throw new Error("저장 실패");
      toast.success("LLM 설정이 저장되었습니다.");
    } catch {
      toast.error("LLM 설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestLlm() {
    setTesting(true);
    try {
      // 먼저 현재 폼 값을 저장
      const llmBody: Record<string, unknown> = {
        llm_provider: provider,
        llm_model: model,
      };
      if (provider !== "ollama" && apiKey) llmBody.llm_api_key = apiKey;
      if (provider === "ollama" && baseUrl) llmBody.llm_base_url = baseUrl;

      const saveRes = await fetch(`/api/projects/${projectId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llm: llmBody }),
      });
      if (!saveRes.ok) {
        const saveJson = await saveRes.json().catch(() => ({}));
        toast.error(saveJson.message ?? "설정 저장 실패 — 입력 값을 확인하세요");
        return;
      }

      // 저장 후 테스트
      const res = await fetch(`/api/projects/${projectId}/test-llm`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`LLM 연결 성공! 응답: "${json.data?.response ?? "OK"}"`);
      } else {
        toast.error(json.message ?? "LLM 연결 실패");
      }
    } catch {
      toast.error("LLM 연결 테스트에 실패했습니다.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <Select
        label="LLM 프로바이더"
        options={LLM_PROVIDER_OPTIONS}
        value={provider}
        onChange={(e) => handleProviderChange(e.target.value as LlmProvider)}
      />

      {provider === "ollama" && (
        <Input
          label="Base URL"
          placeholder="http://localhost:11434"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      )}

      <Input
        label="모델"
        placeholder={DEFAULT_MODELS[provider]}
        value={model}
        onChange={(e) => setModel(e.target.value)}
      />

      {(provider === "anthropic" || provider === "openai") && (
        <Input
          label="API Key"
          type="password"
          placeholder={hasSavedApiKey ? "저장됨 (변경하려면 새로 입력)" : "API Key 입력"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave} loading={saving}>
          저장
        </Button>
        <Button variant="outline" onClick={handleTestLlm} loading={testing}>
          연결 테스트
        </Button>
      </div>
    </div>
  );
}
