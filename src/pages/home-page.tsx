import { useCallback, useEffect, useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Flag,
  FolderKanban,
  GripVertical,
  Layers3,
  Loader2,
  Milestone,
  Minus,
  Pencil,
  Sparkles,
  Star,
} from "lucide-react";
import { AIProposalDialog } from "../components/ai-proposal-dialog";
import { Tooltip } from "../components/ui/tooltip";
import {
  CreateEpicDialog,
  CreateProjectDialog,
  CreateStageDialog,
  CreateTodoDialog,
  EditEpicDialog,
  EditProjectDialog,
  EditStageDialog,
  EditTodoDialog,
} from "../components/create-dialogs";
import {
  STAGES_QUERY,
  UPDATE_EPIC_MUTATION,
  UPDATE_PROJECT_MUTATION,
  UPDATE_STAGE_MUTATION,
  UPDATE_TODO_MUTATION,
  WORKSPACE_QUERY,
} from "../graphql/todo";
import { cn } from "../lib/utils";
import type {
  Epic,
  Project,
  Stage,
  StageStatus,
  Todo,
  TodoPriority,
  TodoStatus,
  WorkspaceData,
} from "../types";

// ─── ID helpers ───────────────────────────────────────────────────────────────
// Prefix IDs to avoid collision across types in the same DndContext

const eid = (id: string) => `e:${id}`;
const pid = (id: string) => `p:${id}`;
const sid = (id: string) => `s:${id}`;
const tid = (id: string) => `t:${id}`;

// Container IDs (for useDroppable on empty lists)
const cProjects = (epicId: string | null) => `c:projects:${epicId ?? "orphan"}`;
const cStages = (projectId: string) => `c:stages:${projectId}`;
const cTodos = (projectId: string | null, stageId: string | null) =>
  `c:todos:${projectId ?? "null"}:${stageId ?? "null"}`;

// ─── Visual constants ─────────────────────────────────────────────────────────

const statusIcon: Record<TodoStatus, React.ReactNode> = {
  OPEN: <Circle className="h-3.5 w-3.5 text-muted-foreground/70" />,
  IN_PROGRESS: <Clock3 className="h-3.5 w-3.5 text-blue-500" />,
  DONE: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  BLOCKED: <Minus className="h-3.5 w-3.5 text-red-500" />,
};

const priorityColor: Record<TodoPriority, string> = {
  LOW: "bg-slate-300",
  NORMAL: "bg-sky-400",
  HIGH: "bg-amber-400",
  CRITICAL: "bg-red-500",
};

const stageStatusIcon: Record<StageStatus, string> = {
  PLANNED: "text-muted-foreground/50",
  IN_PROGRESS: "text-blue-500",
  DONE: "text-emerald-500",
};

const stageStatusText: Record<StageStatus, string> = {
  PLANNED: "text-muted-foreground",
  IN_PROGRESS: "text-blue-500",
  DONE: "text-emerald-500",
};

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogState =
  | null
  | { kind: "epic" }
  | { kind: "project"; epicId: string | null; epicName?: string }
  | { kind: "stage"; projectId: string; projectName?: string }
  | { kind: "todo"; projectId: string | null; stageId: string | null; projectName?: string; stageName?: string }
  | { kind: "edit-epic"; item: Epic }
  | { kind: "edit-project"; item: Project }
  | { kind: "edit-stage"; item: Stage }
  | { kind: "edit-todo"; item: Todo }
  | { kind: "ai-epic"; item: Epic }
  | { kind: "ai-project"; item: Project };

// ─── Active drag type ─────────────────────────────────────────────────────────

type ActiveItem =
  | { kind: "epic"; item: Epic }
  | { kind: "project"; item: Project }
  | { kind: "stage"; item: Stage }
  | { kind: "todo"; item: Todo };

// ─── TodoRow ──────────────────────────────────────────────────────────────────

