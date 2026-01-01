import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Stethoscope, Store, Check, MapPin, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SampleEntry from '@/components/daily-working/SampleEntry';
import OrderEntry from '@/components/daily-working/OrderEntry';
import PageHeader from '@/components/layout/PageHeader';
import { getCurrentLocation, calculateDistance } from '@/lib/geolocation';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

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

const DailyWorking = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedAreaId = searchParams.get('area');
  
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
  const [todayAreaName, setTodayAreaName] = useState<string | null>(null);
  const [todayPlanDoctorIds, setTodayPlanDoctorIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserLocation();
  }, []);

  useEffect(() => {
    fetchTargetsAndCalls();
  }, [user, profile, userLocation, selectedAreaId]);

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

  const fetchTargetsAndCalls = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const todayDate = new Date().getDate();
      const todayMonth = new Date().getMonth() + 1;
      const todayYear = new Date().getFullYear();

      // Fetch today's tour plan to get planned doctors for selected area
      let plannedDoctorIds: string[] = [];
      let areaName: string | null = null;
      
      if (selectedAreaId) {
        // Get tour plan for today
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
            .select('areas')
            .eq('tour_plan_id', planData.id)
            .eq('date', todayDate)
            .maybeSingle();
          
          if (dayData?.areas && Array.isArray(dayData.areas)) {
            const selectedArea = (dayData.areas as any[]).find((a: any) => a.id === selectedAreaId);
            areaName = selectedArea?.name || null;
          }
        }
        
        // Fetch doctors assigned to this area from area_doctor_visits
        const { data: areaDoctors } = await supabase
          .from('area_doctor_visits')
          .select('doctor_id')
          .eq('area_id', selectedAreaId)
          .eq('created_by', user.id);
        
        if (areaDoctors) {
          plannedDoctorIds = areaDoctors.map(ad => ad.doctor_id);
        }
      }
      
      setTodayAreaName(areaName);
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

          // Check if this doctor is in today's plan
          const isTodayPlan = plannedDoctorIds.length === 0 || plannedDoctorIds.includes(doc.id);

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

  if (loading) {
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
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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

  // List View
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Daily Working" description="Track your daily doctor and pharmacy calls" />
      <div className="p-4 md:p-6 space-y-6">

      {/* Today's Area Banner */}
      {todayAreaName && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-medium">Today's Area:</span>
            <Badge variant="default">{todayAreaName}</Badge>
            <span className="text-sm text-muted-foreground ml-2">
              ({todayPlanDoctorIds.length} doctors assigned)
            </span>
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