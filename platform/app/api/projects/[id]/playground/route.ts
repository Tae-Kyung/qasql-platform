import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { User } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract SQL from LLM response wrapped in ```sql ... ``` */
function extractSql(text: string): string {
  const match = text.match(/```sql\s*([\s\S]*?)```/i);
  if (match) return match[1].trim();
  // Fallback: return trimmed text if no code block found
  return text.trim();
}

/** Derive a simple confidence score from the LLM response text */
function deriveConfidence(text: string): number {
  const lower = text.toLowerCase();
  const uncertainPhrases = [
    "i'm not sure",
    "i am not sure",
    "uncertain",
    "cannot determine",
    "not enough information",
    "unclear",
    "i don't know",
    "cannot generate",
    "unable to",
  ];
  const hasUncertainty = uncertainPhrases.some((p) => lower.includes(p));
  const hasSqlBlock = /```sql/i.test(text);
  if (hasUncertainty) return 0.4;
  if (hasSqlBlock) return 0.9;
  return 0.7;
}

/** Call the configured LLM and return raw text */
async function callLlm(
  provider: string,
  model: string,
  apiKeyEnc: string | null,
  baseUrl: string | null,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  if (provider === "anthropic") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const apiKey = apiKeyEnc ? decrypt(apiKeyEnc) : "";
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: model ?? "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text : "";
  }

  if (provider === "openai") {
    const OpenAI = (await import("openai")).default;
    const apiKey = apiKeyEnc ? decrypt(apiKeyEnc) : "";
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: model ?? "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  if (provider === "ollama") {
    const url = baseUrl ?? "http://localhost:11434";
    const res = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model ?? "llama3.2",
        system: systemPrompt,
        prompt: userMessage,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const json = await res.json();
    return (json.response as string) ?? "";
  }

  throw new Error(`지원하지 않는 LLM 프로바이더: ${provider}`);
}

/** Build a pg-compatible config from Supabase credentials */
function supabasePgConfig(config: Record<string, unknown>): Record<string, unknown> {
  const host = config.db_host as string | null;
  if (!host) throw new Error("DB Host가 설정되지 않았습니다. DB 설정에서 DB Host를 입력하세요.");
  return {
    db_host: host,
    db_port: (config.db_port as number | null) ?? 5432,
    db_name: (config.db_name as string | null) ?? "postgres",
    db_user: (config.db_user as string | null) ?? "postgres",
    db_password_enc: config.db_password_enc,
  };
}

/** Execute SQL against a PostgreSQL database and return rows + columns */
async function executePg(
  config: Record<string, unknown>,
  sql: string
): Promise<{ rows: Record<string, unknown>[]; columns: string[] }> {
  const { Client } = await import("pg");
  const password = config.db_password_enc
    ? decrypt(config.db_password_enc as string)
    : "";
  const client = new Client({
    host: config.db_host as string,
    port: config.db_port ? Number(config.db_port) : 5432,
    database: config.db_name as string,
    user: config.db_user as string,
    password,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const result = await client.query(sql);
    const columns = result.fields.map((f) => f.name);
    return { rows: result.rows, columns };
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const POST = withAuth(async (req: NextRequest, ctx, user: User) => {
  const { id } = await ctx.params;
  const supabase = await createServiceClient();

  // Project ownership check
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

  // Parse request body
  let body: {
    question?: string;
    hint?: string;
    execute?: boolean;
    raw_sql?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400 }
    );
  }

  const { question, hint, execute = false, raw_sql } = body;

  if (!question && !raw_sql) {
    return NextResponse.json(
      { success: false, error: "BAD_REQUEST", message: "question 또는 raw_sql이 필요합니다" },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  // Load project config
  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("*")
    .eq("project_id", id)
    .single();

  if (!config) {
    const latencyMs = Date.now() - startTime;
    await supabase.from("qasql_query_logs").insert({
      project_id: id,
      question: question ?? null,
      hint: hint ?? null,
      generated_sql: raw_sql ?? null,
      executed: !!raw_sql,
      success: false,
      error_code: "CONFIG_NOT_FOUND",
      latency_ms: latencyMs,
    });
    return NextResponse.json(
      { success: false, error: "CONFIG_NOT_FOUND", message: "프로젝트 설정을 찾을 수 없습니다" },
      { status: 400 }
    );
  }

  const dbType: string = config.db_type ?? "postgresql";

  // ---------------------------------------------------------------------------
  // Branch A: raw_sql — direct execution
  // ---------------------------------------------------------------------------
  if (raw_sql) {
    let rows: Record<string, unknown>[] = [];
    let columns: string[] = [];
    let executed = false;
    let message: string | undefined;

    try {
      if (dbType === "supabase") {
        if (config.db_password_enc && config.db_host) {
          const pgCfg = supabasePgConfig(config);
          const result = await executePg(pgCfg, raw_sql);
          rows = result.rows;
          columns = result.columns;
          executed = true;
        } else {
          executed = false;
          message = "Supabase SQL 직접 실행을 위해 DB 설정에서 DB Host와 DB 비밀번호를 입력하세요.";
        }
      } else if (dbType === "postgresql") {
        const result = await executePg(config, raw_sql);
        rows = result.rows;
        columns = result.columns;
        executed = true;
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
      await supabase.from("qasql_query_logs").insert({
        project_id: id,
        question: null,
        hint: null,
        generated_sql: raw_sql,
        executed: false,
        success: false,
        error_code: "SQL_EXECUTION_ERROR",
        latency_ms: latencyMs,
      });
      console.error("[playground] sql execution error:", err);
      return NextResponse.json(
        { success: false, error: "SQL_EXECUTION_ERROR", message: errMsg },
        { status: 500 }
      );
    }

    const latencyMs = Date.now() - startTime;
    await supabase.from("qasql_query_logs").insert({
      project_id: id,
      question: null,
      hint: hint ?? null,
      generated_sql: raw_sql,
      executed,
      row_count: rows.length,
      success: true,
      error_code: null,
      latency_ms: latencyMs,
    });

    return NextResponse.json({
      success: true,
      sql: raw_sql,
      confidence: 1.0,
      reasoning: null,
      rows: executed ? rows : undefined,
      columns: executed ? columns : undefined,
      row_count: rows.length,
      executed,
      ...(message ? { message } : {}),
    });
  }

  // ---------------------------------------------------------------------------
  // Branch B: NL-to-SQL via LLM
  // ---------------------------------------------------------------------------
  if (!config.llm_provider) {
    const latencyMs = Date.now() - startTime;
    await supabase.from("qasql_query_logs").insert({
      project_id: id,
      question: question ?? null,
      hint: hint ?? null,
      generated_sql: null,
      executed: false,
      success: false,
      error_code: "LLM_NOT_CONFIGURED",
      latency_ms: latencyMs,
    });
    return NextResponse.json(
      { success: false, error: "LLM_NOT_CONFIGURED", message: "LLM 설정이 없습니다" },
      { status: 400 }
    );
  }

  // Load schema from Supabase Storage, filter by selected_tables
  let schemaJson = "{}";
  if (config.schema_cache_path) {
    try {
      const { data: schemaFile, error: schemaErr } = await supabase.storage
        .from("schema-cache")
        .download(`${config.schema_cache_path}/schema.json`);
      if (!schemaErr && schemaFile) {
        const fullSchema = JSON.parse(await schemaFile.text()) as Record<string, unknown>;
        const options = (config.options ?? {}) as Record<string, unknown>;
        const selectedTables: string[] = Array.isArray(options.selected_tables)
          ? (options.selected_tables as string[])
          : [];
        // 선택된 테이블이 있으면 필터링, 없으면 전체 사용
        const filteredSchema =
          selectedTables.length > 0
            ? Object.fromEntries(
                Object.entries(fullSchema).filter(([k]) => selectedTables.includes(k))
              )
            : fullSchema;
        schemaJson = JSON.stringify(filteredSchema);
      }
    } catch (e) {
      console.warn("[playground] schema load warning:", e);
    }
  }

  // Build system prompt
  const systemPrompt = `You are a SQL expert. Given the database schema below, generate a valid SQL SELECT query for the user's question.

Schema (JSON format - table_name -> array of {column_name, data_type}):
${schemaJson}

Rules:
- Generate ONLY the SQL query, no explanations
- Use only SELECT statements (no INSERT, UPDATE, DELETE)
- Use table and column names exactly as they appear in the schema
- Return the SQL query wrapped in \`\`\`sql ... \`\`\` code blocks`;

  const userMessage = hint
    ? `Question: ${question}\nHint: ${hint}`
    : `Question: ${question}`;

  let llmResponse = "";
  try {
    llmResponse = await callLlm(
      config.llm_provider,
      config.llm_model,
      config.llm_api_key_enc ?? null,
      config.llm_base_url ?? null,
      systemPrompt,
      userMessage
    );
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
    await supabase.from("qasql_query_logs").insert({
      project_id: id,
      question: question ?? null,
      hint: hint ?? null,
      generated_sql: null,
      executed: false,
      success: false,
      error_code: "LLM_UNAVAILABLE",
      latency_ms: latencyMs,
    });
    console.error("[playground] llm error:", err);
    return NextResponse.json(
      { success: false, error: "LLM_UNAVAILABLE", message: errMsg },
      { status: 503 }
    );
  }

  const generatedSql = extractSql(llmResponse);
  const confidence = deriveConfidence(llmResponse);
  const reasoning = llmResponse.trim();

  // Execute if requested
  let rows: Record<string, unknown>[] = [];
  let columns: string[] = [];
  let executed = false;
  let message: string | undefined;

  if (execute) {
    if (dbType === "supabase") {
      if (config.db_password_enc && config.db_host) {
        try {
          const pgCfg = supabasePgConfig(config);
          const result = await executePg(pgCfg, generatedSql);
          rows = result.rows;
          columns = result.columns;
          executed = true;
        } catch (err) {
          const latencyMs = Date.now() - startTime;
          const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
          await supabase.from("qasql_query_logs").insert({
            project_id: id,
            question: question ?? null,
            hint: hint ?? null,
            generated_sql: generatedSql,
            confidence,
            reasoning,
            executed: false,
            success: false,
            error_code: "SQL_EXECUTION_ERROR",
            latency_ms: latencyMs,
          });
          return NextResponse.json(
            { success: false, error: "SQL_EXECUTION_ERROR", message: errMsg },
            { status: 500 }
          );
        }
      } else {
        executed = false;
        message = "Supabase SQL 직접 실행을 위해 DB 설정에서 DB Host와 DB 비밀번호를 입력하세요.";
      }
    } else if (dbType === "postgresql") {
      try {
        const result = await executePg(config, generatedSql);
        rows = result.rows;
        columns = result.columns;
        executed = true;
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
        await supabase.from("qasql_query_logs").insert({
          project_id: id,
          question: question ?? null,
          hint: hint ?? null,
          generated_sql: generatedSql,
          confidence,
          reasoning,
          executed: false,
          success: false,
          error_code: "SQL_EXECUTION_ERROR",
          latency_ms: latencyMs,
        });
        console.error("[playground] sql execution error:", err);
        return NextResponse.json(
          { success: false, error: "SQL_EXECUTION_ERROR", message: errMsg },
          { status: 500 }
        );
      }
    }
  }

  const latencyMs = Date.now() - startTime;

  // Success log
  await supabase.from("qasql_query_logs").insert({
    project_id: id,
    question: question ?? null,
    hint: hint ?? null,
    generated_sql: generatedSql,
    confidence,
    reasoning,
    candidates_tried: null,
    candidates_succeeded: null,
    executed,
    row_count: rows.length,
    latency_ms: latencyMs,
    llm_tokens_used: null,
    success: true,
    error_code: null,
  });

  return NextResponse.json({
    success: true,
    sql: generatedSql,
    confidence,
    reasoning,
    ...(executed ? { rows, columns } : {}),
    row_count: rows.length,
    executed,
    ...(message ? { message } : {}),
  });
});
