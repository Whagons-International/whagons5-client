import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faStar, faCalendarAlt, faUmbrellaBeach, faClock, faUserClock, faGlobe, faCalculator, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { Calendar, Pin, PinOff, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import {
  getPluginsConfig,
  togglePluginEnabled,
  togglePluginPinned,
  subscribeToPluginsConfig,
  type PluginConfig,
} from '@/components/AppSidebar';

export default function WorkingHoursSettings() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pluginsConfig, setPluginsConfigState] = useState<PluginConfig[]>(getPluginsConfig());

  // Default to 'settings' tab
  const activeTab = searchParams.get('tab') || 'settings';

  useEffect(() => {
    const unsubscribe = subscribeToPluginsConfig(setPluginsConfigState);
    return unsubscribe;
  }, []);

  const currentPlugin = pluginsConfig.find(p => p.id === 'working-hours');

  const handleToggleEnabled = () => {
    togglePluginEnabled('working-hours');
  };

  const handleTogglePinned = () => {
    togglePluginPinned('working-hours');
  };

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  if (!currentPlugin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('plugins.notFound', 'Plugin not found')}</CardTitle>
            <CardDescription>
              {t('plugins.notFoundDescription', 'The requested plugin could not be found')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const Icon = currentPlugin.icon || Calendar;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div 
          className="grid place-items-center rounded-lg flex-shrink-0"
          style={{
            backgroundColor: currentPlugin.iconColor || '#f97316',
            width: '48px',
            height: '48px',
          }}
        >
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('plugins.workingHours.title', 'Working Hours')}</h1>
          <p className="text-muted-foreground">
            {activeTab === 'summary' ? t('plugins.summary', 'Overview') : t('plugins.settings', 'Settings')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setTab('settings')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('plugins.settings', 'Settings')}
          </button>
          <button
            onClick={() => setTab('summary')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('plugins.summary', 'Summary')}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Visibility Card */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>{t('plugins.visibility', 'Visibility')}</CardTitle>
              <CardDescription>
                {t('plugins.visibilityDescription', 'Control how this plugin appears in your sidebar')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">{t('plugins.enabled', 'Enabled')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('plugins.enabledDescription', 'Show this plugin in the sidebar')}
                  </div>
                </div>
                <Switch
                  checked={currentPlugin.enabled}
                  onCheckedChange={handleToggleEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium flex items-center gap-2">
                    {currentPlugin.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                    {t('plugins.visibleInSidebar', 'Visible in sidebar')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('plugins.visibleInSidebarDescription', 'Show this plugin in the sidebar. When off, it will not appear in the navbar.')}
                  </div>
                </div>
                <Switch
                  checked={currentPlugin.pinned}
                  onCheckedChange={handleTogglePinned}
                  disabled={!currentPlugin.enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuration Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t('plugins.workingHours.configuration', 'Configuration')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Working Schedules Card */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-orange-500/50 group"
                onClick={() => navigate('/settings/working-schedules')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-orange-500 text-xl" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                  </div>
                  <CardTitle className="text-lg mt-3">
                    {t('settings.workingSchedules.title', 'Working Schedules')}
                  </CardTitle>
                  <CardDescription>
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
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                      <FontAwesomeIcon icon={faUmbrellaBeach} className="text-blue-500 text-xl" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </div>
                  <CardTitle className="text-lg mt-3">
                    {t('settings.timeOffTypes.title', 'Time-Off Types')}
                  </CardTitle>
                  <CardDescription>
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
                    <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                      <FontAwesomeIcon icon={faUserClock} className="text-green-500 text-xl" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
                  </div>
                  <CardTitle className="text-lg mt-3">
                    {t('timeOff.requests', 'Time-Off Requests')}
                  </CardTitle>
                  <CardDescription>
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

          {/* About Card */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>{t('plugins.about', 'About')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('plugins.pluginId', 'Plugin ID')}:</span>
                  <span className="font-mono">{currentPlugin.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('plugins.route', 'Route')}:</span>
                  <span className="font-mono">/settings/working-hours</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="grid gap-6 max-w-3xl">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faStar} className="text-amber-500" />
                {t('plugins.keyFeatures', 'Key Features')}
              </CardTitle>
              <CardDescription>
                {t('plugins.keyFeaturesDescription', 'Discover what this plugin can do for you')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="text-emerald-500 mt-1 flex-shrink-0" 
                  />
                  <span className="text-sm">{t('plugins.workingHours.feature1', 'Define flexible working schedules (fixed, rotating, flexible)')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="text-emerald-500 mt-1 flex-shrink-0" 
                  />
                  <span className="text-sm">{t('plugins.workingHours.feature2', 'Import public holidays automatically from country APIs')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="text-emerald-500 mt-1 flex-shrink-0" 
                  />
                  <span className="text-sm">{t('plugins.workingHours.feature3', 'Configure overtime rules with multipliers for different scenarios')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="text-emerald-500 mt-1 flex-shrink-0" 
                  />
                  <span className="text-sm">{t('plugins.workingHours.feature4', 'Assign schedules to users, teams, or job positions with priority')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="text-emerald-500 mt-1 flex-shrink-0" 
                  />
                  <span className="text-sm">{t('plugins.workingHours.feature5', 'Manage time-off requests with approval workflows')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Modules Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faChartLine} className="text-blue-500" />
                {t('plugins.modules', 'Modules')}
              </CardTitle>
              <CardDescription>
                {t('plugins.workingHours.modulesDescription', 'Core components of the Working Hours plugin')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-orange-500 w-4" />
                  <span>{t('plugins.workingHours.schedules', 'Working Schedules')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FontAwesomeIcon icon={faGlobe} className="text-blue-500 w-4" />
                  <span>{t('plugins.workingHours.holidays', 'Holiday Calendars')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FontAwesomeIcon icon={faClock} className="text-purple-500 w-4" />
                  <span>{t('plugins.workingHours.overtime', 'Overtime Rules')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FontAwesomeIcon icon={faUmbrellaBeach} className="text-teal-500 w-4" />
                  <span>{t('plugins.workingHours.timeOff', 'Time-Off Types')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FontAwesomeIcon icon={faUserClock} className="text-green-500 w-4" />
                  <span>{t('plugins.workingHours.requests', 'Time-Off Requests')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FontAwesomeIcon icon={faCalculator} className="text-red-500 w-4" />
                  <span>{t('plugins.workingHours.balances', 'Balance Tracking')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plugin Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('plugins.about', 'About')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('plugins.pluginId', 'Plugin ID')}:</span>
                  <span className="font-mono">{currentPlugin.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('plugins.route', 'Route')}:</span>
                  <span className="font-mono">/settings/working-hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('plugins.status', 'Status')}:</span>
                  <span className={`font-medium ${currentPlugin.enabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {currentPlugin.enabled ? t('plugins.active', 'Active') : t('plugins.inactive', 'Inactive')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
