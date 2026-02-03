import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import PageHeader from '@/components/layout/PageHeader';
import { Calendar, Trash2, MapPin, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const { isAdmin } = useRoleAccess();
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
  const [isWeeklyOff, setIsWeeklyOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [lastRequest, setLastRequest] = useState<{
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    requested_at: string;
    admin_response_at?: string | null;
    admin_remarks?: string | null;
  } | null>(null);
  const [todayArea, setTodayArea] = useState<string | null>(null);
  const [showTodayPlan, setShowTodayPlan] = useState(false);
  const [todayPlanData, setTodayPlanData] = useState<TourPlanDay | null>(null);

  // Helper function to check if plan can be edited
  const canEditPlan = (plan: TourPlan | null): boolean => {
    // No plan yet means user can create one
    if (!plan) return true;
    // Initial draft with no edit_until restriction
    if (plan.status === 'draft' && !plan.edit_until) return true;
    // Time-based edit window is active
    if (plan.edit_until && new Date(plan.edit_until) > new Date()) return true;
    return false;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Redirect admin users away from this page
  useEffect(() => {
    if (profile && isAdmin) {
      navigate('/dashboard');
      toast({
        title: 'Access Restricted',
        description: 'This page is only for MR users',
        variant: 'destructive'
      });
    }
  }, [profile, isAdmin, navigate, toast]);

  useEffect(() => {
    if (!user?.id) return;
    fetchAreas();
    fetchTourPlan();
    checkAndUnlockForFirstOfMonth();
    fetchTodayPlan();
  }, [selectedYear, selectedMonth, user?.id]);

  // Fetch today's plan data
  const fetchTodayPlan = async () => {
    if (!user?.id) return;
    
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();
    
    // Get tour plan for current month
    const { data: planData } = await supabase
      .from('tour_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('month', todayMonth)
      .eq('year', todayYear)
      .maybeSingle();
    
    if (planData) {
      const { data: dayData } = await supabase
        .from('tour_plan_days')
        .select('*')
        .eq('tour_plan_id', planData.id)
        .eq('date', todayDate)
        .maybeSingle();
      
      setTodayPlanData(dayData);
      
      // Get first area from today's plan if exists
      if (dayData?.areas && Array.isArray(dayData.areas) && dayData.areas.length > 0) {
        setTodayArea((dayData.areas as any[])[0]?.id || null);
      }
    }
  };

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

    if (!user?.id) {
      setLoading(false);
      setTourPlan(null);
      setPlanDays([]);
      setHasPendingRequest(false);
      setLastRequest(null);
      return;
    }

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

      // Fetch the most recent edit request
      const { data: lastReq } = await supabase
        .from('tour_plan_edit_requests')
        .select('id, status, requested_at, admin_response_at, admin_remarks')
        .eq('tour_plan_id', planData.id)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setLastRequest(lastReq || null);
      setHasPendingRequest(lastReq?.status === 'pending');
    } else {
      setPlanDays([]);
      setHasPendingRequest(false);
      setLastRequest(null);
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
    // Block editing if there's a pending request
    if (hasPendingRequest) {
      toast({ 
        title: 'Edit Request Pending', 
        description: 'Please wait for admin approval before making changes',
        variant: 'destructive' 
      });
      return;
    }

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
    setIsWeeklyOff(dayData?.is_weekly_off || false);
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
          is_weekly_off: isWeeklyOff
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
          is_weekly_off: isWeeklyOff
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
    console.log('Request Edit clicked', { tourPlan, hasPendingRequest, canEdit: canEditPlan(tourPlan) });
    
    if (hasPendingRequest) {
      toast({
        title: "Request Already Pending",
        description: "You already have a pending edit request for this tour plan.",
        variant: "destructive",
      });
      return;
    }

    // Auto-create plan if it doesn't exist
    let currentPlan = tourPlan;
    if (!currentPlan) {
      currentPlan = await createTourPlan();
      if (!currentPlan) return;
      setTourPlan(currentPlan);
    }

    try {
      const { data, error } = await supabase
        .from('tour_plan_edit_requests')
        .insert({
          tour_plan_id: currentPlan.id,
          user_id: user?.id,
          request_reason: 'Request to edit tour plan',
          status: 'pending'
        })
        .select('id, status, requested_at, admin_response_at, admin_remarks')
        .single();

      if (error) {
        console.error('Error creating request:', error);
        toast({ 
          title: 'Error requesting edit', 
          description: error.message,
          variant: 'destructive' 
        });
        return;
      }

      console.log('Request created successfully:', data);
      setLastRequest(data);
      setHasPendingRequest(true);
      toast({ 
        title: 'Edit request sent', 
        description: 'Your request has been sent to the admin for approval.' 
      });
    } catch (error) {
      console.error('Exception in handleRequestEdit:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to send edit request',
        variant: 'destructive' 
      });
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

      // Set edit window until 12:00 AM (midnight) of the next day
      const unlockUntil = new Date(today);
      unlockUntil.setDate(unlockUntil.getDate() + 1);
      unlockUntil.setHours(0, 0, 0, 0);

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

  const handleDeleteTourPlan = async () => {
    if (!tourPlan) return;

    try {
      // First delete all tour plan days
      const { error: daysError } = await supabase
        .from('tour_plan_days')
        .delete()
        .eq('tour_plan_id', tourPlan.id);

      if (daysError) throw daysError;

      // Then delete the tour plan itself
      const { error: planError } = await supabase
        .from('tour_plans')
        .delete()
        .eq('id', tourPlan.id);

      if (planError) throw planError;

      toast({
        title: 'Tour plan deleted',
        description: 'The tour plan has been successfully deleted.',
      });

      setShowDeleteDialog(false);
      fetchTourPlan();
    } catch (error) {
      console.error('Error deleting tour plan:', error);
      toast({
        title: 'Error deleting tour plan',
        description: 'Failed to delete the tour plan. Please try again.',
        variant: 'destructive',
      });
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
      
      <div className="container mx-auto px-3 py-2 md:px-4 md:py-6 max-w-6xl">
        {/* Today's Plan Section */}
        <Card className="mb-4 md:mb-6 border-primary/20 bg-primary/5">
          <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Today's Plan - {format(currentDate, 'MMMM dd, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {todayPlanData ? (
              <div className="space-y-3">
                {todayPlanData.is_holiday ? (
                  <Badge variant="destructive" className="text-sm">Holiday</Badge>
                ) : todayPlanData.is_weekly_off ? (
                  <Badge variant="secondary" className="text-sm">Weekly Off</Badge>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">Select area you're working in today:</div>
                    <div className="flex flex-wrap gap-2">
                      {todayPlanData.areas && Array.isArray(todayPlanData.areas) && (todayPlanData.areas as any[]).map((area: any) => (
                        <Button
                          key={area.id}
                          variant={todayArea === area.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTodayArea(area.id)}
                          className="flex items-center gap-1"
                        >
                          {todayArea === area.id && <Check className="h-3 w-3" />}
                          {area.name}
                        </Button>
                      ))}
                    </div>
                    {todayArea && (
                      <div className="mt-3 p-3 bg-background rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <Check className="h-4 w-4" />
                            Working in: {(todayPlanData.areas as any[])?.find((a: any) => a.id === todayArea)?.name}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/dashboard/daily-working?area=${todayArea}`)}
                            className="flex items-center gap-1"
                          >
                            Go to Daily Working
                            <MapPin className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {todayPlanData.remarks && (
                      <div className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium">Remarks:</span> {todayPlanData.remarks}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No plan set for today. Click on today's date in the calendar below to add your plan.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Header Section */}
        <div className="bg-card rounded-lg p-4 md:p-6 mb-4 md:mb-6 shadow-sm border">
          <div className="text-center mb-3 md:mb-4">
            <div className="text-lg md:text-2xl font-semibold text-foreground mb-1 md:mb-2">
              {format(currentDate, 'MMMM dd, yyyy')}
            </div>
            <div className="text-sm md:text-lg text-muted-foreground">
              Hi {profile?.name || 'User'}
            </div>
          </div>
          
          <div className="text-center mb-4 md:mb-6">
            <h2 className="text-base md:text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4 md:h-5 md:w-5" />
              Tour Plan for {monthNames[selectedMonth - 1]} {selectedYear}
            </h2>
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
            <div>
              <Label className="text-xs md:text-sm">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
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
              <Label className="text-xs md:text-sm">Month</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
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
              onClick={(e) => {
                e.preventDefault();
                console.log('Button clicked - Debug info:', {
                  hasTourPlan: !!tourPlan,
                  tourPlanStatus: tourPlan?.status,
                  canEdit: canEditPlan(tourPlan),
                  hasPending: hasPendingRequest,
                  shouldBeDisabled: !tourPlan || canEditPlan(tourPlan) || hasPendingRequest
                });
                handleRequestEdit();
              }}
              disabled={canEditPlan(tourPlan) || hasPendingRequest}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasPendingRequest ? "Request Pending ⏳" : "Request Edit 📝"}
            </Button>
            {isAdmin && tourPlan && (
              <Button 
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Plan
              </Button>
            )}
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1 border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              Go Back
            </Button>
          </div>

          {/* Status Messages */}
          <div className="space-y-3">
            {/* No Tour Plan Info */}
            {!tourPlan && (
              <div className="bg-blue-50 border-2 border-blue-300 text-blue-800 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <div className="font-semibold">No Tour Plan Yet</div>
                    <div className="text-sm">Click any date to create your tour plan or use "Request Edit" to ask admin to open editing</div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Window Active */}
            {tourPlan && canEditPlan(tourPlan) && tourPlan.edit_until && (
              <div className="bg-blue-100 border-2 border-blue-400 text-blue-900 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✏️</span>
                  <div>
                    <div className="font-semibold">Edit Window Active</div>
                    <div className="text-sm">You can edit until {new Date(tourPlan.edit_until).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Request Pending */}
            {lastRequest?.status === 'pending' && (
              <div className="bg-orange-100 border-2 border-orange-400 text-orange-900 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏳</span>
                  <div>
                    <div className="font-semibold">Request Pending</div>
                    <div className="text-sm">Sent at {new Date(lastRequest.requested_at).toLocaleString()}</div>
                    <div className="text-sm">Your edit request is awaiting admin approval</div>
                  </div>
                </div>
              </div>
            )}

            {/* Request Approved */}
            {lastRequest?.status === 'approved' && (
              <div className="bg-green-100 border-2 border-green-400 text-green-900 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <div>
                    <div className="font-semibold">Request Accepted</div>
                    {tourPlan?.edit_until && (
                      <div className="text-sm">Edit window active until {new Date(tourPlan.edit_until).toLocaleString()}</div>
                    )}
                    {lastRequest.admin_response_at && (
                      <div className="text-sm">Approved at {new Date(lastRequest.admin_response_at).toLocaleString()}</div>
                    )}
                    {lastRequest.admin_remarks && (
                      <div className="text-sm mt-1 italic">Admin: "{lastRequest.admin_remarks}"</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Request Rejected */}
            {lastRequest?.status === 'rejected' && (
              <div className="bg-red-100 border-2 border-red-400 text-red-900 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">❌</span>
                  <div>
                    <div className="font-semibold">Request Rejected</div>
                    {lastRequest.admin_response_at && (
                      <div className="text-sm">Responded at {new Date(lastRequest.admin_response_at).toLocaleString()}</div>
                    )}
                    {lastRequest.admin_remarks && (
                      <div className="text-sm mt-1 italic">Admin: "{lastRequest.admin_remarks}"</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Approved Status */}
            {tourPlan?.status === 'approved' && !canEditPlan(tourPlan) && !hasPendingRequest && (
              <div className="bg-green-100 border-2 border-green-400 text-green-900 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✓</span>
                  <div>
                    <div className="font-semibold">Tour Plan Approved</div>
                    <div className="text-sm">Your tour plan has been approved by admin</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Locked Status */}
            {tourPlan?.status === 'locked' && !canEditPlan(tourPlan) && !hasPendingRequest && (
              <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-900 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔒</span>
                  <div>
                    <div className="font-semibold">Tour Plan Locked</div>
                    <div className="text-sm">Request edit permission to make changes</div>
                  </div>
                </div>
              </div>
            )}

            {/* Draft Status - First Day */}
            {tourPlan?.status === 'draft' && planDays.length === 0 && (
              <div className="bg-blue-100 border-2 border-blue-400 text-blue-900 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  <div>
                    <div className="font-semibold">Start Your Tour Plan</div>
                    <div className="text-sm">Click on any date to begin planning. The plan will lock after you save the first day.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3">
        {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map(date => {
            const dayData = planDays.find(d => d.date === date);
            const dayName = getDayName(date);
            
            return (
              <div
                key={date}
                onClick={() => handleDateClick(date)}
                className="bg-card border rounded-lg p-2 md:p-3 cursor-pointer hover:shadow-md transition-shadow min-h-[100px] md:min-h-[120px]"
              >
                <div className="font-semibold text-xs md:text-sm mb-1 md:mb-2">
                  {String(date).padStart(2, '0')} {dayName}
                </div>
                {dayData?.is_weekly_off ? (
                  <div className="text-purple-600 text-xs font-medium">Weekly Off</div>
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="weeklyOff"
                checked={isWeeklyOff}
                onChange={(e) => setIsWeeklyOff(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="weeklyOff">Mark as Weekly Off</Label>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tour Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tour plan for {monthNames[selectedMonth - 1]} {selectedYear}? 
              This will permanently delete all planned days and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTourPlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MonthlyTourPlan;