import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SampleEntry from '@/components/daily-working/SampleEntry';
import OrderEntry from '@/components/daily-working/OrderEntry';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  area: string;
}

const DoctorsListScreen = ({ onDoctorSelect }: { onDoctorSelect: (doctor: Doctor) => void }) => {
  const { user, profile } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctors();
  }, [user, profile]);

  useEffect(() => {
    const filtered = doctors.filter(doctor =>
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.area.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDoctors(filtered);
  }, [doctors, searchTerm]);

  const fetchDoctors = async () => {
    if (!user || !profile) return;

    try {
      let query = supabase
        .from('doctors')
        .select('id, name, specialty, area');

      // MRs see only their assigned doctors, Admins see all doctors
      if (profile.role === 'mr') {
        query = query.eq('assigned_mr_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-16 bg-muted rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search doctors by name, specialty, or area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filteredDoctors.map((doctor) => (
          <Card
            key={doctor.id}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onDoctorSelect(doctor)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-light">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{doctor.name}</h3>
                  <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                  <p className="text-xs text-muted-foreground">{doctor.area}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>

      {filteredDoctors.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No doctors found.</p>
        </Card>
      )}
    </div>
  );
};

interface SampleItem {
  product_id: string;
  product_name: string;
  current_stock: number;
  qty_given: number;
}

const DailyWorking = () => {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [currentStep, setCurrentStep] = useState<'doctors' | 'samples' | 'orders'>('doctors');
  const [sampleData, setSampleData] = useState<SampleItem[]>([]);
  const { toast } = useToast();

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setCurrentStep('samples');
  };

  const handleBackToList = () => {
    setSelectedDoctor(null);
    setSampleData([]);
    setCurrentStep('doctors');
  };

  const handleSamplesComplete = (samples: SampleItem[]) => {
    setSampleData(samples);
    setCurrentStep('orders');
  };

  const handleOrdersComplete = () => {
    toast({
      title: "Daily working recorded",
      description: "Successfully saved daily working record",
    });
    // Reset to doctors list
    setSelectedDoctor(null);
    setSampleData([]);
    setCurrentStep('doctors');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Working</h1>
          <p className="text-muted-foreground">
            {currentStep === 'doctors' && 'Select a doctor to begin'}
            {currentStep === 'samples' && `Sample Entry - ${selectedDoctor?.name}`}
            {currentStep === 'orders' && `Order Entry - ${selectedDoctor?.name}`}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {currentStep === 'doctors' && (
        <DoctorsListScreen onDoctorSelect={handleDoctorSelect} />
      )}

      {currentStep === 'samples' && selectedDoctor && (
        <SampleEntry
          doctorName={selectedDoctor.name}
          onNext={handleSamplesComplete}
          onBack={handleBackToList}
        />
      )}

      {currentStep === 'orders' && selectedDoctor && (
        <OrderEntry
          doctorId={selectedDoctor.id}
          doctorName={selectedDoctor.name}
          sampleData={sampleData}
          onComplete={handleOrdersComplete}
          onBack={() => setCurrentStep('samples')}
        />
      )}
    </div>
  );
};

export default DailyWorking;