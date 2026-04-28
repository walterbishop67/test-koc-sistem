export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface Label {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at?: string;
}

export interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string;
  position: string;
  priority?: Priority | null;
  assignee_email?: string | null;
  due_date?: string | null;
  sprint_id?: string | null;
  comment_count?: number;
  card_number?: number | null;
  labels?: Label[];
  created_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: string;
  cards: Card[];
  created_at: string;
}

export interface Board {
  id: string;
  owner_id: string;
  title: string;
  project_id?: string | null;
  created_at: string;
  is_archived?: boolean;
  team_names?: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  created_at: string;
}

export interface BoardMember {
  id: string;
  board_id: string;
  invited_email: string;
  user_id: string | null;
  role: string;
  status: string;
  created_at: string;
}

export interface Team {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  email: string;
  status: string;
  user_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users: { full_name: string | null; email: string };
}

export interface Sprint {
  id: string;
  board_id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  state: 'future' | 'active' | 'completed';
  created_at: string;
}

export interface PagedUsers {
  items: { id: string; email: string; full_name?: string | null }[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AIInsightsResponse {
  summary: string;
  suggestions: string[];
  risks: string[];
}

export interface GeneratedTask {
  title: string;
  description: string;
  priority: Priority;
}

export interface GeneratedColumn {
  name: string;
  tasks: GeneratedTask[];
}

export interface GenerateBoardResponse {
  columns: GeneratedColumn[];
}

export interface CardActivity {
  id: string;
  card_id: string;
  action: 'created' | 'moved' | 'priority_changed';
  from_col: string | null;
  to_col: string | null;
  from_priority: string | null;
  to_priority: string | null;
  user_name: string | null;
  created_at: string;
}
