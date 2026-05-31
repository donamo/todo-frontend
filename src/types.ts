export type ProjectStatus = "ACTIVE" | "PAUSED" | "DONE" | "ARCHIVED";
export type StageStatus = "PLANNED" | "IN_PROGRESS" | "DONE";
export type TodoPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type TodoStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";
export type Recurrence = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type Epic = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
};

export type Project = {
  id: string;
  epicId: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  targetDate: string | null;
  position: number;
};

export type Stage = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: StageStatus;
  startDate: string | null;
  targetDate: string | null;
  position: number;
};

export type Label = {
  id: string;
  name: string;
  color: string | null;
};

export type Todo = {
  id: string;
  projectId: string | null;
  stageId: string | null;
  title: string;
  description: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  labels: Label[];
  startDate: string | null;
  dueDate: string | null;
  estimatedEffort: string | null;
  position: number;
  nextAction: boolean;
  milestone: boolean;
  recurrence: Recurrence;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Dashboard = {
  openTodos: number;
  overdueTodos: number;
  nextActions: number;
  activeProjects: number;
  upcomingDeadlines: number;
};

export type Progress = {
  total: number;
  done: number;
  percent: number;
};

export type ProjectNote = {
  id: string;
  projectId: string;
  body: string;
  createdAt: string;
};

export type AIStatusReport = {
  summary: string;
  ready: boolean;
};

export type AIProposalParentType = "EPIC" | "PROJECT";
export type AIProposalStatus = "DRAFT" | "APPLIED";

export type AIProposal = {
  id: string;
  parentType: AIProposalParentType;
  parentId: string;
  magicText: string;
  summary: string;
  proposalJson: string;
  status: AIProposalStatus;
  createdAt: string;
  appliedAt: string | null;
};

export type WorkspaceData = {
  dashboard: Dashboard;
  epics: Epic[];
  projects: Project[];
  labels: Label[];
  todos: Todo[];
};
