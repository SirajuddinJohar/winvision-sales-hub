import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import PageHeader from '@/components/layout/PageHeader';
import { Calendar } from 'lucide-react';

interface TourPlan {
  id: string;
  user_id: string;
  month: number;
  year: number;
  status: 'draft' | 'locked' | 'approved';
  approval_message?: string;
  locked_at?: string;
  approved_at?: string;
  edit_until?: string | null;
}

interface TourPlanDay {
  id: string;
  tour_plan_id: string;
  date: number;
  areas: any;
  remarks?: string;
  is_holiday: boolean;
  is_weekly_off: boolean;
}

interface Area {
  id: string;
  area_name: string;
}

const MonthlyTourPlan = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [tourPlan, setTourPlan] = useState<TourPlan | null>(null);
  const [planDays, setPlanDays] = useState<TourPlanDay[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Helper function to check if plan can be edited
  const canEditPlan = (plan: TourPlan | null): boolean => {
    if (!plan) return false;
    // Initial draft with no edit_until restriction
    if (plan.status === 'draft' && !plan.edit_until) return true;
    // Time-based edit window is active
    if (plan.edit_until && new Date(plan.edit_until) > new Date()) return true;
    return false;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    fetchAreas();
    fetchTourPlan();
    checkAndUnlockForFirstOfMonth();
  }, [selectedYear, selectedMonth]);

  const fetchAreas = async () => {
    const { data, error } = await supabase
      .from('areas')
      .select('id, area_name')
      .order('area_name');
    
    if (error) {
      toast({ title: 'Error fetching areas', variant: 'destructive' });
    } else {
      setAreas(data || []);
    }
  };

  const fetchTourPlan = async () => {
    setLoading(true);
    const { data: planData, error: planError } = await supabase
      .from('tour_plans')
      .select('*')
      .eq('user_id', user?.id)
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .maybeSingle();

    if (planError && planError.code !== 'PGRST116') {
      toast({ title: 'Error fetching tour plan', variant: 'destructive' });
      setLoading(false);
      return;
    }

    setTourPlan(planData);

    if (planData) {
      const { data: daysData, error: daysError } = await supabase
        .from('tour_plan_days')
        .select('*')
        .eq('tour_plan_id', planData.id)
        .order('date');

      if (daysError) {
        toast({ title: 'Error fetching plan days', variant: 'destructive' });
      } else {
        setPlanDays(daysData || []);
      }

      // Check for pending edit requests
      const { data: requestData } = await supabase
        .from('tour_plan_edit_requests')
        .select('status')
        .eq('tour_plan_id', planData.id)
        .eq('status', 'pending')
        .maybeSingle();

      setHasPendingRequest(!!requestData);
    } else {
      setPlanDays([]);
      setHasPendingRequest(false);
    }
    
    setLoading(false);
  };

  const createTourPlan = async () => {
    const { data, error } = await supabase
      .from('tour_plans')
      .insert({
        user_id: user?.id,
        month: selectedMonth,
        year: selectedYear,
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error creating tour plan', variant: 'destructive' });
      return null;
    }

    setTourPlan(data);
    return data;
  };

  const handleDateClick = (date: number) => {
    if (!canEditPlan(tourPlan)) {
      toast({ 
        title: 'Plan is locked', 
        description: 'Request edit permission from admin to make changes',
        variant: 'destructive' 
      });
      return;
    }

    const dayData = planDays.find(d => d.date === date);
    setSelectedDate(date);
    setSelectedAreas(dayData?.areas?.map((a: any) => a.id) || []);
    setRemarks(dayData?.remarks || '');
    setIsHoliday(dayData?.is_holiday || false);
    setIsModalOpen(true);
  };

  const handleSaveDate = async () => {
    if (!selectedDate) return;

    let currentPlan = tourPlan;
    if (!currentPlan) {
      currentPlan = await createTourPlan();
      if (!currentPlan) return;
    }

    const selectedAreaObjects = areas.filter(a => selectedAreas.includes(a.id))
      .map(a => ({ id: a.id, name: a.area_name }));

    const dayData = planDays.find(d => d.date === selectedDate);
    
    if (dayData) {
      const { error } = await supabase
        .from('tour_plan_days')
        .update({
          areas: selectedAreaObjects,
          remarks,
          is_holiday: isHoliday,
          is_weekly_off: new Date(selectedYear, selectedMonth - 1, selectedDate).getDay() === 0
        })
        .eq('id', dayData.id);

      if (error) {
        toast({ title: 'Error updating day', variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('tour_plan_days')
        .insert({
          tour_plan_id: currentPlan.id,
          date: selectedDate,
          areas: selectedAreaObjects,
          remarks,
          is_holiday: isHoliday,
          is_weekly_off: new Date(selectedYear, selectedMonth - 1, selectedDate).getDay() === 0
        });

      if (error) {
        toast({ title: 'Error adding day', variant: 'destructive' });
        return;
      }
    }

    // Lock plan after saving date 1
    if (selectedDate === 1 && currentPlan.status === 'draft') {
      const { error: lockError } = await supabase
        .from('tour_plans')
        .update({ 
          status: 'locked',
          locked_at: new Date().toISOString(),
          edit_until: null
        })
        .eq('id', currentPlan.id);

      if (lockError) {
        toast({ title: 'Error locking plan', variant: 'destructive' });
      } else {
        toast({ title: 'Plan locked successfully', description: 'Your plan is now submitted for approval' });
      }
    }

    setIsModalOpen(false);
    fetchTourPlan();
    toast({ title: 'Date saved successfully' });
  };

  const handleRequestEdit = async () => {
    if (!tourPlan) return;

    if (hasPendingRequest) {
      toast({
        title: "Request Already Pending",
        description: "You already have a pending edit request for this tour plan.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('tour_plan_edit_requests')
      .insert({
        tour_plan_id: tourPlan.id,
        user_id: user?.id,
        request_reason: 'Request to edit tour plan'
      });

    if (error) {
      toast({ title: 'Error requesting edit', variant: 'destructive' });
    } else {
      setHasPendingRequest(true);
      toast({ title: 'Edit request sent to admin' });
    }
  };

  const checkAndUnlockForFirstOfMonth = async () => {
    const today = new Date();
    const currentDateNum = today.getDate();
    
    // Only unlock if it's the 1st of the month
    if (currentDateNum !== 1) return;
    
    try {
      if (!user?.id) return;

      // Check if tour plan exists for this month
      const { data: planData } = await supabase
        .from('tour_plans')
        .select('id, edit_until')
        .eq('user_id', user.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .maybeSingle();

      if (!planData) return;

      // Check if already unlocked for today
      if (planData.edit_until) {
        const editUntil = new Date(planData.edit_until);
        if (editUntil > today) {
          // Already unlocked, no need to update
          return;
        }
      }

      // Set edit window to 24 hours from midnight
      const midnight = new Date(today);
      midnight.setHours(0, 0, 0, 0);
      const unlockUntil = new Date(midnight.getTime() + 24 * 60 * 60 * 1000);

      await supabase
        .from('tour_plans')
        .update({
          status: 'draft',
          edit_until: unlockUntil.toISOString(),
        })
        .eq('id', planData.id);

      // Refresh tour plan data
      fetchTourPlan();

      toast({
        title: "Plan Unlocked",
        description: "Your tour plan is now editable for 24 hours",
      });
    } catch (error) {
      console.error('Error checking first of month unlock:', error);
    }
  };

  const getDaysInMonth = () => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  };

  const getDayName = (date: number) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[new Date(selectedYear, selectedMonth - 1, date).getDay()];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Monthly Tour Plan" description="Plan your monthly tours" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Monthly Tour Plan" description="Plan your monthly tours" />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header Section */}
        <div className="bg-card rounded-lg p-6 mb-6 shadow-sm border">
          <div className="text-center mb-4">
            <div className="text-2xl font-semibold text-foreground mb-2">
              {format(currentDate, 'MMMM dd, yyyy')}
            </div>
            <div className="text-lg text-muted-foreground">
              Hi {profile?.name || 'User'}
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <Calendar className="h-5 w-5" />
              Tour Plan for {monthNames[selectedMonth - 1]} {selectedYear}
            </h2>
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Month</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((m, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={handleRequestEdit}
              disabled={!tourPlan || canEditPlan(tourPlan) || hasPendingRequest}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {hasPendingRequest ? "Request Pending" : "Request Edit"}
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1 border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              Go Back
            </Button>
          </div>

          {/* Status Box */}
          {tourPlan && canEditPlan(tourPlan) && tourPlan.edit_until && (
            <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded text-center mb-4">
              ✏️ Edit window active - You can edit until {new Date(tourPlan.edit_until).toLocaleString()}
            </div>
          )}
          
          {tourPlan?.status === 'approved' && !canEditPlan(tourPlan) && (
            <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded text-center">
              ✓ Your Tour Plan is approved
            </div>
          )}
          {tourPlan?.status === 'locked' && !canEditPlan(tourPlan) && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded text-center">
              ⏳ Your Tour Plan is locked - Request edit to make changes
            </div>
          )}
          {hasPendingRequest && (
            <div className="bg-orange-100 border border-orange-400 text-orange-800 px-4 py-3 rounded text-center mt-4">
              📋 Your edit request is pending admin approval
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map(date => {
            const dayData = planDays.find(d => d.date === date);
            const dayName = getDayName(date);
            const isWeeklyOff = dayName === 'Sun';
            
            return (
              <div
                key={date}
                onClick={() => handleDateClick(date)}
                className="bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow min-h-[120px]"
              >
                <div className="font-semibold text-sm mb-2">
                  {String(date).padStart(2, '0')} {dayName}
                </div>
                {isWeeklyOff ? (
                  <div className="text-red-600 text-xs font-medium">Weekly Off</div>
                ) : dayData?.is_holiday ? (
                  <div className="text-red-600 text-xs font-medium">Holiday</div>
                ) : (
                  <>
                    {dayData?.areas && dayData.areas.length > 0 && (
                      <div className="space-y-1">
                        {(dayData.areas as any[]).map((area: any, idx: number) => (
                          <div key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {area.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {dayData?.remarks && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {dayData.remarks}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Date: {selectedDate && `${String(selectedDate).padStart(2, '0')} ${getDayName(selectedDate)}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Areas (Hold Ctrl/Cmd for multiple)</Label>
              <select
                multiple
                className="w-full border rounded-md p-2 min-h-[120px]"
                value={selectedAreas}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedAreas(selected);
                }}
              >
                {areas.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.area_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Remarks</Label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="holiday"
                checked={isHoliday}
                onChange={(e) => setIsHoliday(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="holiday">Mark as Holiday</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDate}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyTourPlan;