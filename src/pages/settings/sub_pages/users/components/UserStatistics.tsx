import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import dayjs from "dayjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, CreditCard, Mail } from "lucide-react";
import type { Invitation, Team, UserTeam } from "@/store/types";
import type { TranslateFn, UserData } from "../types";

export function UserStatistics({
  users,
  teams,
  userTeams,
  jobPositions,
  invitations,
  translate,
}: {
  users: UserData[];
  teams: Team[];
  userTeams: UserTeam[];
  jobPositions: any[];
  invitations: Invitation[];
  translate: TranslateFn;
}) {
  const totalUsers = users.length;
  const adminCount = users.filter((u) => Boolean(u.is_admin)).length;
  const subscriptionCount = users.filter((u) => Boolean(u.has_active_subscription)).length;
  const activeSubPercent = totalUsers > 0 ? Math.round((subscriptionCount / totalUsers) * 100) : 0;

  const usersByTeam = useMemo(() => {
    const counts = new Map<number, number>();
    userTeams.forEach((ut) => {
      counts.set(ut.team_id, (counts.get(ut.team_id) || 0) + 1);
    });

    return teams
      .map((team) => ({ team, count: counts.get(team.id) || 0 }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [teams, userTeams]);

  const usersByJobPosition = useMemo(() => {
    const counts = new Map<number, number>();
    users.forEach((u) => {
      if (u.job_position_id != null) {
        const id = Number(u.job_position_id);
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    });

    return (jobPositions || [])
      .map((jp: any) => ({ jobPosition: jp, count: counts.get(Number(jp.id)) || 0 }))
      .filter((item: any) => item.count > 0)
      .sort((a: any, b: any) => b.count - a.count);
  }, [jobPositions, users]);

  const invitationsOverTime = useMemo(() => {
    const byDay = new Map<string, number>();
    invitations.forEach((inv) => {
      if (!inv.created_at) return;
      const dayKey = dayjs(inv.created_at).format("YYYY-MM-DD");
      byDay.set(dayKey, (byDay.get(dayKey) || 0) + 1);
    });

    const days = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // keep last 30 days (if larger)
    return days.slice(-30);
  }, [invitations]);

  const summaryLabels = {
    total: translate("stats.summary.totalUsers", "Total users"),
    admins: translate("stats.summary.admins", "Admins"),
    subscriptions: translate("stats.summary.subscriptions", "Active subscriptions"),
    invitations: translate("stats.summary.invitations", "Invitations"),
  };

  const charts = {
    usersPerTeamTitle: translate("stats.charts.usersPerTeam.title", "Users per Team"),
    usersPerTeamDescription: translate("stats.charts.usersPerTeam.description", "Distribution of users across teams"),
    usersPerTeamAxis: translate("stats.charts.usersPerTeam.axis", "Users"),
    usersByJobTitle: translate("stats.charts.usersByJob.title", "Users by Job Position"),
    usersByJobDescription: translate("stats.charts.usersByJob.description", "Distribution across job positions"),
    usersByJobSeries: translate("stats.charts.usersByJob.series", "Users"),
    invitationsOverTimeTitle: translate("stats.charts.invitationsOverTime.title", "Invitations Over Time"),
    invitationsOverTimeDescription: translate("stats.charts.invitationsOverTime.description", "Last 30 days of invitation creation"),
    invitationsAxis: translate("stats.charts.invitationsOverTime.axis", "Invitations"),
  };

  const emptyStates = {
    noTeamAssignments: translate("stats.empty.noTeamAssignments", "No team assignment data available"),
    noJobPositions: translate("stats.empty.noJobPositions", "No job position data available"),
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto p-4">
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{summaryLabels.total}</p>
                  <p className="text-3xl font-bold mt-1">{totalUsers}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Users className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{summaryLabels.admins}</p>
                  <p className="text-3xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{adminCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-indigo-600" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{summaryLabels.subscriptions}</p>
                  <p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{activeSubPercent}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{summaryLabels.invitations}</p>
                  <p className="text-3xl font-bold mt-1 text-sky-600 dark:text-sky-400">{invitations.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-sky-600" />
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{charts.usersPerTeamTitle}</CardTitle>
              <CardDescription>{charts.usersPerTeamDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {usersByTeam.length > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
                    grid: { left: "3%", right: "12%", bottom: "3%", containLabel: true },
                    xAxis: { type: "value", name: charts.usersPerTeamAxis, nameLocation: "end", nameGap: 5 },
                    yAxis: {
                      type: "category",
                      data: usersByTeam.map((item) => item.team.name).reverse(),
                      axisLabel: {
                        formatter: (value: string) =>
                          value.length > 20 ? value.substring(0, 20) + "..." : value,
                      },
                    },
                    series: [
                      {
                        name: charts.usersPerTeamAxis,
                        type: "bar",
                        data: usersByTeam
                          .map((item) => ({
                            value: item.count,
                            itemStyle: { color: item.team.color || "#6366f1" },
                          }))
                          .reverse(),
                      },
                    ],
                  }}
                  style={{ height: "300px" }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Users className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">{emptyStates.noTeamAssignments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{charts.usersByJobTitle}</CardTitle>
              <CardDescription>{charts.usersByJobDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {usersByJobPosition.length > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
                    legend: { orient: "vertical", left: "left", textStyle: { fontSize: 10 } },
                    series: [
                      {
                        name: charts.usersByJobSeries,
                        type: "pie",
                        radius: ["40%", "70%"],
                        avoidLabelOverlap: false,
                        itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
                        label: { show: true, formatter: "{b}: {c}" },
                        emphasis: { label: { show: true, fontSize: 12, fontWeight: "bold" } },
                        data: usersByJobPosition.map((item: any) => ({
                          value: item.count,
                          name: item.jobPosition.title,
                        })),
                      },
                    ],
                  }}
                  style={{ height: "300px" }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Users className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">{emptyStates.noJobPositions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invitations over time */}
        {invitationsOverTime.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{charts.invitationsOverTimeTitle}</CardTitle>
              <CardDescription>{charts.invitationsOverTimeDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={{
                  tooltip: {
                    trigger: "axis",
                    formatter: (params: any) => {
                      const param = params[0];
                      return `${param.axisValue}<br/>${param.marker}${param.seriesName}: ${param.value}`;
                    },
                  },
                  grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
                  xAxis: {
                    type: "category",
                    data: invitationsOverTime.map((item) => dayjs(item.date).format("MMM DD")),
                  },
                  yAxis: { type: "value", name: charts.invitationsAxis },
                  series: [
                    {
                      name: charts.invitationsAxis,
                      type: "line",
                      smooth: true,
                      data: invitationsOverTime.map((item) => item.count),
                      areaStyle: { opacity: 0.15 },
                      itemStyle: { color: "#6366f1" },
                    },
                  ],
                }}
                style={{ height: "240px" }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

