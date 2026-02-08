import { Navigate, Route, Routes, useLocation, matchPath } from 'react-router';
import { lazy, Suspense, useMemo } from 'react';

import MainLayout from '@/layouts/MainLayout';

// Core pages - keep static (used on every session)
import Home from '@/pages/home/Home';
import { Workspace } from '@/pages/spaces/Workspace';

// Lazy-loaded pages
const Profile = lazy(() => import('@/pages/profile/Profile'));
const Stripe = lazy(() => import('@/pages/stripe/Stripe'));
const Settings = lazy(() => import('@/pages/settings/Settings'));
const Stuff = lazy(() => import('@/pages/stuff/Stuff'));
const Plugins = lazy(() => import('@/pages/Plugins'));
const PluginSettings = lazy(() => import('@/pages/PluginSettings'));
const PluginManagement = lazy(() => import('@/pages/admin/PluginManagement'));
const Integrations = lazy(() => import('@/pages/Integrations'));
const BoardDetail = lazy(() => import('@/pages/boards/BoardDetail'));
const TestPage = lazy(() => import('@/pages/Testpage'));
const SharedWithMe = lazy(() => import('@/pages/shared/SharedWithMe'));
const BroadcastsPage = lazy(() => import('@/pages/broadcasts/BroadcastsPage'));
const ActivityMonitor = lazy(() => import('@/pages/activity/ActivityMonitor'));
const GamificationComingSoon = lazy(() => import('@/pages/gamification/GamificationComingSoon'));
const GamificationLeaderboard = lazy(() => import('@/pages/gamification/Leaderboard'));
const GamificationHistory = lazy(() => import('@/pages/gamification/PointHistory'));
const AnalyticsComingSoon = lazy(() => import('@/pages/analytics/AnalyticsComingSoon'));
const MotivationComingSoon = lazy(() => import('@/pages/motivation/MotivationComingSoon'));
const HotelAnalytics = lazy(() => import('@/pages/hotel-analytics/HotelAnalytics'));
const ComplianceStandards = lazy(() => import('@/pages/compliance/ComplianceStandards').then(m => ({ default: m.ComplianceStandards })));
const ComplianceStandardDetail = lazy(() => import('@/pages/compliance/ComplianceStandardDetail').then(m => ({ default: m.ComplianceStandardDetail })));

// Settings sub-pages (lazy)
const Categories = lazy(() => import('@/pages/settings/sub_pages/categories/Categories'));
const CustomFieldsTab = lazy(() => import('@/pages/settings/sub_pages/custom-fields/CustomFieldsTab'));
const Templates = lazy(() => import('@/pages/settings/sub_pages/templates/Templates'));
const Forms = lazy(() => import('@/pages/settings/sub_pages/forms'));
const Teams = lazy(() => import('@/pages/settings/sub_pages/teams/Teams'));
const Workspaces = lazy(() => import('@/pages/settings/sub_pages/workspaces/Workspaces'));
const Spots = lazy(() => import('@/pages/settings/sub_pages/spots/Spots'));
const SpotTypes = lazy(() => import('@/pages/settings/sub_pages/spot-types/SpotTypes'));
const Users = lazy(() => import('@/pages/settings/sub_pages/users/Users'));
const JobPositions = lazy(() => import('@/pages/settings/sub_pages/job-positions/JobPositions'));
const RolesAndPermissions = lazy(() => import('@/pages/settings/sub_pages/roles-and-permissions/RolesAndPermissions'));
const Statuses = lazy(() => import('@/pages/settings/sub_pages/statuses/Statuses'));
const Priorities = lazy(() => import('@/pages/settings/sub_pages/priorities/Priorities'));
const Tags = lazy(() => import('@/pages/settings/sub_pages/tags/Tags'));
const Slas = lazy(() => import('@/pages/settings/sub_pages/slas/Slas'));
const Workflows = lazy(() => import('@/pages/settings/sub_pages/workflows/Workflows'));
const Approvals = lazy(() => import('@/pages/settings/sub_pages/approvals/Approvals'));
const Global = lazy(() => import('@/pages/settings/sub_pages/global/Global'));
const BoardsSettings = lazy(() => import('@/pages/settings/sub_pages/boards/Boards'));
const KpiCardsSettings = lazy(() => import('@/pages/settings/sub_pages/kpi-cards-settings/KpiCardsSettings'));
const KpiCardsManage = lazy(() => import('@/pages/settings/sub_pages/kpi-cards-manage/KpiCardsManage'));
const GamificationSettings = lazy(() => import('@/pages/settings/sub_pages/gamification/GamificationSettings'));
const AnalyticsSettings = lazy(() => import('@/pages/settings/sub_pages/analytics/AnalyticsSettings'));
const MotivationSettings = lazy(() => import('@/pages/settings/sub_pages/motivation/MotivationSettings'));
const HotelAnalyticsSettings = lazy(() => import('@/pages/settings/sub_pages/HotelAnalyticsSettings'));

