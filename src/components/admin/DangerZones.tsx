"use client";

import { RotateCcwIcon, Trash2Icon } from "lucide-react";
import { deleteOfferAction, undeleteOfferAction } from "@/app/admin/_actions/offers";
import { deleteSnapshotAction } from "@/app/admin/_actions/terms";
import { deleteTemplateAction, undeleteTemplateAction } from "@/app/admin/_actions/templates";
import { ConfirmAction } from "./ConfirmAction";

export function DeleteOfferButton({ id, name, revision }: { id: string; name: string; revision: number }) {
  return (
    <ConfirmAction
      trigger={<><Trash2Icon /> Delete offer</>}
      triggerVariant="danger"
      title="Delete this offer?"
      description={
        <>
          <strong>{name}</strong> will disappear from the public site. Its history is kept and you can restore it later.
        </>
      }
      confirmLabel="Delete offer"
      successMessage="Offer deleted (history kept)"
      redirectTo="/admin/offers"
      className="w-full sm:w-fit"
      run={() => deleteOfferAction(id, revision)}
    />
  );
}

export function RestoreOfferButton({ id, revision }: { id: string; revision: number }) {
  return (
    <ConfirmAction
      trigger={<><RotateCcwIcon /> Restore this offer</>}
      triggerVariant="default"
      title="Restore this offer?"
      description="It will appear on the public site again, exactly as it was when it was deleted."
      confirmLabel="Restore"
      confirmVariant="default"
      successMessage="Offer restored"
      className="w-full sm:w-fit"
      run={() => undeleteOfferAction(id, revision)}
    />
  );
}

export function DeleteTemplateButton({ id, title, revision }: { id: string; title: string; revision: number }) {
  return (
    <ConfirmAction
      trigger={<><Trash2Icon /> Delete template</>}
      triggerVariant="danger"
      title="Delete this template?"
      description={
        <>
          <strong>{title}</strong> will disappear from the public site. Its history is kept and you can restore it later.
        </>
      }
      confirmLabel="Delete template"
      successMessage="Template deleted (history kept)"
      redirectTo="/admin/templates"
      className="w-full sm:w-fit"
      run={() => deleteTemplateAction(id, revision)}
    />
  );
}

export function RestoreTemplateButton({ id, revision }: { id: string; revision: number }) {
  return (
    <ConfirmAction
      trigger={<><RotateCcwIcon /> Restore this template</>}
      triggerVariant="default"
      title="Restore this template?"
      description="It will appear on the public site again."
      confirmLabel="Restore"
      confirmVariant="default"
      successMessage="Template restored"
      className="w-full sm:w-fit"
      run={() => undeleteTemplateAction(id, revision)}
    />
  );
}

export function DeleteSnapshotButton({ revision }: { revision: number }) {
  return (
    <ConfirmAction
      trigger={<><Trash2Icon /> Delete</>}
      title={`Permanently delete snapshot ${revision}?`}
      description="This cannot be undone. If it is the newest snapshot, visitors will see the previous one instead."
      confirmLabel="Delete permanently"
      requireText="DELETE"
      successMessage={`Snapshot ${revision} deleted`}
      className="w-full sm:w-fit"
      run={() => deleteSnapshotAction(revision)}
    />
  );
}
