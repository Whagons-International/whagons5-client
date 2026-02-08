import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import * as gamificationApi from '@/api/gamificationApi';
import type {
  LeaderboardEntry,
  PointTransaction,
  UserPoints,
  PointsSummary,
  PointAction,
} from '@/api/gamificationApi';

/**
 * Hook to fetch and manage leaderboard data
 */
export function useLeaderboard(period: 'all_time' | 'weekly' | 'monthly' = 'all_time', limit = 10) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current team from user state
  const user = useSelector((state: RootState) => state.user?.user);
  const teamId = user?.current_team_id;

  const fetchLeaderboard = useCallback(async () => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    try {
      let result: LeaderboardEntry[];
      switch (period) {
        case 'weekly':
          result = await gamificationApi.getWeeklyLeaderboard(teamId, limit);
          break;
        case 'monthly':
          result = await gamificationApi.getMonthlyLeaderboard(teamId, limit);
          break;
        default:
          result = await gamificationApi.getLeaderboard(teamId, limit);
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, [teamId, period, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { data, loading, error, refetch: fetchLeaderboard };
}

/**
 * Hook to fetch the current user's points
 */
export function useMyPoints() {
  const [data, setData] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.user?.user);
  const teamId = user?.current_team_id;

  const fetchPoints = useCallback(async () => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await gamificationApi.getMyPoints(teamId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch points');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  return { data, loading, error, refetch: fetchPoints };
}

/**
 * Hook to fetch the current user's points summary
 */
export function useMyPointsSummary() {
  const [data, setData] = useState<PointsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.user?.user);
  const teamId = user?.current_team_id;

  const fetchSummary = useCallback(async () => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await gamificationApi.getMyPointsSummary(teamId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { data, loading, error, refetch: fetchSummary };
}

/**
 * Hook to fetch point transaction history with pagination
 */
export function usePointHistory(perPage = 15) {
  const [data, setData] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const user = useSelector((state: RootState) => state.user?.user);
  const teamId = user?.current_team_id;

  const fetchHistory = useCallback(async (pageNum: number, reset = false) => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await gamificationApi.getPointHistory(teamId, pageNum, perPage);
      const newData = result.data;
      
      if (reset) {
        setData(newData);
      } else {
        setData(prev => [...prev, ...newData]);
      }
      
      setTotal(result.meta.total);
      setHasMore(result.meta.current_page < result.meta.last_page);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [teamId, perPage]);

  useEffect(() => {
    fetchHistory(1, true);
  }, [fetchHistory]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchHistory(page + 1);
    }
  }, [loading, hasMore, page, fetchHistory]);

  const refetch = useCallback(() => {
    fetchHistory(1, true);
  }, [fetchHistory]);

  return { data, loading, error, hasMore, total, loadMore, refetch };
}

/**
 * Hook to fetch recent activity feed
 */
export function useRecentActivity(limit = 20) {
  const [data, setData] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.user?.user);
  const teamId = user?.current_team_id;

  const fetchActivity = useCallback(async () => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await gamificationApi.getRecentActivity(teamId, limit);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity');
    } finally {
      setLoading(false);
    }
  }, [teamId, limit]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return { data, loading, error, refetch: fetchActivity };
}

/**
 * Hook to fetch point actions with team settings
 */
export function usePointActions() {
  const [data, setData] = useState<PointAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.user?.user);
  const teamId = user?.current_team_id;

  const fetchActions = useCallback(async () => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await gamificationApi.getTeamPointSettings(teamId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch actions');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const updateSettings = useCallback(async (settings: gamificationApi.TeamPointSettingUpdate[]) => {
    if (!teamId) return;
    
    try {
      const result = await gamificationApi.updateTeamPointSettings(settings, teamId);
      setData(result);
      return result;
    } catch (err) {
      throw err;
    }
  }, [teamId]);

  return { data, loading, error, refetch: fetchActions, updateSettings };
}

/**
 * Hook specifically for the Gamification plugin
 */
export function useGamificationPlugin() {
  const { value: plugins, loading } = useSelector(
    (state: RootState) => state.plugins
  ) as { value: { id: number; slug: string; name: string; is_enabled: boolean; settings: Record<string, unknown> }[]; loading: boolean };

  const result = useMemo(() => {
    const plugin = plugins.find(p => p.slug === 'gamification');
    return {
      isEnabled: plugin?.is_enabled ?? false,
      plugin,
      settings: plugin?.settings ?? {},
      loading
    };
  }, [plugins, loading]);

  return result;
}
