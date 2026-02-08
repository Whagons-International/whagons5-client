import { useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { RootState } from "@/store/store";
import {
  TRIGGER_EVENT_OPTIONS,
  ACTION_TYPE_OPTIONS,
  CONDITION_OPERATORS,
  CONDITION_FIELDS,
  WEBHOOK_METHODS,
  CONTEXT_VARIABLES,
} from "./constants";
import type { WorkflowFlowNode } from "./types";

interface Props {
  node: WorkflowFlowNode;
  onChange: (nodeId: string, config: Record<string, any>) => void;
  onLabelChange: (nodeId: string, label: string) => void;
  onDelete: (nodeId: string) => void;
}

export function WorkflowConfigPanel({ node, onChange, onLabelChange, onDelete }: Props) {
  const d = node.data;
  const config = d.config ?? {};

  const updateConfig = (key: string, value: any) => {
    onChange(node.id, { ...config, [key]: value });
  };

  // Pull data from Redux for dropdowns
  const statuses = useSelector((s: RootState) => (s as any).statuses?.value ?? []);
  const priorities = useSelector((s: RootState) => (s as any).priorities?.value ?? []);
  const teams = useSelector((s: RootState) => (s as any).teams?.value ?? []);
  const tags = useSelector((s: RootState) => (s as any).tags?.value ?? []);
  const users = useSelector((s: RootState) => (s as any).users?.value ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">{d.nodeType} Configuration</h3>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => onDelete(node.id)}>
          Delete
        </Button>
      </div>

      {/* Common: label */}
      <div className="space-y-1">
        <Label className="text-xs">Label</Label>
        <Input
          value={d.label}
          onChange={(e) => onLabelChange(node.id, e.target.value)}
          placeholder="Node label"
        />
      </div>

      {/* ─── Trigger Config ──────────────────────────── */}
      {d.nodeType === "trigger" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Trigger event</Label>
            <Select value={config.event ?? ""} onValueChange={(v) => updateConfig("event", v)}>
              <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {TRIGGER_EVENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Details / notes</Label>
            <Textarea
              value={config.details ?? ""}
              onChange={(e) => updateConfig("details", e.target.value)}
              placeholder="Optional context for this trigger"
              rows={2}
            />
          </div>
        </>
      )}

      {/* ─── Action Config ───────────────────────────── */}
      {d.nodeType === "action" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Action type</Label>
            <Select value={config.action_type ?? ""} onValueChange={(v) => updateConfig("action_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Change status */}
          {config.action_type === "change_status" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Task source</Label>
                <Select value={config.task_source ?? "trigger"} onValueChange={(v) => updateConfig("task_source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trigger">From trigger</SelectItem>
                    <SelectItem value="id">Specific task ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {config.task_source === "id" && (
                <div className="space-y-1">
                  <Label className="text-xs">Task ID</Label>
                  <Input type="number" value={config.task_id ?? ""} onChange={(e) => updateConfig("task_id", Number(e.target.value))} />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">New status</Label>
                <Select value={String(config.status_id ?? "")} onValueChange={(v) => updateConfig("status_id", Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Assign user */}
          {config.action_type === "assign_user" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Task source</Label>
                <Select value={config.task_source ?? "trigger"} onValueChange={(v) => updateConfig("task_source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trigger">From trigger</SelectItem>
                    <SelectItem value="id">Specific task ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">User</Label>
                <Select value={String(config.user_id ?? "")} onValueChange={(v) => updateConfig("user_id", Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name ?? u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Create task */}
          {config.action_type === "create_task" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Task title</Label>
                <Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} placeholder="Follow-up: {{trigger.task.name}}" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea value={config.description ?? ""} onChange={(e) => updateConfig("description", e.target.value)} placeholder="Auto-created by workflow" rows={2} />
              </div>
            </>
          )}

          {/* Set priority */}
          {config.action_type === "set_priority" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Task source</Label>
                <Select value={config.task_source ?? "trigger"} onValueChange={(v) => updateConfig("task_source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trigger">From trigger</SelectItem>
                    <SelectItem value="id">Specific task ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={String(config.priority_id ?? "")} onValueChange={(v) => updateConfig("priority_id", Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {priorities.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Add tag */}
          {config.action_type === "add_tag" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Task source</Label>
                <Select value={config.task_source ?? "trigger"} onValueChange={(v) => updateConfig("task_source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trigger">From trigger</SelectItem>
                    <SelectItem value="id">Specific task ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tag</Label>
                <Select value={String(config.tag_id ?? "")} onValueChange={(v) => updateConfig("tag_id", Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
                  <SelectContent>
                    {tags.map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Notify team */}
          {config.action_type === "notify_team" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Team</Label>
                <Select value={String(config.team_id ?? "")} onValueChange={(v) => updateConfig("team_id", Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} placeholder="Workflow Alert" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Message</Label>
                <Textarea value={config.message ?? ""} onChange={(e) => updateConfig("message", e.target.value)} placeholder="Use {{trigger.task.name}} for variables" rows={2} />
              </div>
            </>
          )}

          {/* Send email */}
          {config.action_type === "send_email" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">To (email)</Label>
                <Input value={config.to ?? ""} onChange={(e) => updateConfig("to", e.target.value)} placeholder="user@example.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subject</Label>
                <Input value={config.subject ?? ""} onChange={(e) => updateConfig("subject", e.target.value)} placeholder="Workflow notification" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Body</Label>
                <Textarea value={config.body ?? ""} onChange={(e) => updateConfig("body", e.target.value)} placeholder="Use {{trigger.task.name}} for variables" rows={3} />
              </div>
            </>
          )}

          {/* Webhook */}
          {config.action_type === "webhook" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">URL</Label>
                <Input value={config.url ?? ""} onChange={(e) => updateConfig("url", e.target.value)} placeholder="https://api.example.com/webhook" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={config.method ?? "POST"} onValueChange={(v) => updateConfig("method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEBHOOK_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Body template (JSON)</Label>
                <Textarea
                  value={config.body_template ?? ""}
                  onChange={(e) => updateConfig("body_template", e.target.value)}
                  placeholder='{"task_id": "{{trigger.task.id}}"}'
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Timeout (seconds)</Label>
                <Input type="number" min={1} max={60} value={config.timeout_seconds ?? 10} onChange={(e) => updateConfig("timeout_seconds", Number(e.target.value))} />
              </div>
            </>
          )}

          {/* On error */}
          <div className="space-y-1 pt-2 border-t">
            <Label className="text-xs">On error</Label>
            <Select value={config.on_error ?? "stop"} onValueChange={(v) => updateConfig("on_error", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stop">Stop workflow</SelectItem>
                <SelectItem value="continue">Continue to next node</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* ─── Condition Config ────────────────────────── */}
      {d.nodeType === "condition" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Field</Label>
            <Select value={config.field ?? ""} onValueChange={(v) => updateConfig("field", v)}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                {CONDITION_FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Operator</Label>
            <Select value={config.operator ?? "equals"} onValueChange={(v) => updateConfig("operator", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITION_OPERATORS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!["is_empty", "is_not_empty"].includes(config.operator ?? "") && (
            <div className="space-y-1">
              <Label className="text-xs">Value</Label>
              <Input value={config.value ?? ""} onChange={(e) => updateConfig("value", e.target.value)} placeholder="Expected value" />
            </div>
          )}
        </>
      )}

      {/* ─── Delay Config ────────────────────────────── */}
      {d.nodeType === "delay" && (
        <div className="space-y-1">
          <Label className="text-xs">Delay (minutes)</Label>
          <Input
            type="number"
            min={1}
            value={config.duration_minutes ?? 5}
            onChange={(e) => updateConfig("duration_minutes", Number(e.target.value))}
          />
        </div>
      )}

      {/* ─── Variable hints ──────────────────────────── */}
      <div className="pt-2 border-t">
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground font-medium">
            Available variables
          </summary>
          <div className="mt-2 space-y-1 max-h-32 overflow-auto">
            {CONTEXT_VARIABLES.map((v) => (
              <div key={v.path} className="flex justify-between gap-2">
                <code className="text-[10px] bg-muted px-1 rounded font-mono">{`{{${v.path}}}`}</code>
                <span className="text-muted-foreground">{v.label}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
