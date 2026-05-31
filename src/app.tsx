import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FolderKanban,
  Inbox,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Select } from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import {
  ADD_TODO_LABEL_MUTATION,
  CREATE_EPIC_MUTATION,
  CREATE_LABEL_MUTATION,
  CREATE_PROJECT_MUTATION,
  CREATE_PROJECT_NOTE_MUTATION,
  CREATE_STAGE_MUTATION,
  CREATE_TODO_MUTATION,
  DELETE_TODO_MUTATION,
  MARK_TODO_DONE_MUTATION,
  PROJECT_DETAILS_QUERY,
  SET_TODO_NEXT_ACTION_MUTATION,
  UPDATE_TODO_MUTATION,
  WORKSPACE_QUERY,
} from "./graphql/todo";
import { API_BASE_URL } from "./lib/config";
import { cn } from "./lib/utils";
import type {
  AIStatusReport,
  Dashboard,
  Epic,
  Label,
  Progress,
  Project,
  ProjectNote,
  ProjectStatus,
  Stage,
  StageStatus,
  Todo,
  TodoPriority,
  TodoStatus,
} from "./types";

type ViewKey = "dashboard" | "inbox" | "next" | "open" | "overdue" | "projects" | "done";
type SortKey = "manual" | "priority" | "dueDate" | "createdAt" | "updatedAt";

type WorkspaceData = {
  dashboard: Dashboard;
  epics: Epic[];
  projects: Project[];
  labels: Label[];
  todos: Todo[];
};

type ProjectDetailsData = {
  stages: Stage[];
  projectNotes: ProjectNote[];
  projectProgress: Progress;
  aiStatusReport: AIStatusReport;
};

type QuickTodoState = {
  title: string;
  description: string;
  projectId: string;
  stageId: string;
  priority: TodoPriority;
  dueDate: string;
  estimatedEffort: string;
  labelId: string;
  nextAction: boolean;
  milestone: boolean;
};

const priorityLabel: Record<TodoPriority, string> = {
  LOW: "Alacsony",
  NORMAL: "Normál",
  HIGH: "Magas",
  CRITICAL: "Kritikus",
};

const statusLabel: Record<TodoStatus, string> = {
  OPEN: "Nyitott",
  IN_PROGRESS: "Folyamatban",
  DONE: "Kész",
  BLOCKED: "Blokkolt",
};

const projectStatusLabel: Record<ProjectStatus, string> = {
  ACTIVE: "Aktív",
  PAUSED: "Szünetel",
  DONE: "Lezárt",
  ARCHIVED: "Archivált",
};

const stageStatusLabel: Record<StageStatus, string> = {
  PLANNED: "Tervezett",
  IN_PROGRESS: "Folyamatban",
  DONE: "Kész",
};

const viewLabel: Record<ViewKey, string> = {
  dashboard: "Dashboard",
  inbox: "Inbox",
  next: "Következő",
  open: "Minden nyitott",
  overdue: "Lejárt",
  projects: "Projektek",
  done: "Kész",
};

const statusTone: Record<TodoStatus, string> = {
  OPEN: "border-border bg-secondary text-secondary-foreground",
  IN_PROGRESS: "border-primary/40 bg-primary/10 text-primary",
  DONE: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700",
  BLOCKED: "border-destructive/40 bg-destructive/10 text-red-700",
};

const priorityWeight: Record<TodoPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

const isOverdue = (todo: Todo, today: string) =>
  Boolean(todo.dueDate && todo.dueDate.slice(0, 10) < today && todo.status !== "DONE");

const toDateInput = (value: string | null) => value?.slice(0, 10) ?? "";

const optional = (value: string) => (value.trim() ? value.trim() : undefined);

const compactInput = <T extends Record<string, unknown>>(input: T) =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== "")) as Partial<T>;

