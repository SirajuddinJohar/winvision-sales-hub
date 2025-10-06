import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Stethoscope, Store, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SampleEntry from '@/components/daily-working/SampleEntry';
import OrderEntry from '@/components/daily-working/OrderEntry';
import PageHeader from '@/components/layout/PageHeader';

interface CallTarget {
  id: string;
  name: string;
  type: 'doctor' | 'pharmacy';
  details: string; // specialty for doctor, address for pharmacy
  area?: string;
  isComplete: boolean;
}

interface CallStats {
  total: number;
  doctors: number;
  pharmacies: number;
}

const DailyWorking = () => {
  const { user, profile } = useAuth();
  const [targets, setTargets] = useState<CallTarget[]>([]);
  const [filteredTargets, setFilteredTargets] = useState<CallTarget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CallStats>({ total: 0, doctors: 0, pharmacies: 0 });
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [currentView, setCurrentView] = useState<'list' | 'sample' | 'order'>('list');
  const [selectedTarget, setSelectedTarget] = useState<CallTarget | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchTargetsAndCalls();
  }, [user, profile]);

  useEffect(() => {
    const filtered = targets.filter(target => {
      const matchesSearch = target.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        target.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (target.area && target.area.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTab = activeTab === 'completed' ? target.isComplete : !target.isComplete;
      
      return matchesSearch && matchesTab;
    });
    setFilteredTargets(filtered);
  }, [targets, searchTerm, activeTab]);

  const fetchTargetsAndCalls = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch doctors
      let doctorsQuery = supabase
        .from('doctors')
        .select('id, name, specialty, area');
      
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
        ...(doctorsRes.data || []).map(doc => ({
          id: doc.id,
          name: doc.name,
          type: 'doctor' as const,
          details: doc.specialty,
          area: doc.area,
          isComplete: callsMap.get(doc.id) || false
        })),
        ...(pharmaciesRes.data || []).map(pharm => ({
          id: pharm.id,
          name: pharm.name,
          type: 'pharmacy' as const,
          details: pharm.address,
          area: pharm.city,
          isComplete: callsMap.get(pharm.id) || false
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
    // For doctors, go to sample/order flow
    if (target.type === 'doctor') {
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'completed')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {filteredTargets.map((target) => (
            <Card 
              key={target.id} 
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleTargetClick(target)}
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground hover:text-primary">{target.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                        {target.type === 'doctor' ? '🩺 Doctor' : '🏪 Pharmacy'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{target.details}</p>
                    {target.area && <p className="text-xs text-muted-foreground">{target.area}</p>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
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