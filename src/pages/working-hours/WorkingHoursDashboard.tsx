import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faUmbrellaBeach, faUserClock, faClock } from '@fortawesome/free-solid-svg-icons';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';

export default function WorkingHoursDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div 
          className="grid place-items-center rounded-lg flex-shrink-0 bg-orange-500"
          style={{ width: '48px', height: '48px' }}
        >
          <FontAwesomeIcon icon={faClock} className="text-white text-xl" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('plugins.workingHours.title', 'Working Hours')}</h1>
          <p className="text-muted-foreground">
            {t('plugins.workingHours.dashboardDescription', 'Manage schedules, time-off types, and requests')}
          </p>
        </div>
      </div>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Working Schedules Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-orange-500/50 group"
          onClick={() => navigate('/settings/working-schedules')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-orange-500 text-2xl" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-500 transition-colors" />
            </div>
            <CardTitle className="text-xl mt-4">
              {t('settings.workingSchedules.title', 'Working Schedules')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('plugins.workingHours.schedulesDesc', 'Define work hours, shifts, and schedule templates for your team')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{t('plugins.workingHours.fixed', 'Fixed')}</span>
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{t('plugins.workingHours.rotating', 'Rotating')}</span>
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{t('plugins.workingHours.flexible', 'Flexible')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Time-Off Types Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-blue-500/50 group"
          onClick={() => navigate('/settings/time-off-types')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faUmbrellaBeach} className="text-blue-500 text-2xl" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </div>
            <CardTitle className="text-xl mt-4">
              {t('settings.timeOffTypes.title', 'Time-Off Types')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('plugins.workingHours.timeOffTypesDesc', 'Configure vacation, sick leave, and other time-off categories')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{t('plugins.workingHours.vacation', 'Vacation')}</span>
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{t('plugins.workingHours.sickLeave', 'Sick Leave')}</span>
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{t('plugins.workingHours.personal', 'Personal')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Time-Off Requests Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-green-500/50 group"
          onClick={() => navigate('/time-off')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faUserClock} className="text-green-500 text-2xl" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
            </div>
            <CardTitle className="text-xl mt-4">
              {t('timeOff.requests', 'Time-Off Requests')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('plugins.workingHours.requestsDesc', 'View and manage employee time-off requests and balances')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{t('plugins.workingHours.pending', 'Pending')}</span>
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{t('plugins.workingHours.approved', 'Approved')}</span>
              <span className="text-xs px-2 py-1 bg-muted rounded-full">{t('plugins.workingHours.balances', 'Balances')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
