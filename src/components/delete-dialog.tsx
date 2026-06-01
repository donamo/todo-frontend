import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client";
import { AlertTriangle } from "lucide-react";
import {
  DELETE_EPIC_MUTATION,
  DELETE_PROJECT_MUTATION,
  DELETE_STAGE_MUTATION,
  DELETE_TODO_MUTATION,
} from "../graphql/todo";
import type { Epic, Project, Stage, Todo } from "../types";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeleteTarget =
  | { kind: "epic"; item: Epic }
  | { kind: "project"; item: Project }
  | { kind: "stage"; item: Stage }
  | { kind: "todo"; item: Todo };

// ─── keepChildren defaults per kind ──────────────────────────────────────────

const childLabel: Record<string, string> = {
  epic: "Projektek (és tartalmuk)",
  project: "Todo-k",
  stage: "Todo-k",
};

const keepHint: Record<string, { keep: string; remove: string }> = {
  epic: {
    keep: "Projektek megmaradnak epic nélkül",
    remove: "Minden projekt és todo törlődik",
  },
  project: {
    keep: "Todo-k megmaradnak project nélkül",
    remove: "Minden todo törlődik a projekttel",
  },
  stage: {
    keep: "Todo-k megmaradnak stage nélkül",
    remove: "Minden todo törlődik a stage-dzsel",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DeleteDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: DeleteTarget | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const open = target !== null;
  const [keepChildren, setKeepChildren] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (target) setKeepChildren(target.kind === "project" ? false : true);
  }, [target]);

  const [deleteEpic] = useMutation(DELETE_EPIC_MUTATION);
  const [deleteProject] = useMutation(DELETE_PROJECT_MUTATION);
  const [deleteStage] = useMutation(DELETE_STAGE_MUTATION);
  const [deleteTodo] = useMutation(DELETE_TODO_MUTATION);

  // Reset keepChildren to default when target changes
  const effectiveKeep = target?.kind === "todo" ? undefined : keepChildren;

  const handleDelete = async () => {
    if (!target) return;
    setLoading(true);
    try {
      if (target.kind === "epic") {
        await deleteEpic({ variables: { id: target.item.id, keepChildren: effectiveKeep } });
      } else if (target.kind === "project") {
        await deleteProject({ variables: { id: target.item.id, keepChildren: effectiveKeep } });
      } else if (target.kind === "stage") {
        await deleteStage({ variables: { id: target.item.id, keepChildren: effectiveKeep } });
      } else {
        await deleteTodo({ variables: { id: target.item.id } });
      }
      onDeleted();
    } finally {
      setLoading(false);
    }
  };

  const itemName =
    target?.kind === "todo" ? target.item.title : (target?.item as Epic | Project | Stage)?.name;

  const kindLabel: Record<string, string> = {
    epic: "Epic",
    project: "Project",
    stage: "Stage",
    todo: "Todo",
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${target ? kindLabel[target.kind] : ""} törlése`}
    >
      {target && (
        <div className="grid gap-5">
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p>
                Biztosan törlöd:{" "}
                <span className="font-semibold text-foreground">{itemName}</span>?
              </p>
              <p className="mt-1 text-muted-foreground">Ez a művelet nem vonható vissza.</p>
            </div>
          </div>

          {target.kind !== "todo" && (
            <div className="rounded-md border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {childLabel[target.kind]}
              </p>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="keepChildren"
                    checked={keepChildren}
                    onChange={() => setKeepChildren(true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Megtartás</span>
                    <span className="ml-1.5 text-muted-foreground">
                      — {keepHint[target.kind].keep}
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="keepChildren"
                    checked={!keepChildren}
                    onChange={() => setKeepChildren(false)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-destructive">Törlés</span>
                    <span className="ml-1.5 text-muted-foreground">
                      — {keepHint[target.kind].remove}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Mégsem
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={loading}
            >
              {loading ? "Törlés…" : "Törlés"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
