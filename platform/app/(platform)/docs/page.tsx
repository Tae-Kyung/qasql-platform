import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import { getCurrentUserOrRedirect } from "@/lib/supabase/auth";

export default async function DocsPage() {
  await getCurrentUserOrRedirect();
  const [, locale] = await Promise.all([getServerT(), getServerLocale()]);
  const isKo = locale === "ko";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          {isKo ? "API 튜토리얼" : "API Tutorial"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {isKo
            ? "QA-SQL API를 사용하여 자연어 질문을 SQL로 변환하는 방법을 알아보세요."
            : "Learn how to use the QA-SQL API to convert natural language questions to SQL."}
        </p>
      </div>

      {/* Overview */}
      <Card title={isKo ? "개요" : "Overview"}>
        <div className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
          <p>
            {isKo
              ? "QA-SQL API는 REST 방식으로 제공되며, 프로젝트별 API 키를 사용해 인증합니다. 자연어 질문을 전달하면 SQL 쿼리를 자동으로 생성하고 선택적으로 실행 결과까지 반환합니다."
              : "The QA-SQL API is a REST API that authenticates with per-project API keys. Send a natural language question and receive an auto-generated SQL query, optionally with execution results."}
          </p>
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 font-mono text-xs">
            <p className="text-gray-500 dark:text-slate-400 mb-1">{isKo ? "# 베이스 URL" : "# Base URL"}</p>
            <p className="text-blue-600 dark:text-blue-400">https://your-domain.vercel.app/api/v1</p>
          </div>
        </div>
      </Card>

      {/* Authentication */}
      <Card title={isKo ? "인증" : "Authentication"}>
        <div className="space-y-4 text-sm text-gray-700 dark:text-slate-300">
          <p>
            {isKo
              ? "모든 API 요청은 Authorization 헤더에 Bearer 토큰으로 API 키를 포함해야 합니다. API 키는 프로젝트 상세 페이지의 \"API Keys\" 탭에서 발급받을 수 있습니다."
              : 'All API requests must include the API key as a Bearer token in the Authorization header. You can issue API keys from the "API Keys" tab on your project detail page.'}
          </p>
          <CodeBlock
            title={isKo ? "요청 헤더" : "Request Headers"}
            code={`Authorization: Bearer qasql_xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json`}
          />
        </div>
      </Card>

      {/* Endpoints */}
      <Card title={isKo ? "엔드포인트" : "Endpoints"}>
        <div className="space-y-6">
          {/* Query */}
          <EndpointSection
            method="POST"
            path="/api/v1/{projectId}/query"
            title={isKo ? "자연어 → SQL 변환" : "Natural Language → SQL"}
            description={
              isKo
                ? "자연어 질문을 SQL로 변환합니다. execute: true 설정 시 DB에서 실제로 실행하고 결과를 반환합니다."
                : "Convert a natural language question to SQL. Set execute: true to run the query against the database and return results."
            }
            requestBody={`{
  "question": "${isKo ? "월별 매출 상위 5개 제품을 알려줘" : "Show me the top 5 products by monthly revenue"}",
  "hint": "${isKo ? "최근 3개월 기준" : "Based on the last 3 months"}",  // optional
  "execute": true,       // optional, default: false
  "options": {           // optional
    "relevance_threshold": 0.7,
    "query_timeout": 30
  }
}`}
            responseBody={`{
  "sql": "SELECT product_name, SUM(revenue) as total FROM sales ...",
  "confidence": 0.92,
  "reasoning": "${isKo ? "월별 매출 집계 후 상위 5개 추출" : "Aggregated monthly revenue then selected top 5"}",
  "candidates_tried": 3,
  "candidates_succeeded": 1,
  "rows": [
    { "product_name": "Product A", "total": 15000 },
    ...
  ],
  "columns": ["product_name", "total"],
  "usage": {
    "latency_ms": 1250,
    "llm_tokens_used": 843
  }
}`}
            isKo={isKo}
          />

          <hr className="border-gray-200 dark:border-slate-700" />

          {/* Execute */}
          <EndpointSection
            method="POST"
            path="/api/v1/{projectId}/execute"
            title={isKo ? "SQL 직접 실행" : "Execute SQL Directly"}
            description={
              isKo
                ? "SQL 쿼리를 직접 실행하고 결과를 반환합니다. LLM 변환 없이 바로 실행합니다."
                : "Execute a SQL query directly and return results, bypassing LLM conversion."
            }
            requestBody={`{
  "sql": "SELECT * FROM users LIMIT 10"
}`}
            responseBody={`{
  "rows": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    ...
  ],
  "columns": ["id", "name", "email"],
  "row_count": 10
}`}
            isKo={isKo}
          />

          <hr className="border-gray-200 dark:border-slate-700" />

          {/* Tables */}
          <EndpointSection
            method="GET"
            path="/api/v1/{projectId}/tables"
            title={isKo ? "테이블 목록 조회" : "List Tables"}
            description={
              isKo
                ? "프로젝트에 연결된 데이터베이스의 테이블 목록을 반환합니다."
                : "Returns the list of tables in the connected database."
            }
            requestBody={null}
            responseBody={`{
  "tables": ["users", "orders", "products", "categories"]
}`}
            isKo={isKo}
          />

          <hr className="border-gray-200 dark:border-slate-700" />

          {/* Schema */}
          <EndpointSection
            method="GET"
            path="/api/v1/{projectId}/schema/{tableName}"
            title={isKo ? "테이블 스키마 조회" : "Get Table Schema"}
            description={
              isKo
                ? "특정 테이블의 컬럼 정보를 반환합니다."
                : "Returns the column information for a specific table."
            }
            requestBody={null}
            responseBody={`{
  "table": "users",
  "columns": [
    { "name": "id", "type": "integer", "nullable": false },
    { "name": "name", "type": "varchar", "nullable": false },
    { "name": "email", "type": "varchar", "nullable": true },
    { "name": "created_at", "type": "timestamp", "nullable": false }
  ]
}`}
            isKo={isKo}
          />
        </div>
      </Card>

      {/* Code Examples */}
      <Card title={isKo ? "코드 예제" : "Code Examples"}>
        <div className="space-y-6">
          {/* cURL */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">cURL</h4>
            <CodeBlock
              code={`curl -X POST https://your-domain.vercel.app/api/v1/YOUR_PROJECT_ID/query \\
  -H "Authorization: Bearer qasql_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "${isKo ? "사용자 수가 가장 많은 날짜는 언제야?" : "What date had the most new users?"}",
    "execute": true
  }'`}
            />
          </div>

          {/* Python */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Python</h4>
            <CodeBlock
              code={`import requests

API_KEY = "qasql_xxxxxxxxxxxxxxxxxxxxxxxx"
PROJECT_ID = "YOUR_PROJECT_ID"
BASE_URL = "https://your-domain.vercel.app/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# ${isKo ? "자연어 → SQL 변환 및 실행" : "Convert natural language to SQL and execute"}
response = requests.post(
    f"{BASE_URL}/{PROJECT_ID}/query",
    headers=headers,
    json={
        "question": "${isKo ? "지난 달 가장 많이 팔린 제품 5개를 알려줘" : "Show me the top 5 best-selling products last month"}",
        "execute": True,
    },
)

data = response.json()
print(f"SQL: {data['sql']}")
print(f"${isKo ? "신뢰도" : "Confidence"}: {data['confidence']:.0%}")
print(f"${isKo ? "결과" : "Results"}:", data.get("rows", []))`}
            />
          </div>

          {/* JavaScript */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">JavaScript / TypeScript</h4>
            <CodeBlock
              code={`const API_KEY = "qasql_xxxxxxxxxxxxxxxxxxxxxxxx";
const PROJECT_ID = "YOUR_PROJECT_ID";
const BASE_URL = "https://your-domain.vercel.app/api/v1";

async function querySQL(question: string, execute = false) {
  const res = await fetch(\`\${BASE_URL}/\${PROJECT_ID}/query\`, {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, execute }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message);
  }

  return res.json();
}

// ${isKo ? "사용 예시" : "Usage example"}
const result = await querySQL(
  "${isKo ? "이번 주 신규 가입자 수를 알려줘" : "How many new users signed up this week?"}",
  true
);
console.log(result.sql);
console.log(result.rows);`}
            />
          </div>
        </div>
      </Card>

      {/* Error Codes */}
      <Card title={isKo ? "에러 코드" : "Error Codes"}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">
                  {isKo ? "HTTP 상태" : "HTTP Status"}
                </th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">
                  {isKo ? "에러 코드" : "Error Code"}
                </th>
                <th className="text-left py-2 font-medium text-gray-600 dark:text-slate-400">
                  {isKo ? "설명" : "Description"}
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-slate-300">
              {[
                { status: "401", code: "UNAUTHORIZED", desc: isKo ? "API 키가 없거나 유효하지 않음" : "Missing or invalid API key" },
                { status: "400", code: "BAD_REQUEST", desc: isKo ? "요청 바디 형식 오류" : "Invalid request body format" },
                { status: "404", code: "PROJECT_NOT_FOUND", desc: isKo ? "프로젝트를 찾을 수 없음" : "Project not found" },
                { status: "429", code: "RATE_LIMIT_EXCEEDED", desc: isKo ? "API 호출 한도 초과" : "API rate limit exceeded" },
                { status: "503", code: "DB_CONNECTION_FAILED", desc: isKo ? "DB 연결 실패 또는 스키마 미초기화" : "DB connection failed or schema not initialized" },
                { status: "503", code: "LLM_UNAVAILABLE", desc: isKo ? "LLM 서비스 연결 실패" : "LLM service unavailable" },
                { status: "503", code: "QUERY_TIMEOUT", desc: isKo ? "쿼리 시간 초과 (60초)" : "Query timed out (60s limit)" },
                { status: "500", code: "INTERNAL_ERROR", desc: isKo ? "서버 내부 오류" : "Internal server error" },
              ].map((row) => (
                <tr key={row.code} className="border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                  <td className="py-2 pr-4">
                    <span className="font-mono text-xs bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="font-mono text-xs text-orange-600 dark:text-orange-400">{row.code}</span>
                  </td>
                  <td className="py-2">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Rate Limits */}
      <Card title={isKo ? "요청 제한 (Rate Limits)" : "Rate Limits"}>
        <div className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-6 font-medium text-gray-600 dark:text-slate-400">{isKo ? "플랜" : "Plan"}</th>
                  <th className="text-left py-2 font-medium text-gray-600 dark:text-slate-400">{isKo ? "분당 요청 수" : "Requests / minute"}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { plan: "Free", limit: "10" },
                  { plan: "Pro", limit: "60" },
                  { plan: "Enterprise", limit: isKo ? "무제한" : "Unlimited" },
                ].map((row) => (
                  <tr key={row.plan} className="border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                    <td className="py-2 pr-6 font-medium">{row.plan}</td>
                    <td className="py-2">{row.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-xs">
            {isKo
              ? "한도 초과 시 429 RATE_LIMIT_EXCEEDED 응답이 반환됩니다."
              : "Exceeding the limit returns a 429 RATE_LIMIT_EXCEEDED response."}
          </p>
        </div>
      </Card>
    </div>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
      {title && (
        <div className="bg-gray-100 dark:bg-slate-700 px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-400 border-b border-gray-200 dark:border-slate-600">
          {title}
        </div>
      )}
      <pre className="bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 text-xs p-4 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400",
    POST: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
    PUT: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400",
    DELETE: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono ${colors[method] ?? colors.GET}`}>
      {method}
    </span>
  );
}

function EndpointSection({
  method,
  path,
  title,
  description,
  requestBody,
  responseBody,
  isKo,
}: {
  method: string;
  path: string;
  title: string;
  description: string;
  requestBody: string | null;
  responseBody: string;
  isKo: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MethodBadge method={method} />
        <code className="text-sm font-mono text-gray-800 dark:text-slate-200">{path}</code>
      </div>
      <h4 className="font-medium text-gray-900 dark:text-slate-100">{title}</h4>
      <p className="text-sm text-gray-600 dark:text-slate-400">{description}</p>
      {requestBody && (
        <CodeBlock title={isKo ? "요청 바디 (Request Body)" : "Request Body"} code={requestBody} />
      )}
      <CodeBlock title={isKo ? "응답 (Response)" : "Response"} code={responseBody} />
    </div>
  );
}
