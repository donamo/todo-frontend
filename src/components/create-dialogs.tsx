import { type FormEvent, useEffect, useState } from "react";
import { useMutation } from "@apollo/client";
import {
  CREATE_EPIC_MUTATION,
  CREATE_PROJECT_MUTATION,
  CREATE_STAGE_MUTATION,
  CREATE_TODO_MUTATION,
  UPDATE_EPIC_MUTATION,
  UPDATE_PROJECT_MUTATION,
  UPDATE_STAGE_MUTATION,
  UPDATE_TODO_MUTATION,
} from "../graphql/todo";
import type { Epic, Project, Stage, Todo } from "../types";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

// ─── Shared ───────────────────────────────────────────────────────────────────

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#64748b",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            borderColor: value === c ? "white" : "transparent",
            outline: value === c ? `2px solid ${c}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ─── Create Epic ──────────────────────────────────────────────────────────────

export function CreateEpicDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [createEpic, { loading }] = useMutation(CREATE_EPIC_MUTATION);

  const reset = () => { setName(""); setColor(PRESET_COLORS[0]); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createEpic({ variables: { input: { name: name.trim(), color } } });
    reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Új Epic">
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
        <FormRow label="Név *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Munka, Otthon" autoFocus required />
        </FormRow>
        <FormRow label="Szín">
          <ColorPicker value={color} onChange={setColor} />
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Mégsem</Button>
          <Button type="submit" disabled={loading || !name.trim()}>{loading ? "Létrehozás…" : "Létrehozás"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Create Project ───────────────────────────────────────────────────────────

export function CreateProjectDialog({
  open,
  epicId,
  epicName,
  onClose,
  onSuccess,
}: {
  open: boolean;
  epicId: string | null;
  epicName?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createProject, { loading }] = useMutation(CREATE_PROJECT_MUTATION);

  const reset = () => { setName(""); setDescription(""); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createProject({ variables: { input: { name: name.trim(), description: description.trim() || undefined, epicId: epicId ?? undefined } } });
    reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Új Project">
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
        {epicName && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Epic: <span className="font-medium text-foreground">{epicName}</span>
          </div>
        )}
        <FormRow label="Név *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. RSS Reader" autoFocus required />
        </FormRow>
        <FormRow label="Leírás">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcionális"
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
          />
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Mégsem</Button>
          <Button type="submit" disabled={loading || !name.trim()}>{loading ? "Létrehozás…" : "Létrehozás"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Create Stage ─────────────────────────────────────────────────────────────

export function CreateStageDialog({
  open,
  projectId,
  projectName,
  onClose,
  onSuccess,
}: {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
}) {
  const [name, setName] = useState("");
  const [createStage, { loading }] = useMutation(CREATE_STAGE_MUTATION);

  const reset = () => setName("");
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createStage({ variables: { input: { projectId, name: name.trim() } } });
    reset();
    onSuccess(projectId);
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Új Stage">
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
        {projectName && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Project: <span className="font-medium text-foreground">{projectName}</span>
          </div>
        )}
        <FormRow label="Név *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Fejlesztés, Tesztelés" autoFocus required />
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Mégsem</Button>
          <Button type="submit" disabled={loading || !name.trim()}>{loading ? "Létrehozás…" : "Létrehozás"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Create Todo ──────────────────────────────────────────────────────────────

export function CreateTodoDialog({
  open,
  projectId,
  stageId,
  projectName,
  stageName,
  onClose,
  onSuccess,
}: {
  open: boolean;
  projectId: string | null;
  stageId: string | null;
  projectName?: string;
  stageName?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [createTodo, { loading }] = useMutation(CREATE_TODO_MUTATION);

  const reset = () => { setTitle(""); setPriority("NORMAL"); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTodo({ variables: { input: { title: title.trim(), priority, projectId: projectId ?? undefined, stageId: stageId ?? undefined } } });
    reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Új Todo">
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
        {(projectName || stageName) && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground space-y-0.5">
            {projectName && <div>Project: <span className="font-medium text-foreground">{projectName}</span></div>}
            {stageName && <div>Stage: <span className="font-medium text-foreground">{stageName}</span></div>}
          </div>
        )}
        <FormRow label="Cím *">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pl. Backend API elkészítése" autoFocus required />
        </FormRow>
        <FormRow label="Prioritás">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="LOW">Alacsony</option>
            <option value="NORMAL">Normál</option>
            <option value="HIGH">Magas</option>
            <option value="CRITICAL">Kritikus</option>
          </Select>
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Mégsem</Button>
          <Button type="submit" disabled={loading || !title.trim()}>{loading ? "Létrehozás…" : "Létrehozás"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Edit Epic ────────────────────────────────────────────────────────────────

export function EditEpicDialog({
  open,
  epic,
  onClose,
  onSuccess,
}: {
  open: boolean;
  epic: Epic | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [updateEpic, { loading }] = useMutation(UPDATE_EPIC_MUTATION);

  useEffect(() => {
    if (epic) { setName(epic.name); setColor(epic.color ?? PRESET_COLORS[0]); }
  }, [epic]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!epic || !name.trim()) return;
    await updateEpic({ variables: { id: epic.id, input: { name: name.trim(), color } } });
    onSuccess();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Epic szerkesztése">
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
        <FormRow label="Név *">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </FormRow>
        <FormRow label="Szín">
          <ColorPicker value={color} onChange={setColor} />
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Mégsem</Button>
          <Button type="submit" disabled={loading || !name.trim()}>{loading ? "Mentés…" : "Mentés"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Edit Project ─────────────────────────────────────────────────────────────

export function EditProjectDialog({
  open,
  project,
  onClose,
  onSuccess,
}: {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [updateProject, { loading }] = useMutation(UPDATE_PROJECT_MUTATION);

  useEffect(() => {
    if (project) { setName(project.name); setDescription(project.description ?? ""); setStatus(project.status); }
  }, [project]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!project || !name.trim()) return;
    await updateProject({ variables: { id: project.id, input: { name: name.trim(), description: description.trim() || undefined, status } } });
    onSuccess();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Project szerkesztése">
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
        <FormRow label="Név *">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </FormRow>
        <FormRow label="Leírás">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcionális"
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
          />
        </FormRow>
        <FormRow label="Státusz">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">Aktív</option>
            <option value="PAUSED">Szünetel</option>
            <option value="DONE">Lezárt</option>
            <option value="ARCHIVED">Archivált</option>
          </Select>
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Mégsem</Button>
          <Button type="submit" disabled={loading || !name.trim()}>{loading ? "Mentés…" : "Mentés"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Edit Stage ───────────────────────────────────────────────────────────────

export function EditStageDialog({
  open,
  stage,
  onClose,
  onSuccess,
}: {
  open: boolean;
  stage: Stage | null;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("PLANNED");
  const [updateStage, { loading }] = useMutation(UPDATE_STAGE_MUTATION);

  useEffect(() => {
    if (stage) { setName(stage.name); setStatus(stage.status); }
  }, [stage]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stage || !name.trim()) return;
    await updateStage({ variables: { id: stage.id, input: { name: name.trim(), status } } });
    onSuccess(stage.projectId);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Stage szerkesztése">
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
        <FormRow label="Név *">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </FormRow>
        <FormRow label="Státusz">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="PLANNED">Tervezett</option>
            <option value="IN_PROGRESS">Folyamatban</option>
            <option value="DONE">Kész</option>
          </Select>
        </FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Mégsem</Button>
          <Button type="submit" disabled={loading || !name.trim()}>{loading ? "Mentés…" : "Mentés"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Edit Todo ────────────────────────────────────────────────────────────────

export function EditTodoDialog({
  open,
  todo,
  onClose,
  onSuccess,
}: {
  open: boolean;
  todo: Todo | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [status, setStatus] = useState("OPEN");
  const [dueDate, setDueDate] = useState("");
  const [nextAction, setNextAction] = useState(false);
  const [milestone, setMilestone] = useState(false);
  const [updateTodo, { loading }] = useMutation(UPDATE_TODO_MUTATION);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description ?? "");
      setPriority(todo.priority);
      setStatus(todo.status);
      setDueDate(todo.dueDate?.slice(0, 10) ?? "");
      setNextAction(todo.nextAction);
      setMilestone(todo.milestone);
    }
  }, [todo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!todo || !title.trim()) return;
    await updateTodo({
      variables: {
        id: todo.id,
        input: { title: title.trim(), description: description.trim() || undefined, priority, status, dueDate: dueDate || undefined, nextAction, milestone },
      },
    });
    onSuccess();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Todo szerkesztése">
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
        <FormRow label="Cím *">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
        </FormRow>
        <FormRow label="Leírás">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcionális"
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
          />
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Prioritás">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">Alacsony</option>
              <option value="NORMAL">Normál</option>
              <option value="HIGH">Magas</option>
              <option value="CRITICAL">Kritikus</option>
            </Select>
          </FormRow>
          <FormRow label="Státusz">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="OPEN">Nyitott</option>
              <option value="IN_PROGRESS">Folyamatban</option>
              <option value="DONE">Kész</option>
              <option value="BLOCKED">Blokkolt</option>
            </Select>
          </FormRow>
        </div>
        <FormRow label="Határidő">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormRow>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={nextAction} onChange={(e) => setNextAction(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Következő lépés
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={milestone} onChange={(e) => setMilestone(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Mérföldkő
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Mégsem</Button>
          <Button type="submit" disabled={loading || !title.trim()}>{loading ? "Mentés…" : "Mentés"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
