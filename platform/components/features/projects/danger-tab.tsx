"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface DangerTabProps {
  projectId: string;
  projectName: string;
}

export function DangerTab({ projectId, projectName }: DangerTabProps) {
  const router = useRouter();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmName !== projectName) {
      toast.error("프로젝트 이름이 일치하지 않습니다.");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("삭제 실패");
      toast.success("프로젝트가 삭제되었습니다.");
      router.push("/projects");
    } catch {
      toast.error("프로젝트 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-800 mb-2">프로젝트 삭제</h3>
        <p className="text-sm text-red-700 mb-4">
          이 작업은 되돌릴 수 없습니다. 프로젝트와 관련된 모든 데이터가 영구적으로 삭제됩니다.
        </p>
        <Button
          variant="destructive"
          onClick={() => setModalOpen(true)}
        >
          프로젝트 삭제
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setConfirmName("");
        }}
        title="프로젝트 삭제 확인"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            삭제하려면 프로젝트 이름{" "}
            <strong className="text-gray-900">{projectName}</strong>을 입력하세요.
          </p>

          <Input
            placeholder={projectName}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setConfirmName("");
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={confirmName !== projectName}
              loading={deleting}
              onClick={handleDelete}
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
