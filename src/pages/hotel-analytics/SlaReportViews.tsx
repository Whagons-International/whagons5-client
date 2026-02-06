import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { api } from "@/store/api/internalApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart } from "@/pages/settings/shared/components/BarChart";
import { LineChart } from "@/pages/settings/shared/components/LineChart";
import { PieChart } from "@/pages/settings/shared/components/PieChart";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationTriangle,
  faClock,
  faArrowUp,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

// ─── Shared Types & Utils ────────────────────────────────────────────

interface DateRange {
  from: string;
  to: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function KpiCard({
  label,
  value,
  subtext,
  color = "text-foreground",
  icon,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  icon?: any;
}) {
  return (
    <Card className="flex-1 min-w-[160px]">
      <CardContent className="p-4 text-center">
        {icon && (
          <FontAwesomeIcon icon={icon} className={`text-2xl mb-2 ${color}`} />
        )}
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
        {subtext && (
          <div className="text-xs text-muted-foreground/70 mt-0.5">
            {subtext}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        type="date"
        className="border rounded px-2 py-1 bg-background text-foreground"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
      />
      <span className="text-muted-foreground">to</span>
      <input
        type="date"
        className="border rounded px-2 py-1 bg-background text-foreground"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <FontAwesomeIcon
        icon={faSpinner}
        spin
        className="text-2xl text-muted-foreground"
      />
    </div>
  );
}

// ─── 1. Compliance Summary Report ────────────────────────────────────

interface ComplianceData {
  overview: {
    total_tasks: number;
    response_breaches: number;
    resolution_breaches: number;
    responded: number;
    resolved: number;
    response_compliance_pct: number | null;
    resolution_compliance_pct: number | null;
    avg_response_seconds: number | null;
    avg_resolution_seconds: number | null;
  };
  breakdown: Array<{
    sla_id?: number;
    category_id?: number;
    team_id?: number;
    total: number;
    response_breaches: number;
    resolution_breaches: number;
    responded: number;
    resolved: number;
    avg_response_seconds: number | null;
    avg_resolution_seconds: number | null;
  }>;
}

export function ComplianceSummaryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<DateRange>(() => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return { from, to };
  });
  const [groupBy, setGroupBy] = useState<"sla" | "category" | "team">("sla");

  const slas = useSelector((state: RootState) => state.slas?.value ?? []);
  const categories = useSelector((state: RootState) => state.categories?.value ?? []);
  const teams = useSelector((state: RootState) => state.teams?.value ?? []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get("/analytics/sla/compliance-summary", {
        params: { from: range.from, to: range.to, group_by: groupBy },
      })
      .then((r) => setData(r.data?.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, range, groupBy]);

  const breakdownChartData = useMemo(() => {
    if (!data?.breakdown) return [];
    return data.breakdown.map((row: any) => {
      let name = `#${row.sla_id ?? row.category_id ?? row.team_id}`;
      if (groupBy === "sla") {
        name = (slas as any[]).find((s: any) => s.id === row.sla_id)?.name ?? name;
      } else if (groupBy === "category") {
        name = (categories as any[]).find((c: any) => c.id === row.category_id)?.name ?? name;
      } else if (groupBy === "team") {
        name = (teams as any[]).find((t: any) => t.id === row.team_id)?.name ?? name;
      }
      const compliance =
        row.responded > 0
          ? Math.round(((row.responded - row.response_breaches) / row.responded) * 100)
          : 100;
      return { name, value: compliance, total: row.total };
    });
  }, [data, groupBy, slas, categories, teams]);

  const o = data?.overview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("hotelAnalytics.sla.complianceSummary.title", "SLA Compliance Summary")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <DateRangePicker value={range} onChange={setRange} />
          <select
            className="border rounded px-2 py-1 bg-background text-foreground text-sm"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
          >
            <option value="sla">By SLA</option>
            <option value="category">By Category</option>
            <option value="team">By Team</option>
          </select>
        </div>

        {loading ? (
          <LoadingState />
        ) : o ? (
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="flex gap-3 flex-wrap">
              <KpiCard
                label="Total Tasks"
                value={o.total_tasks}
                icon={faClock}
                color="text-blue-500"
              />
              <KpiCard
                label="Response Compliance"
                value={o.response_compliance_pct != null ? `${o.response_compliance_pct}%` : "-"}
                icon={faCheckCircle}
                color={
                  (o.response_compliance_pct ?? 100) >= 90
                    ? "text-green-500"
                    : (o.response_compliance_pct ?? 100) >= 70
                      ? "text-yellow-500"
                      : "text-red-500"
                }
              />
              <KpiCard
                label="Resolution Compliance"
                value={o.resolution_compliance_pct != null ? `${o.resolution_compliance_pct}%` : "-"}
                icon={faCheckCircle}
                color={
                  (o.resolution_compliance_pct ?? 100) >= 90
                    ? "text-green-500"
                    : (o.resolution_compliance_pct ?? 100) >= 70
                      ? "text-yellow-500"
                      : "text-red-500"
                }
              />
              <KpiCard
                label="Avg Response"
                value={formatDuration(o.avg_response_seconds)}
                icon={faClock}
              />
              <KpiCard
                label="Avg Resolution"
                value={formatDuration(o.avg_resolution_seconds)}
                icon={faClock}
              />
            </div>

            {/* Breach Summary */}
            <div className="flex gap-3 flex-wrap">
              <KpiCard
                label="Response Breaches"
                value={o.response_breaches}
                icon={faExclamationTriangle}
                color="text-red-500"
              />
              <KpiCard
                label="Resolution Breaches"
                value={o.resolution_breaches}
                icon={faExclamationTriangle}
                color="text-red-500"
              />
              <KpiCard label="Responded" value={o.responded} />
              <KpiCard label="Resolved" value={o.resolved} />
            </div>

            {/* Compliance by group */}
            {breakdownChartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Compliance by {groupBy === "sla" ? "SLA" : groupBy === "category" ? "Category" : "Team"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={breakdownChartData}
                    xKey="name"
                    yKey="value"
                    height={300}
                    yAxisLabel="Compliance %"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 2. Breach Analysis Report ───────────────────────────────────────

interface BreachData {
  by_sla: Array<{ sla_id: number; breach_count: number; response_breaches: number; resolution_breaches: number }>;
  by_category: Array<{ category_id: number; breach_count: number }>;
  by_priority: Array<{ priority_id: number; breach_count: number }>;
  by_hour: Array<{ hour: number; breach_count: number }>;
  recent_breaches: Array<{
    id: number;
    name: string;
    sla_id: number;
    sla_response_breached: boolean;
    sla_resolution_breached: boolean;
    sla_started_at: string;
  }>;
}

export function BreachAnalysisDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const [data, setData] = useState<BreachData | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<DateRange>(() => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return { from, to };
  });

  const slas = useSelector((state: RootState) => state.slas?.value ?? []);
  const categories = useSelector((state: RootState) => state.categories?.value ?? []);
  const priorities = useSelector((state: RootState) => state.priorities?.value ?? []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get("/analytics/sla/breach-analysis", { params: { from: range.from, to: range.to } })
      .then((r) => setData(r.data?.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, range]);

  const bySlaChart = useMemo(
    () =>
      (data?.by_sla ?? []).map((row) => ({
        name: (slas as any[]).find((s: any) => s.id === row.sla_id)?.name ?? `SLA #${row.sla_id}`,
        response: row.response_breaches,
        resolution: row.resolution_breaches,
      })),
    [data, slas]
  );

  const byCategoryChart = useMemo(
    () =>
      (data?.by_category ?? []).map((row) => ({
        name: (categories as any[]).find((c: any) => c.id === row.category_id)?.name ?? `Cat #${row.category_id}`,
        value: row.breach_count,
      })),
    [data, categories]
  );

  const byHourChart = useMemo(
    () =>
      (data?.by_hour ?? []).map((row) => ({
        name: `${String(row.hour).padStart(2, "0")}:00`,
        value: row.breach_count,
      })),
    [data]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("hotelAnalytics.sla.breachAnalysis.title", "SLA Breach Analysis")}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <DateRangePicker value={range} onChange={setRange} />
        </div>

        {loading ? (
          <LoadingState />
        ) : data ? (
          <div className="space-y-6">
            {/* Breaches by SLA */}
            {bySlaChart.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Breaches by SLA</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart data={bySlaChart} xKey="name" yKey="response" height={280} yAxisLabel="Count" />
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Breaches by Category */}
              {byCategoryChart.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Breaches by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PieChart data={byCategoryChart} nameKey="name" valueKey="value" height={250} />
                  </CardContent>
                </Card>
              )}

              {/* Breaches by Hour */}
              {byHourChart.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Breaches by Hour of Day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart data={byHourChart} xKey="name" yKey="value" height={250} yAxisLabel="Breaches" />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Breaches Table */}
            {(data.recent_breaches?.length ?? 0) > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Breaches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 px-2">Task</th>
                          <th className="text-left py-2 px-2">SLA</th>
                          <th className="text-center py-2 px-2">Response</th>
                          <th className="text-center py-2 px-2">Resolution</th>
                          <th className="text-left py-2 px-2">Started</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent_breaches.map((task) => (
                          <tr key={task.id} className="border-b last:border-0">
                            <td className="py-2 px-2 font-medium">{task.name}</td>
                            <td className="py-2 px-2">
                              {(slas as any[]).find((s: any) => s.id === task.sla_id)?.name ?? "-"}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {task.sla_response_breached ? (
                                <span className="text-red-500 font-semibold">Breached</span>
                              ) : (
                                <span className="text-green-500">OK</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {task.sla_resolution_breached ? (
                                <span className="text-red-500 font-semibold">Breached</span>
                              ) : (
                                <span className="text-green-500">OK</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-muted-foreground">
                              {task.sla_started_at ? new Date(task.sla_started_at).toLocaleDateString() : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 3. Escalation Report ────────────────────────────────────────────

interface EscalationData {
  total_escalations: number;
  by_phase: Array<{ sla_phase: string; total: number; acknowledged: number }>;
  escalated_tasks: number;
  resolved_after_escalation: number;
  resolution_rate_pct: number | null;
  daily_trend: Array<{ date: string; count: number }>;
}

export function EscalationReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const [data, setData] = useState<EscalationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<DateRange>(() => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return { from, to };
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get("/analytics/sla/escalation-report", { params: { from: range.from, to: range.to } })
      .then((r) => setData(r.data?.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, range]);

  const trendData = useMemo(
    () =>
      (data?.daily_trend ?? []).map((row) => ({
        name: new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        value: row.count,
      })),
    [data]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("hotelAnalytics.sla.escalation.title", "Escalation Report")}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <DateRangePicker value={range} onChange={setRange} />
        </div>

        {loading ? (
          <LoadingState />
        ) : data ? (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="flex gap-3 flex-wrap">
              <KpiCard
                label="Total Escalations"
                value={data.total_escalations}
                icon={faArrowUp}
                color="text-orange-500"
              />
              <KpiCard label="Escalated Tasks" value={data.escalated_tasks} />
              <KpiCard
                label="Resolved After"
                value={data.resolved_after_escalation}
                icon={faCheckCircle}
                color="text-green-500"
              />
              <KpiCard
                label="Resolution Rate"
                value={data.resolution_rate_pct != null ? `${data.resolution_rate_pct}%` : "-"}
                color={
                  (data.resolution_rate_pct ?? 0) >= 70
                    ? "text-green-500"
                    : "text-yellow-500"
                }
              />
            </div>

            {/* Phase breakdown */}
            {(data.by_phase?.length ?? 0) > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Escalations by Phase</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.by_phase.map((row) => (
                      <div key={row.sla_phase} className="flex items-center justify-between py-1 border-b last:border-0">
                        <span className="capitalize font-medium">{row.sla_phase}</span>
                        <div className="flex gap-4 text-sm">
                          <span>Total: <strong>{row.total}</strong></span>
                          <span>Acknowledged: <strong>{row.acknowledged}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Daily Trend */}
            {trendData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Daily Escalation Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart data={trendData} xKey="name" yKey="value" height={280} yAxisLabel="Escalations" />
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 4. Response Time Trends Report ──────────────────────────────────

interface TrendPoint {
  period: string;
  count: number;
  avg_seconds: number | null;
  p50_seconds: number | null;
  p90_seconds: number | null;
  p95_seconds: number | null;
}

interface TrendsData {
  interval: string;
  response_trends: TrendPoint[];
  resolution_trends: TrendPoint[];
}

export function ResponseTimeTrendsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<DateRange>(() => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return { from, to };
  });
  const [interval, setInterval_] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get("/analytics/sla/response-time-trends", {
        params: { from: range.from, to: range.to, interval },
      })
      .then((r) => setData(r.data?.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, range, interval]);

  const formatPeriod = (p: string) => {
    const d = new Date(p);
    if (interval === "monthly") return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const responseTrendChart = useMemo(
    () =>
      (data?.response_trends ?? []).map((row) => ({
        name: formatPeriod(row.period),
        avg: row.avg_seconds ? Math.round(row.avg_seconds / 60) : 0,
        p50: row.p50_seconds ? Math.round(row.p50_seconds / 60) : 0,
        p90: row.p90_seconds ? Math.round(row.p90_seconds / 60) : 0,
      })),
    [data, interval]
  );

  const resolutionTrendChart = useMemo(
    () =>
      (data?.resolution_trends ?? []).map((row) => ({
        name: formatPeriod(row.period),
        avg: row.avg_seconds ? Math.round(row.avg_seconds / 60) : 0,
        p50: row.p50_seconds ? Math.round(row.p50_seconds / 60) : 0,
        p90: row.p90_seconds ? Math.round(row.p90_seconds / 60) : 0,
      })),
    [data, interval]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("hotelAnalytics.sla.responseTimeTrends.title", "Response Time Trends")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <DateRangePicker value={range} onChange={setRange} />
          <select
            className="border rounded px-2 py-1 bg-background text-foreground text-sm"
            value={interval}
            onChange={(e) => setInterval_(e.target.value as any)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {loading ? (
          <LoadingState />
        ) : data ? (
          <div className="space-y-6">
            {/* Response Time Trend */}
            {responseTrendChart.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Response Time (minutes)</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={responseTrendChart}
                    xKey="name"
                    yKey="avg"
                    height={300}
                    yAxisLabel="Minutes"
                  />
                </CardContent>
              </Card>
            )}

            {/* Resolution Time Trend */}
            {resolutionTrendChart.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resolution Time (minutes)</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={resolutionTrendChart}
                    xKey="name"
                    yKey="avg"
                    height={300}
                    yAxisLabel="Minutes"
                  />
                </CardContent>
              </Card>
            )}

            {responseTrendChart.length === 0 && resolutionTrendChart.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No trend data available for the selected period
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
