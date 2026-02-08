import { api } from '@/store/api/internalApi';

// Types
export interface PointAction {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  default_points: number;
  is_enabled: boolean;
  icon: string | null;
  category: string | null;
  team_setting?: {
    points: number;
    is_enabled: boolean;
  };
  effective_points: number;
  created_at: string;
  updated_at: string;
}

export interface UserPoints {
  id: number;
  user_id: number;
  team_id: number;
  total_points: number;
  rank: number | null;
  weekly_points: number;
  monthly_points: number;
  last_activity_at: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: number;
  user_id: number;
  team_id: number;
  point_action_id: number;
  points: number;
  description: string | null;
  reference_type: string | null;
  reference_id: number | null;
  metadata: Record<string, unknown> | null;
  action?: {
    id: number;
    slug: string;
    name: string;
    icon: string | null;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
  };
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number | null;
  user_id: number;
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export interface PointsSummary {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  rank: number | null;
  total_users: number;
  last_activity_at: string | null;
}

// API Response types
interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
  message: string;
  status: number;
}

// Leaderboard API
export const getLeaderboard = async (teamId?: number, limit = 10): Promise<LeaderboardEntry[]> => {
  const params = new URLSearchParams();
  if (teamId) params.append('team_id', String(teamId));
  params.append('limit', String(limit));
  
  const response = await api.get<ApiResponse<LeaderboardEntry[]>>(
    `/gamification/leaderboard?${params.toString()}`
  );
  return response.data.data;
};

export const getWeeklyLeaderboard = async (teamId?: number, limit = 10): Promise<LeaderboardEntry[]> => {
  const params = new URLSearchParams();
  if (teamId) params.append('team_id', String(teamId));
  params.append('limit', String(limit));
  
  const response = await api.get<ApiResponse<LeaderboardEntry[]>>(
    `/gamification/leaderboard/weekly?${params.toString()}`
  );
  return response.data.data;
};

export const getMonthlyLeaderboard = async (teamId?: number, limit = 10): Promise<LeaderboardEntry[]> => {
  const params = new URLSearchParams();
  if (teamId) params.append('team_id', String(teamId));
  params.append('limit', String(limit));
  
  const response = await api.get<ApiResponse<LeaderboardEntry[]>>(
    `/gamification/leaderboard/monthly?${params.toString()}`
  );
  return response.data.data;
};

export const getRecentActivity = async (teamId?: number, limit = 20): Promise<PointTransaction[]> => {
  const params = new URLSearchParams();
  if (teamId) params.append('team_id', String(teamId));
  params.append('limit', String(limit));
  
  const response = await api.get<ApiResponse<PointTransaction[]>>(
    `/gamification/activity?${params.toString()}`
  );
  return response.data.data;
};

// User Points API
export const getMyPoints = async (teamId?: number): Promise<UserPoints> => {
  const params = teamId ? `?team_id=${teamId}` : '';
  const response = await api.get<ApiResponse<UserPoints>>(`/gamification/my-points${params}`);
  return response.data.data;
};

export const getMyPointsSummary = async (teamId?: number): Promise<PointsSummary> => {
  const params = teamId ? `?team_id=${teamId}` : '';
  const response = await api.get<ApiResponse<PointsSummary>>(`/gamification/my-points/summary${params}`);
  return response.data.data;
};

// Point History API
export const getPointHistory = async (
  teamId?: number,
  page = 1,
  perPage = 15
): Promise<PaginatedResponse<PointTransaction>> => {
  const params = new URLSearchParams();
  if (teamId) params.append('team_id', String(teamId));
  params.append('page', String(page));
  params.append('per_page', String(perPage));
  
  const response = await api.get<PaginatedResponse<PointTransaction>>(
    `/gamification/history?${params.toString()}`
  );
  return response.data;
};

export const getTransaction = async (id: number): Promise<PointTransaction> => {
  const response = await api.get<ApiResponse<PointTransaction>>(`/gamification/history/${id}`);
  return response.data.data;
};

// Point Actions API
export const getPointActions = async (teamId?: number): Promise<PointAction[]> => {
  const params = teamId ? `?team_id=${teamId}` : '';
  const response = await api.get<ApiResponse<PointAction[]>>(`/gamification/actions${params}`);
  return response.data.data;
};

export const getPointAction = async (id: number): Promise<PointAction> => {
  const response = await api.get<ApiResponse<PointAction>>(`/gamification/actions/${id}`);
  return response.data.data;
};

export const updatePointAction = async (
  id: number,
  data: Partial<Pick<PointAction, 'name' | 'description' | 'default_points' | 'is_enabled' | 'icon' | 'category'>>
): Promise<PointAction> => {
  const response = await api.patch<ApiResponse<PointAction>>(`/gamification/actions/${id}`, data);
  return response.data.data;
};

// Team Point Settings API
export const getTeamPointSettings = async (teamId?: number): Promise<PointAction[]> => {
  const params = teamId ? `?team_id=${teamId}` : '';
  const response = await api.get<ApiResponse<PointAction[]>>(`/gamification/team-settings${params}`);
  return response.data.data;
};

export interface TeamPointSettingUpdate {
  action_id: number;
  points: number;
  is_enabled?: boolean;
}

export const updateTeamPointSettings = async (
  settings: TeamPointSettingUpdate[],
  teamId?: number
): Promise<PointAction[]> => {
  const params = teamId ? `?team_id=${teamId}` : '';
  const response = await api.patch<ApiResponse<PointAction[]>>(
    `/gamification/team-settings${params}`,
    { settings }
  );
  return response.data.data;
};
