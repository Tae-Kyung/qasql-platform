"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CopyButton } from "@/components/ui/copy-button";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/i18n/context";
import { ApiKey } from "@/types";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

interface ApiKeysTabProps {
  projectId: string;
}

export function ApiKeysTab({ projectId }: ApiKeysTabProps) {
  const toast = useToast();
  const { t } = useLanguage();
  const ak = t.projectDetail.apiKeys;
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys`);
      const json = await res.json();
      setKeys(json.data ?? []);
    } catch {
      toast.error(ak.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, ak.loadFailed]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function handleIssue() {
    setIssuing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? ak.issueFailed);
      setNewRawKey(json.data.raw_key);
      setModalOpen(true);
      fetchKeys();
    } catch {
      toast.error(ak.issueFailed);
    } finally {
      setIssuing(false);
    }
  }

  async function handleToggle(keyId: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error();
      setKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, is_active: !isActive } : k)));
      toast.success(!isActive ? ak.toggleActivated : ak.toggleDeactivated);
    } catch {
      toast.error(ak.toggleFailed);
    }
  }

  async function handleDelete(keyId: string) {
    if (!confirm(ak.confirmDelete)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys/${keyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success(ak.deleteSuccess);
    } catch {
      toast.error(ak.deleteFailed);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleIssue} loading={issuing}>{ak.issue}</Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">{ak.loading}</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">{ak.noKeys}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">{ak.prefix}</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">{ak.status}</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">{ak.expiresAt}</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-slate-400">{ak.ipWhitelist}</th>
                <th className="text-left py-2 font-medium text-gray-600 dark:text-slate-400">{ak.actions}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                  <td className="py-2 pr-4 font-mono text-gray-800 dark:text-slate-200">{key.key_prefix}...</td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => handleToggle(key.id, key.is_active)}
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        key.is_active
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {key.is_active ? ak.active : ak.inactive}
                    </button>
                  </td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-slate-400">
                    {key.expires_at ? format(new Date(key.expires_at), "yyyy-MM-dd") : ak.noExpiry}
                  </td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-slate-400">
                    {key.ip_whitelist && key.ip_whitelist.length > 0 ? key.ip_whitelist.join(", ") : ak.noIpRestriction}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title={ak.actions}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setNewRawKey(null); }}
        title={ak.newKeyTitle}
      >
        <div className="space-y-4">
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-3 text-sm text-yellow-800 dark:text-yellow-300">
            {ak.newKeyWarning}
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-md p-3">
            <code className="font-mono text-sm text-gray-800 dark:text-slate-200 flex-1 break-all">{newRawKey}</code>
            {newRawKey && <CopyButton text={newRawKey} />}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => { setModalOpen(false); setNewRawKey(null); }}>{ak.confirm}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
