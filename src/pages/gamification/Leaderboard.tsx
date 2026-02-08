import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faCrown, faUser, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '@/providers/LanguageProvider';
import { useLeaderboard, useMyPointsSummary, useRecentActivity } from '@/hooks/useGamification';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRankIcon(rank: number | null) {
  if (rank === 1) return <FontAwesomeIcon icon={faCrown} className="text-yellow-500" />;
  if (rank === 2) return <FontAwesomeIcon icon={faMedal} className="text-gray-400" />;
  if (rank === 3) return <FontAwesomeIcon icon={faMedal} className="text-amber-600" />;
  return null;
}

function getRankStyle(rank: number | null) {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700';
  if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/40 dark:to-gray-700/40 border-gray-200 dark:border-gray-600';
  if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700';
  return '';
}

export default function Leaderboard() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<'all_time' | 'weekly' | 'monthly'>('all_time');
  
  const { data: leaderboard, loading: leaderboardLoading } = useLeaderboard(period, 20);
  const { data: summary, loading: summaryLoading } = useMyPointsSummary();
  const { data: activity, loading: activityLoading } = useRecentActivity(10);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div 
          className="grid place-items-center rounded-lg flex-shrink-0"
          style={{
            backgroundColor: '#f59e0b',
            width: '48px',
            height: '48px',
          }}
        >
          <FontAwesomeIcon icon={faTrophy} className="text-white text-2xl" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('gamification.leaderboard', 'Leaderboard')}</h1>
          <p className="text-muted-foreground">
            {t('gamification.leaderboardDescription', 'See how you rank against your team')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Stats Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="text-amber-500" />
              {t('gamification.yourStats', 'Your Stats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <div>
                  <div className="text-4xl font-bold text-amber-500">{summary.total_points.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">{t('gamification.totalPoints', 'Total Points')}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-semibold">{summary.weekly_points.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{t('gamification.thisWeek', 'This Week')}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{summary.monthly_points.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{t('gamification.thisMonth', 'This Month')}</div>
                  </div>
                </div>
                {summary.rank && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2">
                      {getRankIcon(summary.rank)}
                      <span className="text-lg font-medium">
                        {t('gamification.rankOf', 'Rank {{rank}} of {{total}}', {
                          rank: summary.rank,
                          total: summary.total_users
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('gamification.noData', 'No data available')}</p>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FontAwesomeIcon icon={faTrophy} className="text-amber-500" />
                {t('gamification.topPerformers', 'Top Performers')}
              </CardTitle>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                <TabsList className="h-8">
                  <TabsTrigger value="all_time" className="text-xs px-2">{t('gamification.allTime', 'All Time')}</TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs px-2">{t('gamification.weekly', 'Weekly')}</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs px-2">{t('gamification.monthly', 'Monthly')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => {
                  const rank = entry.rank ?? index + 1;
                  const points = period === 'weekly' ? entry.weekly_points : 
                                 period === 'monthly' ? entry.monthly_points : 
                                 entry.total_points;
                  
                  return (
                    <div
                      key={entry.user_id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                        getRankStyle(rank),
                        !getRankStyle(rank) && 'hover:bg-muted/50'
                      )}
                    >
                      <div className="w-8 text-center font-bold text-lg">
                        {getRankIcon(rank) || <span className="text-muted-foreground">{rank}</span>}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.user?.avatar || undefined} />
                        <AvatarFallback>
                          {entry.user?.name ? getInitials(entry.user.name) : <FontAwesomeIcon icon={faUser} />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{entry.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground truncate">{entry.user?.email}</div>
                      </div>
                      <Badge variant="secondary" className="font-bold">
                        {points.toLocaleString()} {t('gamification.pts', 'pts')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                {t('gamification.noLeaderboardData', 'No leaderboard data yet. Start earning points!')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('gamification.recentActivity', 'Recent Activity')}</CardTitle>
          <CardDescription>
            {t('gamification.recentActivityDescription', 'Latest point transactions in your team')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : activity.length > 0 ? (
            <div className="space-y-3">
              {activity.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={tx.user?.avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {tx.user?.name ? getInitials(tx.user.name) : <FontAwesomeIcon icon={faUser} />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{tx.user?.name || 'Unknown'}</span>
                      {' '}
                      <span className="text-muted-foreground">
                        {tx.description || tx.action?.name || 'earned points'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    +{tx.points} {t('gamification.pts', 'pts')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              {t('gamification.noActivity', 'No recent activity')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
