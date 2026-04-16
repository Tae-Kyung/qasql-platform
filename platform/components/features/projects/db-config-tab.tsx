"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { DbType, ProjectConfig } from "@/types";

const DB_TYPE_OPTIONS = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "supabase", label: "Supabase" },
];

interface DbConfigTabProps {
  projectId: string;
  config: ProjectConfig | null;
}

export function DbConfigTab({ projectId, config }: DbConfigTabProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [dbType, setDbType] = useState<DbType>(config?.db_type ?? "postgresql");
  const [host, setHost] = useState(config?.db_host ?? "");
  const [port, setPort] = useState(config?.db_port?.toString() ?? "5432");
  const [dbName, setDbName] = useState(config?.db_name ?? "");
  const [dbUser, setDbUser] = useState(config?.db_user ?? "");
  const [dbPassword, setDbPassword] = useState("");
  const [filePath, setFilePath] = useState(config?.db_name ?? "");
  const [supabaseUrl, setSupabaseUrl] = useState(config?.supabase_url ?? "");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [pgUri, setPgUri] = useState("");

  const hasSavedPassword = !!config?.db_password_enc && config.db_password_enc !== null;
  const hasSavedSupabaseKey = !!config?.supabase_key_enc && config.supabase_key_enc !== null;
  const hasSavedPgUri = !!config?.db_host;

  async function handleSave() {
    setSaving(true);
    try {
      let dbBody: Record<string, unknown> = { db_type: dbType };

      if (dbType === "supabase") {
        dbBody = { ...dbBody, supabase_url: supabaseUrl };
        if (supabaseKey) dbBody.supabase_key = supabaseKey;
        if (pgUri) dbBody.pg_uri = pgUri;
      } else if (dbType === "sqlite") {
        dbBody = { ...dbBody, db_name: filePath };
      } else {
        dbBody = {
          ...dbBody,
          db_host: host,
          db_port: parseInt(port, 10) || null,
          db_name: dbName,
          db_user: dbUser,
        };
        if (dbPassword) dbBody.db_password = dbPassword;
      }

      const res = await fetch(`/api/projects/${projectId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db: dbBody }),
      });
      if (!res.ok) throw new Error("저장 실패");
      toast.success("DB 설정이 저장되었습니다.");
    } catch {
      toast.error("DB 설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestDb() {
    setTesting(true);
    try {
      // 먼저 현재 폼 값을 저장
      let dbBody: Record<string, unknown> = { db_type: dbType };
      if (dbType === "supabase") {
        dbBody = { ...dbBody, supabase_url: supabaseUrl };
        if (supabaseKey) dbBody.supabase_key = supabaseKey;
        if (pgUri) dbBody.pg_uri = pgUri;
      } else if (dbType === "sqlite") {
        dbBody = { ...dbBody, db_name: filePath };
      } else {
        dbBody = {
          ...dbBody,
          db_host: host,
          db_port: parseInt(port, 10) || null,
          db_name: dbName,
          db_user: dbUser,
        };
        if (dbPassword) dbBody.db_password = dbPassword;
      }

      const saveRes = await fetch(`/api/projects/${projectId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db: dbBody }),
      });
      if (!saveRes.ok) {
        const saveJson = await saveRes.json().catch(() => ({}));
        toast.error(saveJson.message ?? "설정 저장 실패 — 입력 값을 확인하세요");
        return;
      }

      // 저장 후 테스트
      const res = await fetch(`/api/projects/${projectId}/test-db`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        const count = json.data?.table_count;
        toast.success(count != null ? `연결 성공! (테이블 ${count}개)` : "DB 연결 성공!");
      } else {
        toast.error(json.message ?? "DB 연결 실패");
      }
    } catch {
      toast.error("DB 연결 테스트에 실패했습니다.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <Select
        label="DB 타입"
        options={DB_TYPE_OPTIONS}
        value={dbType}
        onChange={(e) => setDbType(e.target.value as DbType)}
      />

      {dbType === "sqlite" && (
        <Input
          label="파일 경로"
          placeholder="/path/to/database.db"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
        />
      )}

      {dbType === "supabase" && (
        <>
          <Input
            label="Supabase URL"
            placeholder="https://xxxx.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
          />
          <Input
            label="Service Role Key"
            type="password"
            placeholder={hasSavedSupabaseKey ? "저장됨 (변경하려면 새로 입력)" : "service_role key 입력"}
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              PostgreSQL Connection String <span className="text-gray-400 font-normal">(선택 — SQL 직접 실행 시 필요)</span>
            </label>
            <input
              type="password"
              placeholder={hasSavedPgUri ? "저장됨 (변경하려면 새로 입력)" : "postgresql://postgres:password@host:5432/postgres"}
              value={pgUri}
              onChange={(e) => setPgUri(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white outline-none transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">Supabase 대시보드 → Connect → Connection string (URI) 에서 복사</p>
          </div>
        </>
      )}

      {(dbType === "postgresql" || dbType === "mysql") && (
        <>
          <Input
            label="Host"
            placeholder="localhost"
            value={host}
            onChange={(e) => setHost(e.target.value)}
          />
          <Input
            label="Port"
            type="number"
            placeholder={dbType === "postgresql" ? "5432" : "3306"}
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
          <Input
            label="DB 이름"
            placeholder="mydb"
            value={dbName}
            onChange={(e) => setDbName(e.target.value)}
          />
          <Input
            label="사용자"
            placeholder="postgres"
            value={dbUser}
            onChange={(e) => setDbUser(e.target.value)}
          />
          <Input
            label="비밀번호"
            type="password"
            placeholder={hasSavedPassword ? "저장됨 (변경하려면 새로 입력)" : "비밀번호 입력"}
            value={dbPassword}
            onChange={(e) => setDbPassword(e.target.value)}
          />
        </>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave} loading={saving}>
          저장
        </Button>
        <Button variant="outline" onClick={handleTestDb} loading={testing}>
          연결 테스트
        </Button>
      </div>
    </div>
  );
}