function TodoContent({ todo, isDragging, onEdit }: { todo: Todo; isDragging?: boolean; onEdit?: () => void }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded px-2 py-1.5 text-sm transition-colors",
        !isDragging && "hover:bg-muted/50",
        isDragging && "shadow-lg ring-1 ring-border bg-card",
        todo.status === "DONE" && "opacity-55",
      )}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 cursor-grab" />
      <span className="ml-1 mt-px shrink-0">{statusIcon[todo.status]}</span>
      <span
        className={cn(
          "flex-1 leading-snug px-1",
          todo.status === "DONE" && "text-muted-foreground line-through",
        )}
      >
        {todo.title}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 pr-1">
        {todo.milestone && (
          <span title="Mérföldkő">
            <Flag className="h-3 w-3 text-purple-400" />
          </span>
        )}
        {todo.nextAction && (
          <span title="Következő lépés">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          </span>
        )}
        {todo.dueDate && (
          <span className="tabular-nums text-xs text-muted-foreground">
            {todo.dueDate.slice(0, 10)}
          </span>
        )}
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", priorityColor[todo.priority])}
          title={todo.priority}
        />
        {onEdit && !isDragging && (
          <Tooltip text="Szerkesztés">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="rounded border border-border/20 p-0.5 text-muted-foreground/30 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </Tooltip>
        )}
      </span>
    </div>
  );
}

function SortableTodoRow({ todo, onEdit }: { todo: Todo; onEdit?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tid(todo.id),
    data: { kind: "todo", item: todo },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-40")}
    >
      <TodoContent todo={todo} onEdit={onEdit} />
    </div>
  );
}

// ─── Droppable empty zone ─────────────────────────────────────────────────────

function DroppableEmptyZone({ id }: { id: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[32px] rounded border border-dashed transition-colors",
        isOver ? "border-primary/50 bg-primary/5" : "border-border/20",
      )}
    />
  );
}

// ─── StageSection ─────────────────────────────────────────────────────────────

function SortableStageSection({
  stage,
  todos,
  onCreateTodo,
  onEdit,
  onEditTodo,
}: {
  stage: Stage;
  todos: Todo[];
  onCreateTodo: () => void;
  onEdit: () => void;
  onEditTodo: (todo: Todo) => void;
}) {
  const [open, setOpen] = useState(true);
  const done = todos.filter((t) => t.status === "DONE").length;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sid(stage.id),
    data: { kind: "stage", item: stage },
  });

  const todoIds = todos.map((t) => tid(t.id));
  const containerId = cTodos(stage.projectId, stage.id);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("mt-1.5", isDragging && "opacity-40")}
    >
      <div className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-muted/30">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground/30 active:cursor-grabbing"
          tabIndex={-1}
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform",
              open && "rotate-90",
            )}
          />
          <Milestone className={cn("h-3.5 w-3.5 shrink-0", stageStatusIcon[stage.status])} />
          <span
            className={cn(
              "flex-1 text-[11px] font-semibold uppercase tracking-widest",
              stageStatusText[stage.status],
            )}
          >
            {stage.name}
          </span>
          {todos.length > 0 && (
            <span className="tabular-nums text-xs text-muted-foreground/60">
              {done}/{todos.length}
            </span>
          )}
        </button>
        <Tooltip text="Új todo">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCreateTodo(); }}
            className="flex items-center gap-1 rounded border border-border/20 px-1.5 py-1 text-muted-foreground/40 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-emerald-500"
          >
            <span className="text-[10px] font-bold leading-none">+</span>
            <Circle className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip text="Szerkesztés">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded border border-border/20 p-1 text-muted-foreground/40 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </Tooltip>
      </div>

      {open && (
        <div className="ml-4 mt-0.5 border-l border-border/30 pl-1">
          <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
            {todos.map((todo) => (
              <SortableTodoRow key={todo.id} todo={todo} onEdit={() => onEditTodo(todo)} />
            ))}
          </SortableContext>
          {todos.length === 0 && <DroppableEmptyZone id={containerId} />}
        </div>
      )}
    </div>
  );
}

// ─── ProjectRow ───────────────────────────────────────────────────────────────

type StagesData = { stages: Stage[] };

