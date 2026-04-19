"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/i18n/context";

interface DangerTabProps {
  projectId: string;
  projectName: string;
}

export function DangerTab({ projectId, projectName }: DangerTabProps) {
  const router = useRouter();
  const toast = useToast();
  const { t } = useLanguage();
  const d = t.projectDetail.danger;
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmName !== projectName) {
      toast.error(d.nameMismatch);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(d.deleteSuccess);
      router.push("/projects");
    } catch {
      toast.error(d.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
        <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2">{d.title}</h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">{d.description}</p>
        <Button variant="destructive" onClick={() => setModalOpen(true)}>
          {d.deleteButton}
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setConfirmName(""); }}
        title={d.modalTitle}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-slate-300">
            {d.modalDescription}{" "}
            <strong className="text-gray-900 dark:text-slate-100">{projectName}</strong>{d.modalDescriptionSuffix}
          </p>

          <Input
            placeholder={projectName}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setModalOpen(false); setConfirmName(""); }}>
              {d.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmName !== projectName}
              loading={deleting}
              onClick={handleDelete}
            >
              {d.delete}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
