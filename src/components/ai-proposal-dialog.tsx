import { type FormEvent, useState } from "react";
import { useMutation } from "@apollo/client";
import { CheckCircle2, ChevronRight, Circle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { ACCEPT_AI_PROPOSAL_MUTATION, GENERATE_AI_PROPOSAL_MUTATION } from "../graphql/todo";
import type { AIProposal, AIProposalParentType } from "../types";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";

// ─── Proposal JSON types ──────────────────────────────────────────────────────

type ProposalTodo = {
  title: string;
  description?: string;
  priority?: string;
  milestone?: boolean;
  nextAction?: boolean;
};

type ProposalStage = {
  name: string;
  description?: string;
  todos?: ProposalTodo[];
};

type ProposalProject = {
  name: string;
  description?: string;
  stages?: ProposalStage[];
  todos?: ProposalTodo[];
};

type ProposalJson =
  | { projects: ProposalProject[] }
  | { stages: ProposalStage[]; todos?: ProposalTodo[] };

// ─── Preview renderer ─────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  LOW: "text-slate-400",
  NORMAL: "text-sky-500",
  HIGH: "text-amber-500",
  CRITICAL: "text-red-500",
};

function TodoPreview({ todo }: { todo: ProposalTodo }) {
  return (
    <div className="flex items-start gap-2 py-1 pl-2 text-sm">
      <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <span className="flex-1 leading-snug">{todo.title}</span>
      {todo.priority && todo.priority !== "NORMAL" && (
        <span className={`shrink-0 text-xs font-medium ${priorityColors[todo.priority] ?? ""}`}>
          {todo.priority}
        </span>
      )}
      {todo.milestone && <span className="shrink-0 text-xs text-purple-400">milestone</span>}
    </div>
  );
}

function StagePreview({ stage }: { stage: ProposalStage }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted/40"
      >
        <ChevronRight className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {stage.name}
        </span>
        {stage.todos?.length ? (
          <span className="text-xs text-muted-foreground/50">{stage.todos.length} todo</span>
        ) : null}
      </button>
      {open && stage.todos?.map((todo, i) => <TodoPreview key={i} todo={todo} />)}
    </div>
  );
}

function ProjectPreview({ project }: { project: ProposalProject }) {
  const [open, setOpen] = useState(true);
  const stageCount = project.stages?.length ?? 0;
  const todoCount = (project.todos?.length ?? 0) + (project.stages?.reduce((s, st) => s + (st.todos?.length ?? 0), 0) ?? 0);

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="flex-1 font-semibold">{project.name}</span>
        <span className="text-xs text-muted-foreground">
          {stageCount} stage · {todoCount} todo
        </span>
      </button>
      {project.description && (
        <p className="mt-1 pl-6 text-xs text-muted-foreground">{project.description}</p>
      )}
      {open && (
        <div className="mt-2 pl-2">
          {project.stages?.map((stage, i) => <StagePreview key={i} stage={stage} />)}
          {project.todos?.map((todo, i) => <TodoPreview key={i} todo={todo} />)}
        </div>
      )}
    </div>
  );
}

function ProposalPreview({ proposal }: { proposal: AIProposal }) {
  let parsed: ProposalJson | null = null;
  try {
    parsed = JSON.parse(proposal.proposalJson) as ProposalJson;
  } catch {
    // show raw if not parseable
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          AI összefoglaló
        </div>
        <p className="mt-1 text-foreground/80">{proposal.summary}</p>
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
        {parsed && "projects" in parsed
          ? parsed.projects.map((p, i) => <ProjectPreview key={i} project={p} />)
          : parsed && "stages" in parsed
            ? (
              <div className="rounded-lg border border-border/60 bg-card p-3">
                {parsed.stages.map((s, i) => <StagePreview key={i} stage={s} />)}
                {parsed.todos?.map((t, i) => <TodoPreview key={i} todo={t} />)}
              </div>
            )
            : (
              <pre className="rounded bg-muted p-3 text-xs overflow-auto">
                {proposal.proposalJson}
              </pre>
            )}
      </div>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

type Step = "input" | "generating" | "preview" | "applying" | "done";

export function AIProposalDialog({
  open,
  parentType,
  parentId,
  parentName,
  onClose,
  onSuccess,
}: {
  open: boolean;
  parentType: AIProposalParentType;
  parentId: string;
  parentName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<Step>("input");
  const [magicText, setMagicText] = useState("");
  const [proposal, setProposal] = useState<AIProposal | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [generateProposal] = useMutation(GENERATE_AI_PROPOSAL_MUTATION);
  const [acceptProposal] = useMutation(ACCEPT_AI_PROPOSAL_MUTATION);

  const reset = () => {
    setStep("input");
    setMagicText("");
    setProposal(null);
    setErrorMsg("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!magicText.trim()) return;
    setStep("generating");
    setErrorMsg("");
    try {
      const { data } = await generateProposal({
        variables: { input: { parentType, parentId, magicText: magicText.trim() } },
      });
      setProposal(data.generateAIProposal as AIProposal);
      setStep("preview");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Ismeretlen hiba");
      setStep("input");
    }
  };

  const handleAccept = async () => {
    if (!proposal) return;
    setStep("applying");
    try {
      await acceptProposal({ variables: { id: proposal.id } });
      setStep("done");
      setTimeout(() => {
        reset();
        onSuccess();
      }, 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Ismeretlen hiba");
      setStep("preview");
    }
  };

  const parentLabel = parentType === "EPIC" ? "Epic" : "Project";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`AI terv — ${parentLabel}: ${parentName}`}
      className="max-w-xl"
    >
      {step === "done" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="font-medium">Sikeresen alkalmazva!</p>
        </div>
      ) : step === "generating" ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">AI terv generálása…</p>
        </div>
      ) : step === "applying" ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Alkalmazás folyamatban…</p>
        </div>
      ) : step === "preview" && proposal ? (
        <div className="grid gap-4">
          <ProposalPreview proposal={proposal} />

          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("input")}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Újra
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Mégsem
              </Button>
              <Button type="button" onClick={() => void handleAccept()}>
                <CheckCircle2 className="h-4 w-4" />
                Elfogadás és létrehozás
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleGenerate(e)} className="grid gap-4">
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {parentLabel}: <span className="font-medium text-foreground">{parentName}</span>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Mit szeretnél létrehozni?
            </label>
            <textarea
              value={magicText}
              onChange={(e) => setMagicText(e.target.value)}
              placeholder={
                parentType === "EPIC"
                  ? "pl. Fejlessz egy RSS reader backendet Go-ban PostgreSQL-lel"
                  : "pl. Készítsd el a REST API-t, tesztekkel és deployment scriptel"
              }
              rows={3}
              autoFocus
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
            />
          </div>

          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Mégsem
            </Button>
            <Button type="submit" disabled={!magicText.trim()} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Generálás
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
