import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faArrowUp, faMedal } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '@/providers/LanguageProvider';
import { useMyPointsSummary, useGamificationPlugin } from '@/hooks/useGamification';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PointsWidgetProps {
  className?: string;
  compact?: boolean;
}

export function PointsWidget({ className, compact = false }: PointsWidgetProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isEnabled } = useGamificationPlugin();
  const { data: summary, loading } = useMyPointsSummary();

  // Don't render if plugin is disabled
  if (!isEnabled) return null;

  if (compact) {
    return (
      <div 
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors',
          className
        )}
        onClick={() => navigate('/gamification')}
      >
        <FontAwesomeIcon icon={faTrophy} className="text-amber-500" />
        {loading ? (
          <Skeleton className="h-4 w-12" />
        ) : (
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            {summary?.total_points?.toLocaleString() || 0}
          </span>
        )}
      </div>
    );
  }

  return (
    <Card 
      className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={() => navigate('/gamification')}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FontAwesomeIcon icon={faTrophy} className="text-amber-500" />
          {t('gamification.yourPoints', 'Your Points')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : summary ? (
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-amber-500">
                {summary.total_points.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('gamification.totalPoints', 'Total Points')}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {summary.weekly_points > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  <FontAwesomeIcon icon={faArrowUp} className="mr-1 text-xs" />
                  +{summary.weekly_points} {t('gamification.thisWeek', 'this week')}
                </Badge>
              )}
              {summary.rank && (
                <Badge variant="secondary">
                  <FontAwesomeIcon icon={faMedal} className="mr-1" />
                  #{summary.rank}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('gamification.startEarning', 'Start earning points!')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default PointsWidget;
