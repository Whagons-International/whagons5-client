import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, 
  faCheckCircle, 
  faPlusCircle, 
  faClock, 
  faComment, 
  faHeart,
  faUser,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '@/providers/LanguageProvider';
import { usePointHistory, useMyPointsSummary } from '@/hooks/useGamification';
import { format } from 'date-fns';

// Icon mapping for action slugs
const actionIcons: Record<string, typeof faCheckCircle> = {
  task_completed: faCheckCircle,
  task_created: faPlusCircle,
  working_hours_logged: faClock,
  comment_added: faComment,
  reaction_added: faHeart,
};

function getActionIcon(slug?: string) {
  if (!slug) return faCheckCircle;
  return actionIcons[slug] || faCheckCircle;
}

export default function PointHistory() {
  const { t } = useLanguage();
  const { data: history, loading, hasMore, loadMore, total } = usePointHistory(20);
  const { data: summary } = useMyPointsSummary();

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
          <FontAwesomeIcon icon={faHistory} className="text-white text-2xl" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('gamification.pointHistory', 'Point History')}</h1>
          <p className="text-muted-foreground">
            {t('gamification.pointHistoryDescription', 'View your complete point transaction history')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stats Summary */}
        {summary && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-500">{summary.total_points.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t('gamification.totalPoints', 'Total Points')}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{summary.weekly_points.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t('gamification.thisWeek', 'This Week')}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{summary.monthly_points.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t('gamification.thisMonth', 'This Month')}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">#{summary.rank || '-'}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t('gamification.yourRank', 'Your Rank')}</div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t('gamification.transactions', 'Transactions')}</CardTitle>
              <CardDescription>
                {total > 0 
                  ? t('gamification.transactionsCount', '{{count}} total transactions', { count: total })
                  : t('gamification.noTransactions', 'No transactions yet')
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && history.length === 0 ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 py-4 border-b last:border-0">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-1">
              {history.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-start gap-4 py-4 border-b last:border-0 hover:bg-muted/30 -mx-3 px-3 rounded-lg transition-colors"
                >
                  <div 
                    className="grid place-items-center rounded-full flex-shrink-0 bg-amber-100 dark:bg-amber-900/30"
                    style={{ width: '40px', height: '40px' }}
                  >
                    <FontAwesomeIcon 
                      icon={getActionIcon(tx.action?.slug)} 
                      className="text-amber-600 dark:text-amber-400" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {tx.action?.name || tx.description || 'Points Earned'}
                    </div>
                    {tx.description && tx.action?.name && (
                      <div className="text-sm text-muted-foreground truncate">
                        {tx.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(tx.created_at), 'PPp')}
                    </div>
                  </div>
                  <Badge 
                    variant={tx.points >= 0 ? 'default' : 'destructive'}
                    className={tx.points >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                  >
                    {tx.points >= 0 ? '+' : ''}{tx.points} {t('gamification.pts', 'pts')}
                  </Badge>
                </div>
              ))}
              
              {hasMore && (
                <div className="pt-4 text-center">
                  <Button 
                    variant="outline" 
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      t('common.loading', 'Loading...')
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faChevronDown} className="mr-2" />
                        {t('gamification.loadMore', 'Load More')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faHistory} className="text-4xl text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t('gamification.noHistoryYet', 'No point history yet. Start earning points by completing tasks!')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