function SortableProjectRow({
  project,
  todos,
  stagesMap,
  onStagesLoaded,
  onCreateStage,
  onCreateTodo,
  onEdit,
  onAI,
  onEditStage,
  onEditTodo,
}: {
  project: Project;
  todos: Todo[];
  stagesMap: Record<string, Stage[]>;
  onStagesLoaded: (projectId: string, stages: Stage[]) => void;
  onCreateStage: () => void;
  onCreateTodo: (stageId?: string | null) => void;
  onEdit: () => void;
  onAI: () => void;
  onEditStage: (stage: Stage) => void;
  onEditTodo: (todo: Todo) => void;
}) {
  const [open, setOpen] = useState(false);

  const { data: stagesData, loading: stagesLoading } = useQuery<StagesData>(STAGES_QUERY, {
    variables: { projectId: project.id },
    skip: !open,
    onCompleted: (d) => onStagesLoaded(project.id, d.stages),
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pid(project.id),
    data: { kind: "project", item: project },
  });

  const stages = stagesMap[project.id] ?? stagesData?.stages ?? [];
  const total = todos.length;
  const done = todos.filter((t) => t.status === "DONE").length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const unstagedTodos = todos.filter((t) => !t.stageId);
  const stageIds = stages.map((s) => sid(s.id));

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("ml-5 border-l-2 border-border/30", isDragging && "opacity-40")}
    >
      <div className="flex items-center gap-1 rounded-r py-2 pl-2 pr-2 transition-colors hover:bg-muted/40">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground/30 active:cursor-grabbing shrink-0"
          tabIndex={-1}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform",
              open && "rotate-90",
            )}
          />
          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="flex-1 text-left text-sm font-semibold leading-snug">
            {project.name}
          </span>
          {total > 0 && (
            <span className="flex shrink-0 items-center gap-2">
              <span className="tabular-nums text-xs text-muted-foreground">{done}/{total}</span>
              <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-primary/50 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </span>
            </span>
          )}
        </button>
        {(stages.length > 0 || total === 0) && (
          <Tooltip text="Új stage">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCreateStage(); }}
              className="flex items-center gap-1 rounded border border-border/20 px-1.5 py-1 text-muted-foreground/40 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-blue-500"
            >
              <span className="text-[10px] font-bold leading-none">+</span>
              <Milestone className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}
        {(stages.length === 0 || total === 0) && (
          <Tooltip text="Új todo">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCreateTodo(null); }}
              className="flex items-center gap-1 rounded border border-border/20 px-1.5 py-1 text-muted-foreground/40 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-emerald-500"
            >
              <span className="text-[10px] font-bold leading-none">+</span>
              <Circle className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}
        <Tooltip text="AI terv generálása">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAI(); }}
            className="rounded border border-border/20 p-1 text-muted-foreground/40 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-purple-500"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip text="Szerkesztés">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded border border-border/20 p-1 text-muted-foreground/40 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>

      {open && (
        <div className="pb-1.5 pl-2 pr-1">
          {stagesLoading && !stages.length && (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Betöltés…
            </div>
          )}

          <SortableContext items={stageIds} strategy={verticalListSortingStrategy}>
            {stages.map((stage) => (
              <SortableStageSection
                key={stage.id}
                stage={stage}
                todos={todos.filter((t) => t.stageId === stage.id)}
                onCreateTodo={() => onCreateTodo(stage.id)}
                onEdit={() => onEditStage(stage)}
                onEditTodo={(todo) => onEditTodo(todo)}
              />
            ))}
          </SortableContext>
          {stages.length === 0 && !stagesLoading && (
            <DroppableEmptyZone id={cStages(project.id)} />
          )}

          {unstagedTodos.length > 0 && (
            <div className={cn(stages.length > 0 && "mt-1.5 border-t border-border/20 pt-1")}>
              {stages.length > 0 && (
                <div className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                  Stage nélkül
                </div>
              )}
              <SortableContext
                items={unstagedTodos.map((t) => tid(t.id))}
                strategy={verticalListSortingStrategy}
              >
                {unstagedTodos.map((todo) => (
                  <SortableTodoRow key={todo.id} todo={todo} onEdit={() => onEditTodo(todo)} />
                ))}
              </SortableContext>
            </div>
          )}

          {!stagesLoading && total === 0 && stages.length === 0 && (
            <DroppableEmptyZone id={cTodos(project.id, null)} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── EpicSection ──────────────────────────────────────────────────────────────

function SortableEpicSection({
  epic,
  projects,
  todos,
  stagesMap,
  onStagesLoaded,
  onCreateProject,
  onCreateStage,
  onCreateTodo,
  onEdit,
  onAI,
  onEditProject,
  onAIProject,
  onEditStage,
  onEditTodo,
}: {
  epic: Epic;
  projects: Project[];
  todos: Todo[];
  stagesMap: Record<string, Stage[]>;
  onStagesLoaded: (projectId: string, stages: Stage[]) => void;
  onCreateProject: () => void;
  onCreateStage: (projectId: string, projectName: string) => void;
  onCreateTodo: (projectId: string, stageId: string | null, projectName: string, stageName?: string) => void;
  onEdit: () => void;
  onAI: () => void;
  onEditProject: (project: Project) => void;
  onAIProject: (project: Project) => void;
  onEditStage: (stage: Stage) => void;
  onEditTodo: (todo: Todo) => void;
}) {
  const [open, setOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: eid(epic.id),
    data: { kind: "epic", item: epic },
  });

  const epicProjects = projects.filter((p) => p.epicId === epic.id);
  const epicTodos = todos.filter((t) => epicProjects.some((p) => p.id === t.projectId));
  const doneCount = epicTodos.filter((t) => t.status === "DONE").length;
  const projectIds = epicProjects.map((p) => pid(p.id));

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm",
        isDragging && "opacity-40 shadow-xl ring-2 ring-primary/30",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderLeftWidth: 4,
        borderLeftColor: epic.color ?? "#6366f1",
      }}
    >
      <div className="flex items-center gap-2 transition-colors hover:bg-muted/25">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab pl-3 py-3.5 text-muted-foreground/30 active:cursor-grabbing shrink-0"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 py-3.5 pr-4 text-left"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          <Layers3
            className="h-4 w-4 shrink-0"
            style={{ color: epic.color ?? "#6366f1" }}
          />
          <span className="flex-1 text-base font-bold tracking-tight">{epic.name}</span>
          <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
            {epicProjects.length} projekt · {doneCount}/{epicTodos.length}
          </span>
        </button>
        <Tooltip text="Új project">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCreateProject(); }}
            className="flex items-center gap-1 rounded border border-border/20 px-1.5 py-1 text-muted-foreground/40 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-primary"
          >
            <span className="text-[10px] font-bold leading-none">+</span>
            <FolderKanban className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip text="AI terv generálása">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAI(); }}
            className="rounded border border-border/20 p-1.5 text-muted-foreground/40 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-purple-500"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip text="Szerkesztés">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="mr-3 rounded border border-border/20 p-1.5 text-muted-foreground/40 transition-colors hover:border-border/50 hover:bg-muted/50 hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      {open && (
        <div className="border-t border-border/30 bg-muted/10 py-2 pr-2">
          <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
            {epicProjects.map((project) => (
              <SortableProjectRow
                key={project.id}
                project={project}
                todos={todos.filter((t) => t.projectId === project.id)}
                stagesMap={stagesMap}
                onStagesLoaded={onStagesLoaded}
                onCreateStage={() => onCreateStage(project.id, project.name)}
                onCreateTodo={(stageId) => {
                  const stageName = stageId ? (stagesMap[project.id]?.find((s) => s.id === stageId)?.name) : undefined;
                  onCreateTodo(project.id, stageId ?? null, project.name, stageName);
                }}
                onEdit={() => onEditProject(project)}
                onAI={() => onAIProject(project)}
                onEditStage={(stage) => onEditStage(stage)}
                onEditTodo={(todo) => onEditTodo(todo)}
              />
            ))}
          </SortableContext>
          {epicProjects.length === 0 && <DroppableEmptyZone id={cProjects(epic.id)} />}
        </div>
      )}
    </div>
  );
}

