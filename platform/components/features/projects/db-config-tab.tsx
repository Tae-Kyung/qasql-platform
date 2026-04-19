"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/i18n/context";
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
  const { t } = useLanguage();
  const db = t.projectDetail.dbConfig;
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
      if (!res.ok) throw new Error();
      toast.success(db.saveSuccess);
    } catch {
      toast.error(db.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestDb() {
    setTesting(true);
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

      const saveRes = await fetch(`/api/projects/${projectId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db: dbBody }),
      });
      if (!saveRes.ok) {
        const saveJson = await saveRes.json().catch(() => ({}));
        toast.error(saveJson.message ?? db.savingFailed);
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/test-db`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        const count = json.data?.table_count;
        toast.success(count != null
          ? db.testSuccess.replace("{count}", String(count))
          : db.testSuccessNoCount);
      } else {
        toast.error(json.message ?? db.testFailed);
      }
    } catch {
      toast.error(db.testError);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <Select
        label={db.dbType}
        options={DB_TYPE_OPTIONS}
        value={dbType}
        onChange={(e) => setDbType(e.target.value as DbType)}
      />

      {dbType === "sqlite" && (
        <Input
          label={db.filePath}
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
            placeholder={hasSavedSupabaseKey ? db.savedCredential : db.serviceRolePlaceholder}
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {db.pgConnectionString} <span className="text-gray-400 dark:text-slate-500 font-normal">{db.pgConnectionStringOptional}</span>
            </label>
            <input
              type="password"
              placeholder={hasSavedPgUri ? db.savedCredential : "postgresql://postgres:password@host:5432/postgres"}
              value={pgUri}
              onChange={(e) => setPgUri(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500">{db.pgConnectionStringHint}</p>
          </div>
        </>
      )}

      {(dbType === "postgresql" || dbType === "mysql") && (
        <>
          <Input label="Host" placeholder="localhost" value={host} onChange={(e) => setHost(e.target.value)} />
          <Input
            label="Port"
            type="number"
            placeholder={dbType === "postgresql" ? "5432" : "3306"}
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
          <Input label={db.dbName} placeholder="mydb" value={dbName} onChange={(e) => setDbName(e.target.value)} />
          <Input label={db.user} placeholder="postgres" value={dbUser} onChange={(e) => setDbUser(e.target.value)} />
          <Input
            label={db.password}
            type="password"
            placeholder={hasSavedPassword ? db.savedCredential : db.passwordPlaceholder}
            value={dbPassword}
            onChange={(e) => setDbPassword(e.target.value)}
          />
        </>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave} loading={saving}>{db.save}</Button>
        <Button variant="outline" onClick={handleTestDb} loading={testing}>{db.testConnection}</Button>
      </div>
    </div>
  );
}