// Working Hours (lazy)
const WorkingHoursSettings = lazy(() => import('@/pages/settings/sub_pages/WorkingHoursSettings'));
const WorkingSchedules = lazy(() => import('@/pages/settings/sub_pages/working-hours/WorkingSchedules'));
const TimeOffTypes = lazy(() => import('@/pages/settings/sub_pages/working-hours/TimeOffTypes'));
const TimeOffRequests = lazy(() => import('@/pages/time-off/TimeOffRequests'));
const WorkingHoursDashboard = lazy(() => import('@/pages/working-hours').then(m => ({ default: m.WorkingHoursDashboard })));

// Guards
const WorkingHoursGuard = lazy(() => import('@/components/PluginGuard').then(m => ({ default: m.WorkingHoursGuard })));
const PluginGuard = lazy(() => import('@/components/PluginGuard').then(m => ({ default: m.PluginGuard })));

// Assets (lazy)
const AssetsPage = lazy(() => import('@/pages/assets/AssetsPage').then(m => ({ default: m.AssetsPage })));
const AssetDetail = lazy(() => import('@/pages/assets/AssetDetail').then(m => ({ default: m.AssetDetail })));
const AssetTypesManager = lazy(() => import('@/pages/assets/AssetTypesManager').then(m => ({ default: m.AssetTypesManager })));

// QR Codes (lazy)
const QrCodesPage = lazy(() => import('@/pages/qr-codes/QrCodesPage').then(m => ({ default: m.QrCodesPage })));


const pages = [
  { path: '/workspace/:id', component: <Workspace /> },
];

function AllPages() {
  const location = useLocation();

  const renderedPages = useMemo(() => pages.map(({ path, component }) => {
    const isVisible = !!matchPath({ path, end: false }, location.pathname);
    // Only render the component when visible to avoid hook violations
    if (!isVisible) return null;
    return (
      <div key={path} style={{ height: '100%' }}>
        {component}
      </div>
    );
  }), [location.pathname]);

  return <>{renderedPages}</>;
}

