"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export function DeleteAccount() {
  const toast = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? "계정 삭제 실패");
      }
      toast.success("계정이 삭제되었습니다.");
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "계정 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-800 mb-2">계정 삭제 (위험 구역)</h3>
        <p className="text-sm text-red-700 mb-4">
          계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          확인하려면 <strong>DELETE</strong>를 입력하세요.
        </p>

        <div className="space-y-3 max-w-xs">
          <Input
            placeholder="DELETE"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <Button
            variant="destructive"
            disabled={confirmText !== "DELETE"}
            loading={deleting}
            onClick={handleDelete}
          >
            계정 영구 삭제
          </Button>
        </div>
      </div>
    </Card>
  );
}
