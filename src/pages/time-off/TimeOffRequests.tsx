import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faPlus,
  faClock,
  faCheck,
  faTimes,
  faHourglass
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/providers/LanguageProvider";
import { TimeOffRequest, TimeOffType, TimeOffBalance } from "@/pages/settings/sub_pages/working-hours/types";
import { useTable, collections } from "@/store/dexie";
import { useAuth } from "@/providers/AuthProvider";
import dayjs from "dayjs";

interface TimeOffRequestsProps {
  userId?: number;
}

function TimeOffRequests({ userId }: TimeOffRequestsProps) {
  const { t } = useLanguage();
  const tt = (key: string, fallback: string) => t(`timeOff.${key}`, fallback);

  // Auth state
  const { user: currentUser } = useAuth();
  const requests = useTable('time_off_requests') as TimeOffRequest[];
  const types = useTable('time_off_types') as TimeOffType[];

  // Filter requests for current user
  const myRequests = useMemo(() => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return [];
    return requests
      .filter(r => r.user_id === targetUserId)
      .sort((a, b) => dayjs(b.start_date).valueOf() - dayjs(a.start_date).valueOf());
  }, [requests, userId, currentUser?.id]);

  // Calculate balances
  const balances = useMemo(() => {
    const currentYear = dayjs().year();
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return [];

    return types
      .filter(type => type.is_active)
      .map(type => {
        const usedDays = myRequests
          .filter(r => 
            r.time_off_type_id === type.id && 
            r.status === 'approved' &&
            dayjs(r.start_date).year() === currentYear
          )
          .reduce((sum, r) => sum + r.total_days, 0);

        return {
          type_id: type.id,
          type_name: type.name,
          type_code: type.code,
          year: currentYear,
          max_days: type.max_days_per_year || 0,
          used_days: usedDays,
          remaining_days: type.max_days_per_year ? Math.max(0, type.max_days_per_year - usedDays) : Infinity,
          has_limit: !!type.max_days_per_year,
          color: type.color
        };
      });
  }, [types, myRequests, userId, currentUser?.id]);

  // Dialog state
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    time_off_type_id: '',
    start_date: '',
    end_date: '',
    start_half_day: false,
    end_half_day: false,
    reason: ''
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      time_off_type_id: '',
      start_date: '',
      end_date: '',
      start_half_day: false,
      end_half_day: false,
      reason: ''
    });
    setFormError(null);
  };

  // Calculate total days
  const calculateTotalDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = dayjs(formData.start_date);
    const end = dayjs(formData.end_date);
    let days = end.diff(start, 'day') + 1;
    if (formData.start_half_day) days -= 0.5;
    if (formData.end_half_day) days -= 0.5;
    return Math.max(0, days);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!formData.time_off_type_id) {
      setFormError(tt('error.typeRequired', 'Please select a time-off type'));
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      setFormError(tt('error.datesRequired', 'Please select start and end dates'));
      return;
    }
    if (dayjs(formData.end_date).isBefore(dayjs(formData.start_date))) {
      setFormError(tt('error.invalidDates', 'End date must be after start date'));
      return;
    }

    setIsSubmitting(true);
    try {
      await collections.time_off_requests.add({
        time_off_type_id: Number(formData.time_off_type_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_half_day: formData.start_half_day,
        end_half_day: formData.end_half_day,
        reason: formData.reason || null
      });
      setIsRequestDialogOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || tt('error.generic', 'Failed to submit request'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel request
  const handleCancelRequest = async (requestId: number) => {
    await collections.time_off_requests.update(requestId, { status: 'cancelled' });
  };

  // Status badge
  const getStatusBadge = (status: TimeOffRequest['status']) => {
    const config = {
      pending: { icon: faHourglass, class: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { icon: faCheck, class: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { icon: faTimes, class: 'bg-red-100 text-red-800', label: 'Rejected' },
      cancelled: { icon: faTimes, class: 'bg-gray-100 text-gray-600', label: 'Cancelled' }
    };
    const c = config[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${c.class}`}>
        <FontAwesomeIcon icon={c.icon} className="h-3 w-3" />
        {c.label}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarDays} className="text-blue-500" />
            {tt('title', 'Time Off')}
          </h1>
          <p className="text-muted-foreground">
            {tt('description', 'Request and manage your time off')}
          </p>
        </div>
        <Button onClick={() => setIsRequestDialogOpen(true)}>
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          {tt('actions.request', 'Request Time Off')}
        </Button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map(balance => (
          <Card key={balance.type_id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: balance.color || '#6B7280' }}
                />
                {balance.type_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balance.has_limit ? (
                  <>
                    {balance.remaining_days} <span className="text-sm font-normal text-muted-foreground">/ {balance.max_days}</span>
                  </>
                ) : (
                  <span className="text-lg">Unlimited</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {tt('balance.remaining', 'days remaining in')} {balance.year}
              </p>
              {balance.has_limit && (
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (balance.used_days / balance.max_days) * 100)}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="text-blue-500" />
            {tt('requests.title', 'My Requests')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tt('requests.empty', 'No time-off requests yet')}
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map(request => {
                const type = types.find(t => t.id === request.time_off_type_id);
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: type?.color || '#6B7280' }}
                      />
                      <div>
                        <p className="font-medium">{type?.name || 'Unknown Type'}</p>
                        <p className="text-sm text-muted-foreground">
                          {dayjs(request.start_date).format('MMM D, YYYY')}
                          {request.start_half_day && ' (PM)'}
                          {' - '}
                          {dayjs(request.end_date).format('MMM D, YYYY')}
                          {request.end_half_day && ' (AM)'}
                          {' · '}
                          {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-muted-foreground italic mt-1">
                            {request.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(request.status)}
                      {request.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          {tt('actions.cancel', 'Cancel')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{tt('dialog.title', 'Request Time Off')}</DialogTitle>
            <DialogDescription>
              {tt('dialog.description', 'Submit a new time-off request')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label>{tt('fields.type', 'Type')}</Label>
              <Select
                value={formData.time_off_type_id}
                onValueChange={(value) => setFormData({ ...formData, time_off_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tt('fields.selectType', 'Select a type')} />
                </SelectTrigger>
                <SelectContent>
                  {types.filter(t => t.is_active).map(type => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color || '#6B7280' }}
                        />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tt('fields.startDate', 'Start Date')}</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="start_half_day"
                    checked={formData.start_half_day}
                    onCheckedChange={(checked) => setFormData({ ...formData, start_half_day: !!checked })}
                  />
                  <label htmlFor="start_half_day" className="text-sm">
                    {tt('fields.halfDayPM', 'Start at noon (PM)')}
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tt('fields.endDate', 'End Date')}</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="end_half_day"
                    checked={formData.end_half_day}
                    onCheckedChange={(checked) => setFormData({ ...formData, end_half_day: !!checked })}
                  />
                  <label htmlFor="end_half_day" className="text-sm">
                    {tt('fields.halfDayAM', 'End at noon (AM)')}
                  </label>
                </div>
              </div>
            </div>

            {formData.start_date && formData.end_date && (
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>{calculateTotalDays()}</strong> {calculateTotalDays() === 1 ? 'day' : 'days'} {tt('fields.selected', 'selected')}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{tt('fields.reason', 'Reason (optional)')}</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder={tt('fields.reasonPlaceholder', 'Add a note for your manager...')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRequestDialogOpen(false); resetForm(); }}>
              {tt('actions.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? tt('actions.submitting', 'Submitting...') : tt('actions.submit', 'Submit Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TimeOffRequests;
