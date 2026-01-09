import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Stethoscope, Store, Check, MapPin, AlertTriangle, Calendar, Users, Briefcase, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SampleEntry from '@/components/daily-working/SampleEntry';
import OrderEntry from '@/components/daily-working/OrderEntry';
import PageHeader from '@/components/layout/PageHeader';
import { getCurrentLocation, calculateDistance } from '@/lib/geolocation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface CallTarget {
  id: string;
  name: string;
  type: 'doctor' | 'pharmacy';
  details: string; // specialty for doctor, address for pharmacy
  area?: string;
  isComplete: boolean;
  location?: { latitude: number; longitude: number };
  phone?: string;
  distanceFromUser?: number; // in meters
  hasLocation?: boolean;
  isTodayPlan?: boolean; // Flag for today's planned calls
}

interface CallStats {
  total: number;
  doctors: number;
  pharmacies: number;
}

interface Area {
  id: string;
  area_name: string;
  from_location: string;
  to_location: string;
  distance: number;
}

interface DailyWorkingSetup {
  id: string;
  mr_id: string;
  work_date: string;
  work_type: 'leave' | 'holiday' | 'on_field';
  working_with: 'individual' | 'manager' | null;
  selected_areas: string[];
}

const DailyWorking = () => {
  const { user, profile } = useAuth();
  
  const [targets, setTargets] = useState<CallTarget[]>([]);
  const [filteredTargets, setFilteredTargets] = useState<CallTarget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CallStats>({ total: 0, doctors: 0, pharmacies: 0 });
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('pending');
  const [currentView, setCurrentView] = useState<'list' | 'sample' | 'order'>('list');
  const [selectedTarget, setSelectedTarget] = useState<CallTarget | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [todayPlanDoctorIds, setTodayPlanDoctorIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Setup state
  const [todaySetup, setTodaySetup] = useState<DailyWorkingSetup | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isEditingSetup, setIsEditingSetup] = useState(false);
  const [workType, setWorkType] = useState<'leave' | 'holiday' | 'on_field' | null>(null);
  const [workingWith, setWorkingWith] = useState<'individual' | 'manager' | null>(null);
  const [selectedWorkAreas, setSelectedWorkAreas] = useState<string[]>([]);
  const [userAreas, setUserAreas] = useState<Area[]>([]);
  const [savingSetup, setSavingSetup] = useState(false);

  useEffect(() => {
    fetchUserLocation();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTodaySetup();
      fetchUserAreas();
    }
  }, [user]);

  useEffect(() => {
    if (setupComplete && todaySetup?.work_type === 'on_field') {
      fetchTargetsAndCalls();
    }
  }, [user, profile, userLocation, setupComplete, todaySetup]);

  useEffect(() => {
    const filtered = targets.filter(target => {
      const matchesSearch = target.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        target.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (target.area && target.area.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesTab = true;
      if (activeTab === 'completed') {
        matchesTab = target.isComplete;
      } else if (activeTab === 'pending') {
        // In pending tab, show only today's planned calls that are not complete
        matchesTab = !target.isComplete && target.isTodayPlan === true;
      }
      // 'all' tab shows everything
      
      return matchesSearch && matchesTab;
    });
    setFilteredTargets(filtered);
  }, [targets, searchTerm, activeTab]);

  const fetchUserLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      setUserLocation({
        latitude: location.latitude,
        longitude: location.longitude
      });
    }
  };

  const fetchTodaySetup = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_working_setup')
        .select('*')
        .eq('mr_id', user.id)
        .eq('work_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const setupData: DailyWorkingSetup = {
          id: data.id,
          mr_id: data.mr_id,
          work_date: data.work_date,
          work_type: data.work_type as 'leave' | 'holiday' | 'on_field',
          working_with: data.working_with as 'individual' | 'manager' | null,
          selected_areas: (data.selected_areas as string[]) || []
        };
        setTodaySetup(setupData);
        setWorkType(setupData.work_type);
        setWorkingWith(setupData.working_with);
        setSelectedWorkAreas(setupData.selected_areas);
        setSetupComplete(true);
      }
    } catch (error) {
      console.error('Error fetching today setup:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAreas = async () => {
    if (!user) return;

    try {
      // First get unique area IDs where user has assigned doctors
      const { data: areaAssignments, error: assignError } = await supabase
        .from('area_doctor_visits')
        .select('area_id')
        .eq('created_by', user.id);

      if (assignError) throw assignError;

      // Get unique area IDs
      const uniqueAreaIds = [...new Set(areaAssignments?.map(a => a.area_id) || [])];

      if (uniqueAreaIds.length > 0) {
        // Fetch the area details
        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('id, area_name, from_location, to_location, distance')
          .in('id', uniqueAreaIds)
          .order('area_name');

        if (areasError) throw areasError;
        setUserAreas(areasData || []);
      } else {
        setUserAreas([]);
      }
    } catch (error) {
      console.error('Error fetching user areas:', error);
    }
  };

  const handleSetupSubmit = async () => {
    if (!user || !workType) return;

    if (workType === 'on_field' && selectedWorkAreas.length === 0) {
      toast({
        title: "Select Areas",
        description: "Please select at least one working area",
        variant: "destructive"
      });
      return;
    }

    if (workType === 'on_field' && !workingWith) {
      toast({
        title: "Select Working With",
        description: "Please select whether you're working individually or with manager",
        variant: "destructive"
      });
      return;
    }

    setSavingSetup(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const setupData = {
        mr_id: user.id,
        work_date: today,
        work_type: workType,
        working_with: workType === 'on_field' ? workingWith : null,
        selected_areas: workType === 'on_field' ? selectedWorkAreas : []
      };

      const { data, error } = await supabase
        .from('daily_working_setup')
        .upsert(setupData, {
          onConflict: 'mr_id,work_date'
        })
        .select()
        .single();

      if (error) throw error;

      const savedSetup: DailyWorkingSetup = {
        id: data.id,
        mr_id: data.mr_id,
        work_date: data.work_date,
        work_type: data.work_type as 'leave' | 'holiday' | 'on_field',
        working_with: data.working_with as 'individual' | 'manager' | null,
        selected_areas: (data.selected_areas as string[]) || []
      };
      setTodaySetup(savedSetup);
      setSetupComplete(true);
      setIsEditingSetup(false);

      toast({
        title: "Setup Saved",
        description: workType === 'on_field' 
          ? `You are working on field in ${selectedWorkAreas.length} area(s) today`
          : `You are on ${workType === 'leave' ? 'Leave' : 'Holiday'} today`
      });

    } catch (error) {
      console.error('Error saving setup:', error);
      toast({
        title: "Error",
        description: "Failed to save today's setup",
        variant: "destructive"
      });
    } finally {
      setSavingSetup(false);
    }
  };

  const handleEditSetup = () => {
    setIsEditingSetup(true);
  };

  const handleCancelEdit = () => {
    if (todaySetup) {
      setWorkType(todaySetup.work_type);
      setWorkingWith(todaySetup.working_with);
      setSelectedWorkAreas(todaySetup.selected_areas);
    }
    setIsEditingSetup(false);
  };

  const toggleAreaSelection = (areaId: string) => {
    setSelectedWorkAreas(prev => 
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const fetchTargetsAndCalls = async () => {
    if (!user || !profile || !todaySetup) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch doctors from selected areas via area_doctor_visits
      let plannedDoctorIds: string[] = [];
      
      if (todaySetup.selected_areas.length > 0) {
        const { data: areaDoctors } = await supabase
          .from('area_doctor_visits')
          .select('doctor_id')
          .in('area_id', todaySetup.selected_areas)
          .eq('created_by', user.id);
        
        if (areaDoctors) {
          plannedDoctorIds = [...new Set(areaDoctors.map(ad => ad.doctor_id))];
        }
      }
      
      setTodayPlanDoctorIds(plannedDoctorIds);

      // Fetch doctors
      let doctorsQuery = supabase
        .from('doctors')
        .select('id, name, specialty, area, location, phone');
      
      if (profile.role === 'mr') {
        doctorsQuery = doctorsQuery.eq('assigned_mr_id', user.id);
      }

      // Fetch pharmacies
      const pharmaciesQuery = supabase
        .from('pharmacies')
        .select('id, name, address, city');

      // Fetch today's calls
      const callsQuery = supabase
        .from('daily_calls')
        .select('*')
        .eq('mr_id', user.id)
        .eq('date', today);

      const [doctorsRes, pharmaciesRes, callsRes] = await Promise.all([
        doctorsQuery,
        pharmaciesQuery,
        callsQuery
      ]);

      if (doctorsRes.error) throw doctorsRes.error;
      if (pharmaciesRes.error) throw pharmaciesRes.error;
      if (callsRes.error) throw callsRes.error;

      const callsMap = new Map(
        (callsRes.data || []).map(call => [call.target_id, call.status === 'complete'])
      );

      // Combine doctors and pharmacies
      const combinedTargets: CallTarget[] = [
        ...(doctorsRes.data || []).map(doc => {
          const location = doc.location as { latitude: number; longitude: number } | null;
          const hasLocation = location && location.latitude && location.longitude;
          let distanceFromUser: number | undefined;
          
          if (hasLocation && userLocation) {
            distanceFromUser = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              location.latitude,
              location.longitude
            ) * 1000; // Convert km to meters
          }

          // Check if this doctor is in today's selected areas
          const isTodayPlan = plannedDoctorIds.includes(doc.id);

          return {
            id: doc.id,
            name: doc.name,
            type: 'doctor' as const,
            details: doc.specialty,
            area: doc.area,
            isComplete: callsMap.get(doc.id) || false,
            location: location || undefined,
            phone: doc.phone || undefined,
            hasLocation: !!hasLocation,
            distanceFromUser,
            isTodayPlan
          };
        }),
        ...(pharmaciesRes.data || []).map(pharm => ({
          id: pharm.id,
          name: pharm.name,
          type: 'pharmacy' as const,
          details: pharm.address,
          area: pharm.city,
          isComplete: callsMap.get(pharm.id) || false,
          isTodayPlan: false // Pharmacies are shown in 'all' tab
        }))
      ];

      setTargets(combinedTargets);

      // Calculate stats
      const completedCalls = callsRes.data || [];
      setStats({
        total: completedCalls.length,
        doctors: completedCalls.filter(c => c.target_type === 'doctor').length,
        pharmacies: completedCalls.filter(c => c.target_type === 'pharmacy').length
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load daily working data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTargetClick = async (target: CallTarget) => {
    // Check distance for doctors
    if (target.type === 'doctor') {
      if (!target.hasLocation) {
        toast({
          title: "Location Required",
          description: "This doctor's location is not set. Please update the doctor profile with location.",
          variant: "destructive"
        });
        return;
      }

      if (target.distanceFromUser !== undefined && target.distanceFromUser > 200) {
        toast({
          title: "Too Far Away",
          description: `You are ${Math.round(target.distanceFromUser)}m away. You must be within 200m to make this call.`,
          variant: "destructive"
        });
        return;
      }

      setSelectedTarget(target);
      setCurrentView('sample');
    }
    // For pharmacies, mark complete directly
    else if (target.type === 'pharmacy') {
      if (!user) return;

      try {
        const today = new Date().toISOString().split('T')[0];

        const { error } = await supabase
          .from('daily_calls')
          .upsert({
            mr_id: user.id,
            target_id: target.id,
            target_type: target.type,
            date: today,
            status: 'complete'
          }, {
            onConflict: 'mr_id,target_id,date'
          });

        if (error) throw error;

        toast({
          title: "Call marked complete",
          description: `${target.name} has been marked as completed`
        });

        await fetchTargetsAndCalls();

      } catch (error) {
        console.error('Error marking call complete:', error);
        toast({
          title: "Error",
          description: "Failed to mark call as complete",
          variant: "destructive"
        });
      }
    }
  };

  const handleSampleNext = (samples: any[]) => {
    setSampleData(samples);
    setCurrentView('order');
  };

  const handleOrderComplete = async () => {
    if (!user || !selectedTarget) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Upsert the call record
      const { error } = await supabase
        .from('daily_calls')
        .upsert({
          mr_id: user.id,
          target_id: selectedTarget.id,
          target_type: selectedTarget.type,
          date: today,
          status: 'complete'
        }, {
          onConflict: 'mr_id,target_id,date'
        });

      if (error) throw error;

      toast({
        title: "Call marked complete",
        description: `${selectedTarget.name} has been marked as completed`
      });

      // Reset to list view and refresh data
      setCurrentView('list');
      setSelectedTarget(null);
      setSampleData([]);
      await fetchTargetsAndCalls();

    } catch (error) {
      console.error('Error marking call complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark call as complete",
        variant: "destructive"
      });
    }
  };

  const handleBack = () => {
    if (currentView === 'order') {
      setCurrentView('sample');
    } else if (currentView === 'sample') {
      setCurrentView('list');
      setSelectedTarget(null);
      setSampleData([]);
    }
  };

  const getSelectedAreaNames = () => {
    return userAreas
      .filter(area => selectedWorkAreas.includes(area.id))
      .map(area => area.area_name);
  };

  // Loading state
  if (loading && !setupComplete) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-16 bg-muted rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Sample Entry View
  if (currentView === 'sample' && selectedTarget && selectedTarget.type === 'doctor') {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Sample Entry" description={`Record samples for ${selectedTarget.name}`} />
        <div className="p-4 md:p-6">
        <SampleEntry
            doctorName={selectedTarget.name}
            onNext={handleSampleNext}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  // Order Entry View
  if (currentView === 'order' && selectedTarget && selectedTarget.type === 'doctor') {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Order Entry" description={`Record orders for ${selectedTarget.name}`} />
        <div className="p-4 md:p-6">
          <OrderEntry
            doctorId={selectedTarget.id}
            doctorName={selectedTarget.name}
            sampleData={sampleData}
            onComplete={handleOrderComplete}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  // Setup Block - Show when setup is not complete OR when editing
  const showSetupBlock = !setupComplete || isEditingSetup;

  // Leave/Holiday View
  if (setupComplete && !isEditingSetup && todaySetup && (todaySetup.work_type === 'leave' || todaySetup.work_type === 'holiday')) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Daily Working" description="Track your daily doctor and pharmacy calls" />
        <div className="p-4 md:p-6 space-y-6">
          <Card className="p-6 text-center border-primary/20 bg-primary/5">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">
                You are on {todaySetup.work_type === 'leave' ? 'Leave' : 'Holiday'} Today
              </h2>
              <p className="text-muted-foreground">
                Enjoy your {todaySetup.work_type === 'leave' ? 'day off' : 'holiday'}! 
                If this is incorrect, you can edit your setup.
              </p>
              <Button variant="outline" onClick={handleEditSetup}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Today's Setup
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Setup Form
  if (showSetupBlock) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Daily Working" description="Configure your working preferences for today" />
        <div className="p-4 md:p-6 space-y-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Today's Working Setup</h2>
                {isEditingSetup && (
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>

              {/* Work Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Working Type</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={workType === 'leave' ? 'default' : 'outline'}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setWorkType('leave')}
                  >
                    <Calendar className="h-5 w-5" />
                    <span>Leave</span>
                  </Button>
                  <Button
                    type="button"
                    variant={workType === 'holiday' ? 'default' : 'outline'}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setWorkType('holiday')}
                  >
                    <Calendar className="h-5 w-5" />
                    <span>Holiday</span>
                  </Button>
                  <Button
                    type="button"
                    variant={workType === 'on_field' ? 'default' : 'outline'}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setWorkType('on_field')}
                  >
                    <Briefcase className="h-5 w-5" />
                    <span>On Field</span>
                  </Button>
                </div>
              </div>

              {/* On Field Options */}
              {workType === 'on_field' && (
                <>
                  {/* Area Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Working Areas</Label>
                    {userAreas.length === 0 ? (
                      <Card className="p-4 bg-muted/50">
                        <p className="text-sm text-muted-foreground text-center">
                          No areas found. Please create areas in the Working Areas page first.
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                        {userAreas.map(area => (
                          <div
                            key={area.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedWorkAreas.includes(area.id)
                                ? 'bg-primary/10 border border-primary/30'
                                : 'bg-muted/30 hover:bg-muted/50'
                            }`}
                            onClick={() => toggleAreaSelection(area.id)}
                          >
                            <Checkbox
                              checked={selectedWorkAreas.includes(area.id)}
                              onCheckedChange={() => toggleAreaSelection(area.id)}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{area.area_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {area.from_location} → {area.to_location} • {area.distance} km
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedWorkAreas.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkAreas.length} area(s) selected
                      </p>
                    )}
                  </div>

                  {/* Working With Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Working With</Label>
                    <RadioGroup
                      value={workingWith || ''}
                      onValueChange={(value) => setWorkingWith(value as 'individual' | 'manager')}
                      className="grid grid-cols-2 gap-3"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`flex-1 flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            workingWith === 'individual'
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setWorkingWith('individual')}
                        >
                          <RadioGroupItem value="individual" id="individual" />
                          <Label htmlFor="individual" className="cursor-pointer flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Individual
                          </Label>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`flex-1 flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            workingWith === 'manager'
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setWorkingWith('manager')}
                        >
                          <RadioGroupItem value="manager" id="manager" />
                          <Label htmlFor="manager" className="cursor-pointer flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            With Manager
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSetupSubmit}
                disabled={!workType || savingSetup}
                className="w-full"
              >
                {savingSetup ? 'Saving...' : isEditingSetup ? 'Update Setup' : 'Start Working'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Main List View (On Field)
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Daily Working" description="Track your daily doctor and pharmacy calls" />
      <div className="p-4 md:p-6 space-y-6">

      {/* Today's Setup Summary Banner */}
      {todaySetup && todaySetup.work_type === 'on_field' && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="font-medium">Today's Areas:</span>
              <div className="flex flex-wrap gap-1">
                {getSelectedAreaNames().map((name, idx) => (
                  <Badge key={idx} variant="default">{name}</Badge>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                • {todayPlanDoctorIds.length} doctors • Working {workingWith === 'manager' ? 'with Manager' : 'Individually'}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleEditSetup}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Call Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Calls Today</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{stats.doctors}</p>
            <p className="text-sm text-muted-foreground">Doctor Calls</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{stats.pharmacies}</p>
            <p className="text-sm text-muted-foreground">Pharmacy Calls</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, specialty, address, or area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs - 3 columns: All, Pending, Completed */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'pending' | 'completed')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">
            Pending {todayPlanDoctorIds.length > 0 ? `(${targets.filter(t => t.isTodayPlan && !t.isComplete).length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        {/* All Tab - Shows all doctors and pharmacies */}
        <TabsContent value="all" className="space-y-3 mt-4">
          {filteredTargets.map((target) => {
            const isTooFar = target.type === 'doctor' && target.distanceFromUser !== undefined && target.distanceFromUser > 200;
            const needsLocation = target.type === 'doctor' && !target.hasLocation;
            const isDisabled = needsLocation || isTooFar || target.isComplete;

            return (
              <Card 
                key={target.id} 
                className={`p-4 transition-colors ${
                  target.isComplete ? 'bg-muted/30' :
                  isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-accent/50'
                }`}
                onClick={() => !isDisabled && handleTargetClick(target)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${target.type === 'doctor' ? 'bg-blue-100' : 'bg-green-100'}`}>
                      {target.type === 'doctor' ? (
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Store className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{target.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {target.type === 'doctor' ? '🩺 Doctor' : '🏪 Pharmacy'}
                        </span>
                        {target.isTodayPlan && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Today's Plan
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{target.details}</p>
                      {target.area && <p className="text-xs text-muted-foreground">{target.area}</p>}
                    </div>
                  </div>
                  {target.isComplete && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          {filteredTargets.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No targets found.</p>
            </Card>
          )}
        </TabsContent>

        {/* Pending Tab - Shows today's planned calls only */}
        <TabsContent value="pending" className="space-y-3 mt-4">
          {filteredTargets.map((target) => {
            const isTooFar = target.type === 'doctor' && target.distanceFromUser !== undefined && target.distanceFromUser > 200;
            const needsLocation = target.type === 'doctor' && !target.hasLocation;
            const isDisabled = needsLocation || isTooFar;

            return (
              <Card 
                key={target.id} 
                className={`p-4 transition-colors ${
                  isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-accent/50'
                }`}
                onClick={() => !isDisabled && handleTargetClick(target)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${target.type === 'doctor' ? 'bg-blue-100' : 'bg-green-100'}`}>
                      {target.type === 'doctor' ? (
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Store className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground hover:text-primary">{target.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {target.type === 'doctor' ? '🩺 Doctor' : '🏪 Pharmacy'}
                        </span>
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          Today's Plan
                        </Badge>
                        {target.type === 'doctor' && target.distanceFromUser !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            target.distanceFromUser <= 200 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            <MapPin className="h-3 w-3" />
                            {Math.round(target.distanceFromUser)}m
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{target.details}</p>
                      {target.area && <p className="text-xs text-muted-foreground">{target.area}</p>}
                      {target.phone && <p className="text-xs text-muted-foreground">📱 {target.phone}</p>}
                      
                      {needsLocation && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Location not set - update required</span>
                        </div>
                      )}
                      {isTooFar && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Too far away - must be within 200m</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {filteredTargets.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No pending calls found.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {filteredTargets.map((target) => (
            <Card key={target.id} className="p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${target.type === 'doctor' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {target.type === 'doctor' ? (
                      <Stethoscope className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Store className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{target.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                        {target.type === 'doctor' ? '🩺 Doctor' : '🏪 Pharmacy'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{target.details}</p>
                    {target.area && <p className="text-xs text-muted-foreground">{target.area}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filteredTargets.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No completed calls yet today.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
};

export default DailyWorking;
