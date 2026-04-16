import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { User } from "@supabase/supabase-js";

const TEST_PROMPT = "Respond with exactly the word: OK";

export const POST = withAuth(async (_req, ctx, user: User) => {
  const { id } = await ctx.params;
  const supabase = await createServiceClient();

  const { data: project } = await supabase
    .from("qasql_projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("*")
    .eq("project_id", id)
    .single();

  if (!config?.llm_provider) {
    return NextResponse.json(
      { success: false, error: "BAD_REQUEST", message: "LLM 설정이 없습니다" },
      { status: 400 }
    );
  }

  try {
    if (config.llm_provider === "anthropic") {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const apiKey = config.llm_api_key_enc ? decrypt(config.llm_api_key_enc) : "";
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: config.llm_model ?? "claude-haiku-4-5-20251001",
        max_tokens: 16,
        messages: [{ role: "user", content: TEST_PROMPT }],
      });
      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      return NextResponse.json({ success: true, data: { response: text.trim() } });
    }

    if (config.llm_provider === "openai") {
      const OpenAI = (await import("openai")).default;
      const apiKey = config.llm_api_key_enc ? decrypt(config.llm_api_key_enc) : "";
      const client = new OpenAI({ apiKey });
      const res = await client.chat.completions.create({
        model: config.llm_model ?? "gpt-4o-mini",
        max_tokens: 16,
        messages: [{ role: "user", content: TEST_PROMPT }],
      });
      const text = res.choices[0]?.message?.content ?? "";
      return NextResponse.json({ success: true, data: { response: text.trim() } });
    }

    if (config.llm_provider === "ollama") {
      const baseUrl = config.llm_base_url ?? "http://localhost:11434";
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.llm_model ?? "llama3.2",
          prompt: TEST_PROMPT,
          stream: false,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const json = await res.json();
      return NextResponse.json({ success: true, data: { response: json.response?.trim() } });
    }

    return NextResponse.json(
      { success: false, error: "BAD_REQUEST", message: "지원하지 않는 LLM 프로바이더입니다" },
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    const safeMsg = msg.split("\n")[0].slice(0, 200);
    return NextResponse.json(
      { success: false, error: "LLM_UNAVAILABLE", message: safeMsg },
      { status: 503 }
    );
  }
});
