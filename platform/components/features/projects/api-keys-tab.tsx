"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CopyButton } from "@/components/ui/copy-button";
import { useToast } from "@/components/ui/toast";
import { ApiKey } from "@/types";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

interface ApiKeysTabProps {
  projectId: string;
}

export function ApiKeysTab({ projectId }: ApiKeysTabProps) {
  const toast = useToast();
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
      toast.error("API Key 목록 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleIssue() {
    setIssuing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "발급 실패");
      setNewRawKey(json.data.raw_key);
      setModalOpen(true);
      fetchKeys();
    } catch {
      toast.error("API Key 발급에 실패했습니다.");
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
      if (!res.ok) throw new Error("토글 실패");
      setKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, is_active: !isActive } : k))
      );
      toast.success(`API Key가 ${!isActive ? "활성화" : "비활성화"}되었습니다.`);
    } catch {
      toast.error("API Key 상태 변경에 실패했습니다.");
    }
  }

  async function handleDelete(keyId: string) {
    if (!confirm("이 API Key를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys/${keyId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("삭제 실패");
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success("API Key가 삭제되었습니다.");
    } catch {
      toast.error("API Key 삭제에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleIssue} loading={issuing}>
          새 API Key 발급
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-gray-500">발급된 API Key가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-600">Prefix</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">상태</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">만료일</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">IP 화이트리스트</th>
                <th className="text-left py-2 font-medium text-gray-600">작업</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 font-mono text-gray-800">{key.key_prefix}...</td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => handleToggle(key.id, key.is_active)}
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        key.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {key.is_active ? "활성" : "비활성"}
                    </button>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {key.expires_at ? format(new Date(key.expires_at), "yyyy-MM-dd") : "무기한"}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {key.ip_whitelist && key.ip_whitelist.length > 0
                      ? key.ip_whitelist.join(", ")
                      : "제한 없음"}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="삭제"
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
        onClose={() => {
          setModalOpen(false);
          setNewRawKey(null);
        }}
        title="새 API Key 발급됨"
      >
        <div className="space-y-4">
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            이 키는 지금만 표시됩니다. 안전한 곳에 보관하세요.
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-3">
            <code className="font-mono text-sm text-gray-800 flex-1 break-all">
              {newRawKey}
            </code>
            {newRawKey && <CopyButton text={newRawKey} />}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setModalOpen(false);
                setNewRawKey(null);
              }}
            >
              확인
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
