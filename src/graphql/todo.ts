import { gql } from "@apollo/client";

const TODO_FIELDS = gql`
  fragment TodoFields on Todo {
    id
    projectId
    stageId
    title
    description
    priority
    status
    labels {
      id
      name
      color
    }
    startDate
    dueDate
    estimatedEffort
    position
    nextAction
    milestone
    recurrence
    completedAt
    createdAt
    updatedAt
  }
`;

export const WORKSPACE_QUERY = gql`
  ${TODO_FIELDS}
  query Workspace {
    dashboard {
      openTodos
      overdueTodos
      nextActions
      activeProjects
      upcomingDeadlines
    }
    epics {
      id
      name
      description
      color
      position
    }
    projects {
      id
      epicId
      name
      description
      status
      startDate
      targetDate
      position
    }
    labels {
      id
      name
      color
    }
    todos {
      ...TodoFields
    }
  }
`;

export const PROJECT_DETAILS_QUERY = gql`
  query ProjectDetails($projectId: ID!) {
    stages(projectId: $projectId) {
      id
      projectId
      name
      description
      status
      startDate
      targetDate
      position
    }
    projectNotes(projectId: $projectId) {
      id
      projectId
      body
      createdAt
    }
    projectProgress(projectId: $projectId) {
      total
      done
      percent
    }
    aiStatusReport(projectId: $projectId) {
      summary
      ready
    }
  }
`;

export const STAGES_QUERY = gql`
  query Stages($projectId: ID!) {
    stages(projectId: $projectId) {
      id
      projectId
      name
      status
      position
    }
  }
`;

export const UPDATE_EPIC_MUTATION = gql`
  mutation UpdateEpic($id: ID!, $input: UpdateEpicInput!) {
    updateEpic(id: $id, input: $input) {
      id
      name
      color
      description
      position
    }
  }
`;

export const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      epicId
      name
      description
      status
      position
    }
  }
`;

export const UPDATE_STAGE_MUTATION = gql`
  mutation UpdateStage($id: ID!, $input: UpdateStageInput!) {
    updateStage(id: $id, input: $input) {
      id
      name
      status
      position
    }
  }
`;

export const CREATE_EPIC_MUTATION = gql`
  mutation CreateEpic($input: CreateEpicInput!) {
    createEpic(input: $input) {
      id
    }
  }
`;

export const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
    }
  }
`;

export const CREATE_STAGE_MUTATION = gql`
  mutation CreateStage($input: CreateStageInput!) {
    createStage(input: $input) {
      id
    }
  }
`;

export const CREATE_TODO_MUTATION = gql`
  ${TODO_FIELDS}
  mutation CreateTodo($input: CreateTodoInput!) {
    createTodo(input: $input) {
      ...TodoFields
    }
  }
`;

export const UPDATE_TODO_MUTATION = gql`
  ${TODO_FIELDS}
  mutation UpdateTodo($id: ID!, $input: UpdateTodoInput!) {
    updateTodo(id: $id, input: $input) {
      ...TodoFields
    }
  }
`;

export const MARK_TODO_DONE_MUTATION = gql`
  ${TODO_FIELDS}
  mutation MarkTodoDone($id: ID!) {
    markTodoDone(id: $id) {
      ...TodoFields
    }
  }
`;

export const SET_TODO_NEXT_ACTION_MUTATION = gql`
  ${TODO_FIELDS}
  mutation SetTodoNextAction($id: ID!, $nextAction: Boolean!) {
    setTodoNextAction(id: $id, nextAction: $nextAction) {
      ...TodoFields
    }
  }
`;

export const DELETE_TODO_MUTATION = gql`
  mutation DeleteTodo($id: ID!) {
    deleteTodo(id: $id)
  }
`;

export const CREATE_LABEL_MUTATION = gql`
  mutation CreateLabel($input: CreateLabelInput!) {
    createLabel(input: $input) {
      id
    }
  }
`;

export const ADD_TODO_LABEL_MUTATION = gql`
  ${TODO_FIELDS}
  mutation AddTodoLabel($todoId: ID!, $labelId: ID!) {
    addTodoLabel(todoId: $todoId, labelId: $labelId) {
      ...TodoFields
    }
  }
`;

export const CREATE_PROJECT_NOTE_MUTATION = gql`
  mutation CreateProjectNote($input: CreateProjectNoteInput!) {
    createProjectNote(input: $input) {
      id
    }
  }
`;

export const GENERATE_AI_PROPOSAL_MUTATION = gql`
  mutation GenerateAIProposal($input: GenerateAIProposalInput!) {
    generateAIProposal(input: $input) {
      id
      parentType
      parentId
      magicText
      summary
      proposalJson
      status
    }
  }
`;

export const ACCEPT_AI_PROPOSAL_MUTATION = gql`
  mutation AcceptAIProposal($id: ID!) {
    acceptAIProposal(id: $id) {
      id
      status
      appliedAt
    }
  }
`;