export const HomeRoutes = () => {

  return (
    <>
      <MainLayout>
        <AllPages />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="/welcome" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/tasks" element={<Workspace />} />
            <Route path="/shared-with-me" element={<SharedWithMe />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/stripe" element={<Stripe />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stuff" element={<Stuff />} />
            <Route path="/plugins" element={<Plugins />} />
            <Route path="/plugins/:pluginId/settings" element={<PluginSettings />} />
            <Route path="/admin/plugins" element={<PluginManagement />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/boards/:boardId" element={<BoardDetail />} />
            <Route path="/broadcasts" element={<BroadcastsPage />} />
            <Route path="/activity" element={<ActivityMonitor />} />
            <Route path="/gamification" element={<Suspense fallback={null}><PluginGuard pluginSlug="gamification"><GamificationLeaderboard /></PluginGuard></Suspense>} />
            <Route path="/gamification/history" element={<Suspense fallback={null}><PluginGuard pluginSlug="gamification"><GamificationHistory /></PluginGuard></Suspense>} />
            <Route path="/analytics" element={<AnalyticsComingSoon />} />
            <Route path="/motivation" element={<MotivationComingSoon />} />
            <Route path="/hotel-analytics" element={<HotelAnalytics />} />
            <Route path="/settings/categories" element={<Categories />} />
            <Route path="/settings/categories/custom-fields" element={<CustomFieldsTab />} />
            <Route path="/settings/templates" element={<Templates />} />
            <Route path="/settings/forms" element={<Forms />} />
            <Route path="/settings/workspaces" element={<Workspaces />} />
            <Route path="/settings/teams" element={<Teams />} />
            <Route path="/settings/spots" element={<Spots />} />
            <Route path="/settings/spots/types" element={<SpotTypes />} />
            <Route path="/settings/job-positions" element={<JobPositions />} />
            <Route path="/settings/users" element={<Users />} /> 
            <Route path="/settings/roles-and-permissions" element={<RolesAndPermissions />} />
            <Route path="/settings/statuses" element={<Statuses />} />
            <Route path="/settings/priorities" element={<Priorities />} />
            <Route path="/settings/tags" element={<Tags />} />
            <Route path="/settings/slas" element={<Slas />} />
            <Route path="/settings/workflows" element={<Workflows />} />
            <Route path="/settings/approvals" element={<Approvals />} />
            <Route path="/settings/global" element={<Global />} />
            <Route path="/settings/boards" element={<BoardsSettings />} />
            <Route path="/settings/kpi-cards" element={<KpiCardsSettings />} />
            <Route path="/settings/kpi-cards/manage" element={<KpiCardsManage />} />
            <Route path="/settings/gamification" element={<GamificationSettings />} />
            <Route path="/settings/analytics" element={<AnalyticsSettings />} />
            <Route path="/settings/motivation" element={<MotivationSettings />} />
            <Route path="/settings/hotel-analytics" element={<HotelAnalyticsSettings />} />
            <Route path="/working-hours" element={<Suspense fallback={null}><WorkingHoursGuard><WorkingHoursDashboard /></WorkingHoursGuard></Suspense>} />
            <Route path="/settings/working-hours" element={<Suspense fallback={null}><WorkingHoursGuard><WorkingHoursSettings /></WorkingHoursGuard></Suspense>} />
            <Route path="/settings/working-schedules" element={<Suspense fallback={null}><WorkingHoursGuard><WorkingSchedules /></WorkingHoursGuard></Suspense>} />
            <Route path="/settings/time-off-types" element={<Suspense fallback={null}><WorkingHoursGuard><TimeOffTypes /></WorkingHoursGuard></Suspense>} />
            <Route path="/time-off" element={<Suspense fallback={null}><WorkingHoursGuard><TimeOffRequests /></WorkingHoursGuard></Suspense>} />
            <Route path="/settings/test" element={<TestPage />} />
            
            {/* Compliance Routes */}
            <Route path="/compliance/standards" element={<ComplianceStandards />} />
            <Route path="/compliance/standards/:id" element={<ComplianceStandardDetail />} />

            {/* Asset Management Routes */}
            <Route path="/assets" element={<Suspense fallback={null}><PluginGuard pluginSlug="assets"><AssetsPage /></PluginGuard></Suspense>} />
            <Route path="/assets/types" element={<Suspense fallback={null}><PluginGuard pluginSlug="assets"><AssetTypesManager /></PluginGuard></Suspense>} />
            <Route path="/assets/:id" element={<Suspense fallback={null}><PluginGuard pluginSlug="assets"><AssetDetail /></PluginGuard></Suspense>} />

            {/* QR Codes Routes */}
            <Route path="/qr-codes" element={<Suspense fallback={null}><PluginGuard pluginSlug="qr-codes"><QrCodesPage /></PluginGuard></Suspense>} />
          </Routes>
        </Suspense>
      </MainLayout>
    </>
  );
};