const percentFromTodos = (todos: Todo[]) => {
  if (!todos.length) {
    return 0;
  }
  return Math.round((todos.filter((todo) => todo.status === "DONE").length / todos.length) * 100);
};

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-sm">
      <div className="font-medium text-foreground">{title}</div>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Inbox; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-2xl font-semibold leading-none">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickTodoForm({
  projects,
  stages,
  labels,
  defaultProjectId,
  onSaved,
}: {
  projects: Project[];
  stages: Stage[];
  labels: Label[];
  defaultProjectId: string;
  onSaved: () => Promise<void>;
}) {
  const [state, setState] = useState<QuickTodoState>({
    title: "",
    description: "",
    projectId: defaultProjectId,
    stageId: "",
    priority: "NORMAL",
    dueDate: "",
    estimatedEffort: "",
    labelId: "",
    nextAction: false,
    milestone: false,
  });
  const [createTodo, { loading }] = useMutation(CREATE_TODO_MUTATION);
  const [addTodoLabel] = useMutation(ADD_TODO_LABEL_MUTATION);

  useEffect(() => {
    setState((current) => ({
      ...current,
      projectId: current.projectId || defaultProjectId,
      stageId: current.projectId === defaultProjectId ? current.stageId : "",
    }));
  }, [defaultProjectId]);

  const projectStages = stages.filter((stage) => stage.projectId === state.projectId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!state.title.trim()) {
      return;
    }

    const result = await createTodo({
      variables: {
        input: compactInput({
          projectId: optional(state.projectId),
          stageId: optional(state.stageId),
          title: state.title.trim(),
          description: optional(state.description),
          priority: state.priority,
          dueDate: optional(state.dueDate),
          estimatedEffort: optional(state.estimatedEffort),
          nextAction: state.nextAction,
          milestone: state.milestone,
        }),
      },
    });

    const todoId = result.data?.createTodo?.id as string | undefined;
    if (todoId && state.labelId) {
      await addTodoLabel({ variables: { todoId, labelId: state.labelId } });
    }

    setState((current) => ({
      ...current,
      title: "",
      description: "",
      dueDate: "",
      estimatedEffort: "",
      labelId: "",
      nextAction: false,
      milestone: false,
    }));
    await onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gyors rögzítés</CardTitle>
        <CardDescription>Inboxba, projecthez vagy stage-hez menthető feladat.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
          <Input
            value={state.title}
            onChange={(event) => setState({ ...state, title: event.target.value })}
            placeholder="Új todo címe"
          />
          <Textarea
            value={state.description}
            onChange={(event) => setState({ ...state, description: event.target.value })}
            placeholder="Rövid leírás"
            rows={3}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Project">
              <Select
                value={state.projectId}
                onChange={(event) => setState({ ...state, projectId: event.target.value, stageId: "" })}
              >
                <option value="">Inbox</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Stage">
              <Select
                value={state.stageId}
                onChange={(event) => setState({ ...state, stageId: event.target.value })}
                disabled={!state.projectId}
              >
                <option value="">Nincs stage</option>
                {projectStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prioritás">
              <Select
                value={state.priority}
                onChange={(event) => setState({ ...state, priority: event.target.value as TodoPriority })}
              >
                {Object.entries(priorityLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Határidő">
              <Input
                type="date"
                value={state.dueDate}
                onChange={(event) => setState({ ...state, dueDate: event.target.value })}
              />
            </Field>
            <Field label="Ráfordítás">
              <Input
                value={state.estimatedEffort}
                onChange={(event) => setState({ ...state, estimatedEffort: event.target.value })}
                placeholder="pl. 2 óra"
              />
            </Field>
            <Field label="Label">
              <Select value={state.labelId} onChange={(event) => setState({ ...state, labelId: event.target.value })}>
                <option value="">Nincs label</option>
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.nextAction}
                  onChange={(event) => setState({ ...state, nextAction: event.target.checked })}
                />
                Következő
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.milestone}
                  onChange={(event) => setState({ ...state, milestone: event.target.checked })}
                />
                Mérföldkő
              </label>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Mentés
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CreatePanel({
  epics,
  projects,
  selectedProjectId,
  onSaved,
}: {
  epics: Epic[];
  projects: Project[];
  selectedProjectId: string;
  onSaved: () => Promise<void>;
}) {
  const [epicName, setEpicName] = useState("");
  const [epicColor, setEpicColor] = useState("#2dd4bf");
  const [projectName, setProjectName] = useState("");
  const [projectEpicId, setProjectEpicId] = useState("");
  const [projectTargetDate, setProjectTargetDate] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageProjectId, setStageProjectId] = useState(selectedProjectId);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#38bdf8");
  const [createEpic] = useMutation(CREATE_EPIC_MUTATION);
  const [createProject] = useMutation(CREATE_PROJECT_MUTATION);
  const [createStage] = useMutation(CREATE_STAGE_MUTATION);
  const [createLabel] = useMutation(CREATE_LABEL_MUTATION);

  useEffect(() => {
    setStageProjectId((current) => current || selectedProjectId);
  }, [selectedProjectId]);

  const submitEpic = async (event: FormEvent) => {
    event.preventDefault();
    if (!epicName.trim()) {
      return;
    }
    await createEpic({ variables: { input: { name: epicName.trim(), color: epicColor } } });
    setEpicName("");
    await onSaved();
  };

  const submitProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectName.trim()) {
      return;
    }
    await createProject({
      variables: {
        input: compactInput({
          epicId: optional(projectEpicId),
          name: projectName.trim(),
          targetDate: optional(projectTargetDate),
        }),
      },
    });
    setProjectName("");
    setProjectTargetDate("");
    await onSaved();
  };

  const submitStage = async (event: FormEvent) => {
    event.preventDefault();
    if (!stageName.trim() || !stageProjectId) {
      return;
    }
    await createStage({ variables: { input: { projectId: stageProjectId, name: stageName.trim() } } });
    setStageName("");
    await onSaved();
  };

  const submitLabel = async (event: FormEvent) => {
    event.preventDefault();
    if (!labelName.trim()) {
      return;
    }
    await createLabel({ variables: { input: { name: labelName.trim(), color: labelColor } } });
    setLabelName("");
    await onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Struktúra</CardTitle>
        <CardDescription>Epic, project, stage és label gyors létrehozása.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form className="grid gap-2" onSubmit={(event) => void submitEpic(event)}>
          <div className="flex gap-2">
            <Input value={epicName} onChange={(event) => setEpicName(event.target.value)} placeholder="Epic neve" />
            <Input
              className="w-16 p-1"
              type="color"
              value={epicColor}
              onChange={(event) => setEpicColor(event.target.value)}
              title="Epic szín"
            />
            <Button size="icon" type="submit" title="Epic létrehozása">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </form>
        <form className="grid gap-2" onSubmit={(event) => void submitProject(event)}>
          <Input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project neve"
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
            <Select value={projectEpicId} onChange={(event) => setProjectEpicId(event.target.value)}>
              <option value="">Epic nélkül</option>
              {epics.map((epic) => (
                <option key={epic.id} value={epic.id}>
                  {epic.name}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={projectTargetDate}
              onChange={(event) => setProjectTargetDate(event.target.value)}
            />
            <Button type="submit">
              <FolderKanban className="h-4 w-4" />
              Project
            </Button>
          </div>
        </form>
        <form className="grid gap-2" onSubmit={(event) => void submitStage(event)}>
          <Input value={stageName} onChange={(event) => setStageName(event.target.value)} placeholder="Stage neve" />
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Select value={stageProjectId} onChange={(event) => setStageProjectId(event.target.value)}>
              <option value="">Válassz projectet</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={!stageProjectId}>
              <Plus className="h-4 w-4" />
              Stage
            </Button>
          </div>
        </form>
        <form className="grid gap-2" onSubmit={(event) => void submitLabel(event)}>
          <div className="grid gap-2 sm:grid-cols-[1fr_64px_auto]">
            <Input value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="Label neve" />
            <Input
              className="p-1"
              type="color"
              value={labelColor}
              onChange={(event) => setLabelColor(event.target.value)}
              title="Label szín"
            />
            <Button type="submit">
              <Tag className="h-4 w-4" />
              Label
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TodoList({
  todos,
  projects,
  stages,
  onSelect,
  selectedTodoId,
  onStatus,
  onPriority,
  onDone,
  onNextAction,
  onDelete,
}: {
  todos: Todo[];
  projects: Project[];
  stages: Stage[];
  onSelect: (todo: Todo) => void;
  selectedTodoId: string;
  onStatus: (todo: Todo, status: TodoStatus) => Promise<void>;
  onPriority: (todo: Todo, priority: TodoPriority) => Promise<void>;
  onDone: (todo: Todo) => Promise<void>;
  onNextAction: (todo: Todo) => Promise<void>;
  onDelete: (todo: Todo) => Promise<void>;
}) {
  const projectById = new Map(projects.map((project) => [project.id, project.name]));
  const stageById = new Map(stages.map((stage) => [stage.id, stage.name]));

  if (!todos.length) {
    return <EmptyState title="Nincs feladat ebben a nézetben" description="Rögzíts új todo-t vagy módosítsd a szűrőket." />;
  }

  return (
    <div className="grid gap-2">
      {todos.map((todo) => (
        <article
          key={todo.id}
          className={cn(
            "grid gap-3 rounded-lg border bg-card p-3 transition-colors md:grid-cols-[1fr_auto]",
            selectedTodoId === todo.id ? "border-primary" : "border-border hover:border-primary/50",
          )}
        >
          <button className="min-w-0 text-left" type="button" onClick={() => onSelect(todo)}>
            <div className="flex flex-wrap items-center gap-2">
              {todo.status === "DONE" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="min-w-0 truncate text-sm font-semibold">{todo.title}</h3>
              {todo.nextAction ? (
                <Badge className="border-primary/40 bg-primary/10 text-primary">
                  <Star className="mr-1 h-3 w-3" />
                  Következő
                </Badge>
              ) : null}
              {todo.milestone ? <Badge className="border-sky-600/40 bg-sky-600/10 text-sky-700">Mérföldkő</Badge> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge className={statusTone[todo.status]}>{statusLabel[todo.status]}</Badge>
              <Badge className="border-border bg-secondary text-secondary-foreground">{priorityLabel[todo.priority]}</Badge>
              <span>{todo.projectId ? projectById.get(todo.projectId) ?? "Ismeretlen project" : "Inbox"}</span>
              {todo.stageId ? <span>{stageById.get(todo.stageId) ?? "Stage"}</span> : null}
              {todo.dueDate ? <span>Határidő: {toDateInput(todo.dueDate)}</span> : null}
              {todo.labels.map((label) => (
                <span key={label.id} className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: label.color ?? "#94a3b8" }}
                  />
                  {label.name}
                </span>
              ))}
            </div>
          </button>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Select
              className="w-36"
              value={todo.status}
              onChange={(event) => void onStatus(todo, event.target.value as TodoStatus)}
              title="Státusz"
            >
              {Object.entries(statusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              className="w-32"
              value={todo.priority}
              onChange={(event) => void onPriority(todo, event.target.value as TodoPriority)}
              title="Prioritás"
            >
              {Object.entries(priorityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button size="icon" variant="outline" onClick={() => void onNextAction(todo)} title="Következő jelölés">
              <Star className={cn("h-4 w-4", todo.nextAction && "fill-primary text-primary")} />
            </Button>
            <Button size="icon" variant="outline" onClick={() => void onDone(todo)} title="Készre jelölés">
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => void onDelete(todo)} title="Todo törlése">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProjectColumn({
  epics,
  projects,
  todos,
  selectedProjectId,
  onSelectProject,
}: {
  epics: Epic[];
  projects: Project[];
  todos: Todo[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
}) {
  const epicById = new Map(epics.map((epic) => [epic.id, epic]));

  if (!projects.length) {
    return <EmptyState title="Nincs project" description="Hozz létre projectet a struktúra panelen." />;
  }

  return (
    <div className="grid gap-2">
      {projects.map((project) => {
        const projectTodos = todos.filter((todo) => todo.projectId === project.id);
        const percent = percentFromTodos(projectTodos);
        const epic = project.epicId ? epicById.get(project.epicId) : undefined;
        return (
          <button
            key={project.id}
            className={cn(
              "rounded-lg border bg-card p-3 text-left transition-colors",
              selectedProjectId === project.id ? "border-primary" : "border-border hover:border-primary/50",
            )}
            type="button"
            onClick={() => onSelectProject(project.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{project.name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{projectStatusLabel[project.status]}</span>
                  {epic ? <span>{epic.name}</span> : null}
                  {project.targetDate ? <span>Cél: {toDateInput(project.targetDate)}</span> : null}
                </div>
              </div>
              <span className="text-sm font-semibold text-primary">{percent}%</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function App() {
  const today = new Date().toISOString().slice(0, 10);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [sort, setSort] = useState<SortKey>("manual");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTodoId, setSelectedTodoId] = useState("");
  const [statusFilter, setStatusFilter] = useState<TodoStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | "">("");
  const [labelFilter, setLabelFilter] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const workspace = useQuery<WorkspaceData>(WORKSPACE_QUERY);
  const details = useQuery<ProjectDetailsData>(PROJECT_DETAILS_QUERY, {
    variables: { projectId: selectedProjectId },
    skip: !selectedProjectId,
  });
  const [updateTodo] = useMutation(UPDATE_TODO_MUTATION);
  const [markTodoDone] = useMutation(MARK_TODO_DONE_MUTATION);
  const [setTodoNextAction] = useMutation(SET_TODO_NEXT_ACTION_MUTATION);
  const [deleteTodo] = useMutation(DELETE_TODO_MUTATION);
  const [createProjectNote] = useMutation(CREATE_PROJECT_NOTE_MUTATION);

  const epics = workspace.data?.epics ?? [];
  const projects = workspace.data?.projects ?? [];
  const labels = workspace.data?.labels ?? [];
  const todos = workspace.data?.todos ?? [];
  const stages = details.data?.stages ?? [];
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);

  useEffect(() => {
    if (!selectedProjectId && projects.length) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedTodoId && todos.length) {
      setSelectedTodoId(todos[0].id);
    }
  }, [selectedTodoId, todos]);

  const refetchAll = async () => {
    await workspace.refetch();
    if (selectedProjectId) {
      await details.refetch({ projectId: selectedProjectId });
    }
  };

  const filteredTodos = useMemo(() => {
    let list = [...todos];
    if (view === "inbox") {
      list = list.filter((todo) => !todo.projectId);
    }
    if (view === "next") {
      list = list.filter((todo) => todo.nextAction);
    }
    if (view === "open") {
      list = list.filter((todo) => todo.status === "OPEN" || todo.status === "IN_PROGRESS");
    }
    if (view === "overdue") {
      list = list.filter((todo) => isOverdue(todo, today));
    }
    if (view === "projects" && selectedProjectId) {
      list = list.filter((todo) => todo.projectId === selectedProjectId);
    }
    if (view === "done") {
      list = list.filter((todo) => todo.status === "DONE");
    }
    if (statusFilter) {
      list = list.filter((todo) => todo.status === statusFilter);
    }
    if (priorityFilter) {
      list = list.filter((todo) => todo.priority === priorityFilter);
    }
    if (labelFilter) {
      list = list.filter((todo) => todo.labels.some((label) => label.id === labelFilter));
    }
    return list.sort((a, b) => {
      if (sort === "priority") {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      if (sort === "dueDate") {
        return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
      }
      if (sort === "createdAt") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (sort === "updatedAt") {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      return a.position - b.position;
    });
  }, [labelFilter, priorityFilter, selectedProjectId, sort, statusFilter, today, todos, view]);

  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProjectId || !noteBody.trim()) {
      return;
    }
    await createProjectNote({ variables: { input: { projectId: selectedProjectId, body: noteBody.trim() } } });
    setNoteBody("");
    await refetchAll();
  };

  const updateTodoField = async (todo: Todo, input: Partial<Todo>) => {
    await updateTodo({ variables: { id: todo.id, input } });
    await refetchAll();
  };

  const dashboard = workspace.data?.dashboard;
  const activeStages = stages.filter((stage) => stage.status !== "DONE");

  return (
    <>
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-end gap-2 px-4 py-2 border-b border-border/50">
        <Badge className="border-border bg-secondary text-secondary-foreground">API: {API_BASE_URL}</Badge>
        <Button variant="outline" size="sm" onClick={() => void refetchAll()}>
          <RefreshCw className="h-4 w-4" />
          Frissítés
        </Button>
      </div>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[280px_1fr_360px]">
        <aside className="grid gap-4 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Nézetek</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {(Object.keys(viewLabel) as ViewKey[]).map((key) => (
                <Button
                  key={key}
                  className="justify-start"
                  variant={view === key ? "default" : "ghost"}
                  onClick={() => setView(key)}
                >
                  {key === "inbox" ? <Inbox className="h-4 w-4" /> : <ListFilter className="h-4 w-4" />}
                  {viewLabel[key]}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Szűrés</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Státusz">
                <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TodoStatus | "")}>
                  <option value="">Mind</option>
                  {Object.entries(statusLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Prioritás">
                <Select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value as TodoPriority | "")}
                >
                  <option value="">Mind</option>
                  {Object.entries(priorityLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Label">
                <Select value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)}>
                  <option value="">Mind</option>
                  {labels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Rendezés">
                <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                  <option value="manual">Kézi sorrend</option>
                  <option value="priority">Prioritás</option>
                  <option value="dueDate">Határidő</option>
                  <option value="createdAt">Létrehozás</option>
                  <option value="updatedAt">Módosítás</option>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <CreatePanel
            epics={epics}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSaved={refetchAll}
          />
        </aside>

        <section className="grid min-w-0 gap-4 self-start">
          {workspace.loading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Adatok betöltése...
            </div>
          ) : null}
          {workspace.error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-red-200">
              GraphQL hiba: {workspace.error.message}
            </div>
          ) : null}

          {dashboard ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon={Circle} label="Nyitott" value={dashboard.openTodos} />
              <MetricCard icon={Clock3} label="Lejárt" value={dashboard.overdueTodos} />
              <MetricCard icon={Star} label="Következő" value={dashboard.nextActions} />
              <MetricCard icon={FolderKanban} label="Aktív project" value={dashboard.activeProjects} />
              <MetricCard icon={CalendarDays} label="Közeli határidő" value={dashboard.upcomingDeadlines} />
            </div>
          ) : null}

          <QuickTodoForm
            projects={projects}
            stages={stages}
            labels={labels}
            defaultProjectId={selectedProjectId}
            onSaved={refetchAll}
          />

          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Projektek</CardTitle>
                <CardDescription>{projects.length} project, {epics.length} epic</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectColumn
                  epics={epics}
                  projects={projects}
                  todos={todos}
                  selectedProjectId={selectedProjectId}
                  onSelectProject={setSelectedProjectId}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>{viewLabel[view]}</CardTitle>
                    <CardDescription>{filteredTodos.length} feladat a jelenlegi szűréssel</CardDescription>
                  </div>
                  {selectedProject ? (
                    <Badge className="border-primary/40 bg-primary/10 text-primary">{selectedProject.name}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <TodoList
                  todos={filteredTodos}
                  projects={projects}
                  stages={stages}
                  selectedTodoId={selectedTodoId}
                  onSelect={(todo) => setSelectedTodoId(todo.id)}
                  onStatus={(todo, status) => updateTodoField(todo, { status })}
                  onPriority={(todo, priority) => updateTodoField(todo, { priority })}
                  onDone={async (todo) => {
                    await markTodoDone({ variables: { id: todo.id } });
                    await refetchAll();
                  }}
                  onNextAction={async (todo) => {
                    await setTodoNextAction({ variables: { id: todo.id, nextAction: !todo.nextAction } });
                    await refetchAll();
                  }}
                  onDelete={async (todo) => {
                    await deleteTodo({ variables: { id: todo.id } });
                    await refetchAll();
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <aside className="grid gap-4 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Project fókusz</CardTitle>
              <CardDescription>{selectedProject?.name ?? "Nincs kiválasztott project"}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {details.loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Project adatok...
                </div>
              ) : null}
              {details.error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-200">
                  Project hiba: {details.error.message}
                </div>
              ) : null}
              {details.data?.projectProgress ? (
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>Előrehaladás</span>
                    <span className="font-semibold text-primary">{details.data.projectProgress.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${details.data.projectProgress.percent}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {details.data.projectProgress.done}/{details.data.projectProgress.total} kész
                  </div>
                </div>
              ) : null}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Stage-ek</h3>
                <div className="grid gap-2">
                  {activeStages.length ? (
                    activeStages.map((stage) => (
                      <div key={stage.id} className="rounded-md border border-border bg-secondary/40 p-2">
                        <div className="text-sm font-medium">{stage.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {stageStatusLabel[stage.status]}
                          {stage.targetDate ? ` · Cél: ${toDateInput(stage.targetDate)}` : ""}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nincs aktív stage.</p>
                  )}
                </div>
              </div>
              {details.data?.aiStatusReport ? (
                <div className="rounded-md border border-border bg-secondary/40 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI státusz
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {details.data.aiStatusReport.ready
                      ? details.data.aiStatusReport.summary
                      : "Az AI státusz jelentés még nem áll készen."}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Todo részletek</CardTitle>
              <CardDescription>{selectedTodo?.title ?? "Válassz feladatot"}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTodo ? (
                <div className="grid gap-3 text-sm">
                  <p className="text-muted-foreground">{selectedTodo.description || "Nincs leírás."}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Badge className={statusTone[selectedTodo.status]}>{statusLabel[selectedTodo.status]}</Badge>
                    <Badge className="border-border bg-secondary text-secondary-foreground">
                      {priorityLabel[selectedTodo.priority]}
                    </Badge>
                  </div>
                  <div className="grid gap-1 text-muted-foreground">
                    <span>Kezdés: {toDateInput(selectedTodo.startDate) || "-"}</span>
                    <span>Határidő: {toDateInput(selectedTodo.dueDate) || "-"}</span>
                    <span>Ráfordítás: {selectedTodo.estimatedEffort || "-"}</span>
                    <span>Ismétlődés: {selectedTodo.recurrence}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nincs kiválasztott todo.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project jegyzetek</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <form className="grid gap-2" onSubmit={(event) => void submitNote(event)}>
                <Textarea
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  placeholder="Jegyzet, URL, ötlet..."
                  disabled={!selectedProjectId}
                />
                <Button type="submit" disabled={!selectedProjectId}>
                  <Plus className="h-4 w-4" />
                  Jegyzet
                </Button>
              </form>
              <div className="grid gap-2">
                {details.data?.projectNotes.length ? (
                  details.data.projectNotes.map((note) => (
                    <div key={note.id} className="rounded-md border border-border bg-secondary/40 p-3 text-sm">
                      <p className="whitespace-pre-wrap">{note.body}</p>
                      <div className="mt-2 text-xs text-muted-foreground">{toDateInput(note.createdAt)}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nincs jegyzet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </>
  );
}