// ─── DragOverlay content ──────────────────────────────────────────────────────

function OverlayContent({ active }: { active: ActiveItem }) {
  if (active.kind === "todo") {
    return (
      <div className="w-[420px] rounded-md border border-border bg-card shadow-xl ring-1 ring-primary/20">
        <TodoContent todo={active.item} isDragging />
      </div>
    );
  }
  if (active.kind === "stage") {
    return (
      <div className="w-[380px] rounded-md border border-border bg-card px-3 py-2 shadow-xl ring-1 ring-primary/20">
        <div className="flex items-center gap-2">
          <Milestone className={cn("h-3.5 w-3.5", stageStatusIcon[active.item.status])} />
          <span className={cn("text-[11px] font-semibold uppercase tracking-widest", stageStatusText[active.item.status])}>
            {active.item.name}
          </span>
        </div>
      </div>
    );
  }
  if (active.kind === "project") {
    return (
      <div className="w-[400px] rounded-md border border-border bg-card px-3 py-2.5 shadow-xl ring-1 ring-primary/20">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-sm font-semibold">{active.item.name}</span>
        </div>
      </div>
    );
  }
  if (active.kind === "epic") {
    return (
      <div
        className="w-[440px] rounded-lg border border-border/60 bg-card px-4 py-3.5 shadow-xl ring-1 ring-primary/20"
        style={{ borderLeftWidth: 4, borderLeftColor: active.item.color ?? "#6366f1" }}
      >
        <div className="flex items-center gap-3">
          {active.item.color && (
            <Layers3 className="h-4 w-4 shrink-0" style={{ color: active.item.color ?? "#6366f1" }} />
          )}
          <span className="text-base font-bold">{active.item.name}</span>
        </div>
      </div>
    );
  }
  return null;
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const client = useApolloClient();
  const { data, loading, error, refetch } = useQuery<WorkspaceData>(WORKSPACE_QUERY);

  const [epics, setEpics] = useState<Epic[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stagesMap, setStagesMap] = useState<Record<string, Stage[]>>({});
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const refetchWorkspace = useCallback(() => { void refetch(); }, [refetch]);

  const refetchStages = useCallback(async (projectId: string) => {
    const result = await client.query<StagesData>({
      query: STAGES_QUERY,
      variables: { projectId },
      fetchPolicy: "network-only",
    });
    setStagesMap((prev) => ({
      ...prev,
      [projectId]: [...result.data.stages].sort((a, b) => a.position - b.position),
    }));
  }, [client]);

  useEffect(() => {
    if (!data) return;
    setEpics([...data.epics].sort((a, b) => a.position - b.position));
    setProjects([...data.projects].sort((a, b) => a.position - b.position));
    setTodos([...data.todos].sort((a, b) => a.position - b.position));
  }, [data]);

  const [doUpdateEpic] = useMutation(UPDATE_EPIC_MUTATION);
  const [doUpdateProject] = useMutation(UPDATE_PROJECT_MUTATION);
  const [doUpdateStage] = useMutation(UPDATE_STAGE_MUTATION);
  const [doUpdateTodo] = useMutation(UPDATE_TODO_MUTATION);

  const handleStagesLoaded = useCallback((projectId: string, stages: Stage[]) => {
    setStagesMap((prev) => ({
      ...prev,
      [projectId]: [...stages].sort((a, b) => a.position - b.position),
    }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as { kind: string; item: unknown };
      setActiveItem(data as ActiveItem);
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeData = active.data.current as { kind: string; item: Epic & Project & Stage & Todo };
      const overId = over.id as string;

      // ── Epics ──────────────────────────────────────────────────────────────
      if (activeData.kind === "epic" && overId.startsWith("e:")) {
        const fromIdx = epics.findIndex((e) => e.id === activeData.item.id);
        const toIdx = epics.findIndex((e) => eid(e.id) === overId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
        const next = arrayMove(epics, fromIdx, toIdx);
        setEpics(next);
        void Promise.all(next.map((e, i) => doUpdateEpic({ variables: { id: e.id, input: { position: i * 10 } } })));
        return;
      }

      // ── Projects ───────────────────────────────────────────────────────────
      if (activeData.kind === "project") {
        const fromProject = activeData.item as Project;

        if (overId.startsWith("p:")) {
          const toProject = projects.find((p) => pid(p.id) === overId);
          if (!toProject) return;

          if (fromProject.epicId === toProject.epicId) {
            // Same epic: reorder
            const epicProjs = projects.filter((p) => p.epicId === fromProject.epicId);
            const fi = epicProjs.findIndex((p) => p.id === fromProject.id);
            const ti = epicProjs.findIndex((p) => p.id === toProject.id);
            if (fi === ti) return;
            const reordered = arrayMove(epicProjs, fi, ti);
            setProjects((prev) => [
              ...prev.filter((p) => p.epicId !== fromProject.epicId),
              ...reordered,
            ]);
            void Promise.all(reordered.map((p, i) => doUpdateProject({ variables: { id: p.id, input: { position: i * 10 } } })));
          } else {
            // Different epic: move + insert at that position
            const newEpicId = toProject.epicId;
            const targetProjs = projects.filter((p) => p.epicId === newEpicId);
            const insertAt = targetProjs.findIndex((p) => p.id === toProject.id);
            const withMoved = [
              ...targetProjs.slice(0, insertAt),
              { ...fromProject, epicId: newEpicId },
              ...targetProjs.slice(insertAt),
            ];
            setProjects((prev) => [
              ...prev.filter((p) => p.id !== fromProject.id && p.epicId !== newEpicId),
              ...withMoved,
            ]);
            void Promise.all(
              withMoved.map((p, i) =>
                doUpdateProject({ variables: { id: p.id, input: { ...(p.id === fromProject.id ? { epicId: newEpicId } : {}), position: i * 10 } } }),
              ),
            );
          }
          return;
        }

        if (overId.startsWith("c:projects:")) {
          // Dropped on empty epic container
          const epicIdStr = overId.slice(11);
          const newEpicId = epicIdStr === "orphan" ? null : epicIdStr;
          const targetProjs = projects.filter((p) => p.epicId === newEpicId);
          setProjects((prev) => prev.map((p) => (p.id === fromProject.id ? { ...p, epicId: newEpicId } : p)));
          void doUpdateProject({ variables: { id: fromProject.id, input: { epicId: newEpicId, position: targetProjs.length * 10 } } });
          return;
        }
      }

      // ── Stages (only within same project) ──────────────────────────────────
      if (activeData.kind === "stage" && overId.startsWith("s:")) {
        const fromStage = activeData.item as Stage;
        const projectStages = stagesMap[fromStage.projectId] ?? [];
        const toStage = projectStages.find((s) => sid(s.id) === overId);
        if (!toStage) return;
        const fi = projectStages.findIndex((s) => s.id === fromStage.id);
        const ti = projectStages.findIndex((s) => s.id === toStage.id);
        if (fi === ti) return;
        const next = arrayMove(projectStages, fi, ti);
        setStagesMap((prev) => ({ ...prev, [fromStage.projectId]: next }));
        void Promise.all(next.map((s, i) => doUpdateStage({ variables: { id: s.id, input: { position: i * 10 } } })));
        return;
      }

      // ── Todos ──────────────────────────────────────────────────────────────
      if (activeData.kind === "todo") {
        const fromTodo = activeData.item as Todo;

        const getContainer = (projectId: string | null, stageId: string | null) =>
          todos.filter((t) => t.projectId === projectId && t.stageId === stageId).sort((a, b) => a.position - b.position);

        if (overId.startsWith("t:")) {
          const toTodo = todos.find((t) => tid(t.id) === overId);
          if (!toTodo) return;

          const sameContainer = fromTodo.projectId === toTodo.projectId && fromTodo.stageId === toTodo.stageId;

          if (sameContainer) {
            const container = getContainer(fromTodo.projectId, fromTodo.stageId);
            const fi = container.findIndex((t) => t.id === fromTodo.id);
            const ti = container.findIndex((t) => t.id === toTodo.id);
            if (fi === ti) return;
            const next = arrayMove(container, fi, ti);
            setTodos((prev) => [
              ...prev.filter((t) => !(t.projectId === fromTodo.projectId && t.stageId === fromTodo.stageId)),
              ...next,
            ]);
            void Promise.all(next.map((t, i) => doUpdateTodo({ variables: { id: t.id, input: { position: i * 10 } } })));
          } else {
            // Cross-container: move todo to toTodo's container
            const newProjectId = toTodo.projectId;
            const newStageId = toTodo.stageId;
            const targetContainer = getContainer(newProjectId, newStageId).filter((t) => t.id !== fromTodo.id);
            const insertAt = targetContainer.findIndex((t) => t.id === toTodo.id);
            const withMoved = [
              ...targetContainer.slice(0, insertAt),
              { ...fromTodo, projectId: newProjectId, stageId: newStageId },
              ...targetContainer.slice(insertAt),
            ];
            setTodos((prev) => [
              ...prev.filter(
                (t) => t.id !== fromTodo.id && !(t.projectId === newProjectId && t.stageId === newStageId),
              ),
              ...withMoved,
            ]);
            void Promise.all(
              withMoved.map((t, i) =>
                doUpdateTodo({ variables: { id: t.id, input: { ...(t.id === fromTodo.id ? { projectId: newProjectId, stageId: newStageId } : {}), position: i * 10 } } }),
              ),
            );
          }
          return;
        }

        if (overId.startsWith("c:todos:")) {
          // Dropped onto empty container
          const parts = overId.slice(8).split(":");
          const newProjectId = parts[0] === "null" ? null : parts[0];
          const newStageId = parts[1] === "null" ? null : parts[1];
          const targetContainer = getContainer(newProjectId, newStageId);
          setTodos((prev) =>
            prev.map((t) => (t.id === fromTodo.id ? { ...t, projectId: newProjectId, stageId: newStageId } : t)),
          );
          void doUpdateTodo({ variables: { id: fromTodo.id, input: { projectId: newProjectId, stageId: newStageId, position: targetContainer.length * 10 } } });
          return;
        }
      }
    },
    [epics, projects, todos, stagesMap, doUpdateEpic, doUpdateProject, doUpdateStage, doUpdateTodo],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Nem sikerült betölteni az adatokat.
      </div>
    );
  }

  const orphanProjects = projects.filter((p) => !p.epicId);
  const orphanTodos = todos.filter(
    (t) => !t.projectId || !projects.some((p) => p.id === t.projectId),
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl space-y-2 px-4 py-4 pb-8">

            {/* ── Új Epic gomb ── */}
            <div className="flex justify-end pb-1">
              <Tooltip text="Új epic">
                <button
                  type="button"
                  onClick={() => setDialog({ kind: "epic" })}
                  className="flex items-center gap-1 rounded border border-border/30 px-1.5 py-1 text-muted-foreground/50 transition-colors hover:border-border hover:bg-muted/50 hover:text-primary"
                >
                  <span className="text-[10px] font-bold leading-none">+</span>
                  <Layers3 className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>

            <SortableContext items={epics.map((e) => eid(e.id))} strategy={verticalListSortingStrategy}>
              {epics.map((epic) => (
                <SortableEpicSection
                  key={epic.id}
                  epic={epic}
                  projects={projects}
                  todos={todos}
                  stagesMap={stagesMap}
                  onStagesLoaded={handleStagesLoaded}
                  onCreateProject={() => setDialog({ kind: "project", epicId: epic.id, epicName: epic.name })}
                  onCreateStage={(projectId, projectName) => setDialog({ kind: "stage", projectId, projectName })}
                  onCreateTodo={(projectId, stageId, projectName, stageName) =>
                    setDialog({ kind: "todo", projectId, stageId, projectName, stageName })
                  }
                  onEdit={() => setDialog({ kind: "edit-epic", item: epic })}
                  onAI={() => setDialog({ kind: "ai-epic", item: epic })}
                  onEditProject={(project) => setDialog({ kind: "edit-project", item: project })}
                  onAIProject={(project) => setDialog({ kind: "ai-project", item: project })}
                  onEditStage={(stage) => setDialog({ kind: "edit-stage", item: stage })}
                  onEditTodo={(todo) => setDialog({ kind: "edit-todo", item: todo })}
                />
              ))}
            </SortableContext>

            {orphanProjects.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
                <div className="border-b border-border/30 px-4 py-3.5">
                  <span className="text-base font-bold text-muted-foreground">
                    Epic nélküli projektek
                  </span>
                </div>
                <div className="bg-muted/10 py-2 pr-2">
                  <SortableContext
                    items={orphanProjects.map((p) => pid(p.id))}
                    strategy={verticalListSortingStrategy}
                  >
                    {orphanProjects.map((project) => (
                      <SortableProjectRow
                        key={project.id}
                        project={project}
                        todos={todos.filter((t) => t.projectId === project.id)}
                        stagesMap={stagesMap}
                        onStagesLoaded={handleStagesLoaded}
                        onCreateStage={() => setDialog({ kind: "stage", projectId: project.id, projectName: project.name })}
                        onCreateTodo={(stageId) => {
                          const stageName = stageId ? stagesMap[project.id]?.find((s) => s.id === stageId)?.name : undefined;
                          setDialog({ kind: "todo", projectId: project.id, stageId: stageId ?? null, projectName: project.name, stageName });
                        }}
                        onEdit={() => setDialog({ kind: "edit-project", item: project })}
                        onAI={() => setDialog({ kind: "ai-project", item: project })}
                        onEditStage={(stage) => setDialog({ kind: "edit-stage", item: stage })}
                        onEditTodo={(todo) => setDialog({ kind: "edit-todo", item: todo })}
                      />
                    ))}
                  </SortableContext>
                </div>
              </div>
            )}

            {orphanTodos.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
                <div className="border-b border-border/30 px-4 py-3.5">
                  <span className="text-base font-bold text-muted-foreground">Inbox</span>
                </div>
                <div className="bg-muted/10 px-2 py-2">
                  <SortableContext
                    items={orphanTodos.map((t) => tid(t.id))}
                    strategy={verticalListSortingStrategy}
                  >
                    {orphanTodos.map((todo) => (
                      <SortableTodoRow key={todo.id} todo={todo} onEdit={() => setDialog({ kind: "edit-todo", item: todo })} />
                    ))}
                  </SortableContext>
                </div>
              </div>
            )}

            {epics.length === 0 && orphanProjects.length === 0 && orphanTodos.length === 0 && (
              <div className="py-20 text-center text-sm text-muted-foreground">
                Még nincsenek adatok.
              </div>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem && <OverlayContent active={activeItem} />}
        </DragOverlay>
      </DndContext>

      {/* ── Dialógok ── */}
      <CreateEpicDialog
        open={dialog?.kind === "epic"}
        onClose={() => setDialog(null)}
        onSuccess={() => { setDialog(null); refetchWorkspace(); }}
      />

      <CreateProjectDialog
        open={dialog?.kind === "project"}
        epicId={dialog?.kind === "project" ? dialog.epicId : null}
        epicName={dialog?.kind === "project" ? dialog.epicName : undefined}
        onClose={() => setDialog(null)}
        onSuccess={() => { setDialog(null); refetchWorkspace(); }}
      />

      <CreateStageDialog
        open={dialog?.kind === "stage"}
        projectId={dialog?.kind === "stage" ? dialog.projectId : ""}
        projectName={dialog?.kind === "stage" ? dialog.projectName : undefined}
        onClose={() => setDialog(null)}
        onSuccess={(projectId) => { setDialog(null); void refetchStages(projectId); }}
      />

      <CreateTodoDialog
        open={dialog?.kind === "todo"}
        projectId={dialog?.kind === "todo" ? dialog.projectId : null}
        stageId={dialog?.kind === "todo" ? dialog.stageId : null}
        projectName={dialog?.kind === "todo" ? dialog.projectName : undefined}
        stageName={dialog?.kind === "todo" ? dialog.stageName : undefined}
        onClose={() => setDialog(null)}
        onSuccess={() => { setDialog(null); refetchWorkspace(); }}
      />

      <EditEpicDialog
        open={dialog?.kind === "edit-epic"}
        epic={dialog?.kind === "edit-epic" ? dialog.item : null}
        onClose={() => setDialog(null)}
        onSuccess={() => { setDialog(null); refetchWorkspace(); }}
      />

      <EditProjectDialog
        open={dialog?.kind === "edit-project"}
        project={dialog?.kind === "edit-project" ? dialog.item : null}
        onClose={() => setDialog(null)}
        onSuccess={() => { setDialog(null); refetchWorkspace(); }}
      />

      <EditStageDialog
        open={dialog?.kind === "edit-stage"}
        stage={dialog?.kind === "edit-stage" ? dialog.item : null}
        onClose={() => setDialog(null)}
        onSuccess={(projectId) => { setDialog(null); void refetchStages(projectId); }}
      />

      <EditTodoDialog
        open={dialog?.kind === "edit-todo"}
        todo={dialog?.kind === "edit-todo" ? dialog.item : null}
        onClose={() => setDialog(null)}
        onSuccess={() => { setDialog(null); refetchWorkspace(); }}
      />

      <AIProposalDialog
        open={dialog?.kind === "ai-epic" || dialog?.kind === "ai-project"}
        parentType={dialog?.kind === "ai-epic" ? "EPIC" : "PROJECT"}
        parentId={dialog?.kind === "ai-epic" || dialog?.kind === "ai-project" ? dialog.item.id : ""}
        parentName={dialog?.kind === "ai-epic" || dialog?.kind === "ai-project" ? dialog.item.name : ""}
        onClose={() => setDialog(null)}
        onSuccess={() => { setDialog(null); refetchWorkspace(); }}
      />
    </>
  );
}
