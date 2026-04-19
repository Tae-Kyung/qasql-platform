"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/i18n/context";

export function DeleteAccount() {
  const { t } = useLanguage();
  const toast = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmWord = t.settings.dangerZoneConfirmWord;

  async function handleDelete() {
    if (confirmText !== confirmWord) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? t.settings.accountDeleteFailed);
      }
      toast.success(t.settings.accountDeleted);
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settings.accountDeleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
        <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2">
          {t.settings.dangerZoneTitle}
        </h3>
        <p className="text-sm text-red-700 dark:text-red-400 mb-4">
          {t.settings.dangerZoneDescription}{" "}
          <strong>{confirmWord}</strong>
          {t.settings.dangerZoneDescriptionSuffix}
        </p>

        <div className="space-y-3 max-w-xs">
          <Input
            placeholder={confirmWord}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <Button
            variant="destructive"
            disabled={confirmText !== confirmWord}
            loading={deleting}
            onClick={handleDelete}
          >
            {t.settings.deleteAccount}
          </Button>
        </div>
      </div>
    </Card>
  );
}
