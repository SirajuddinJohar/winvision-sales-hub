import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Filter, Calendar, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  area: string;
}

interface Pharmacy {
  id: string;
  name: string;
  address: string;
}

interface ReportEntry {
  id: string;
  order_date: string;
  quantity: number;
  total_amount: number;
  product: {
    name: string;
    category: string;
  };
  doctor: {
    name: string;
    specialty: string;
  };
  pharmacy: {
    name: string;
  };
}

const Reporting = () => {
  const { profile } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
   const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
   const [selectedPharmacy, setSelectedPharmacy] = useState<string>('all');
  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

   useEffect(() => {
     if (selectedDoctor !== 'all' || selectedPharmacy !== 'all') {
       fetchReportEntries();
     } else {
       setReportEntries([]);
     }
   }, [selectedDoctor, selectedPharmacy]);

  const fetchInitialData = async () => {
    try {
      const [doctorsResponse, pharmaciesResponse] = await Promise.all([
        supabase.from('doctors').select('id, name, specialty, area').order('name'),
        supabase.from('Distributors').select('id, name, address').order('name')
      ]);

      if (doctorsResponse.error) throw doctorsResponse.error;
      if (pharmaciesResponse.error) throw pharmaciesResponse.error;

      setDoctors(doctorsResponse.data || []);
      setPharmacies(pharmaciesResponse.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportEntries = async () => {
    setEntriesLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_date,
          quantity,
          total_amount,
          products:product_id (
            name,
            category
          ),
          doctors:doctor_id (
            name,
            specialty
          ),
          pharmacies:pharmacy_id (
            name
          )
        `)
        .order('order_date', { ascending: false });

       if (selectedDoctor && selectedDoctor !== 'all') {
         query = query.eq('doctor_id', selectedDoctor);
       }
       if (selectedPharmacy && selectedPharmacy !== 'all') {
         query = query.eq('pharmacy_id', selectedPharmacy);
       }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      const transformedEntries = (data || []).map(entry => ({
        ...entry,
        product: entry.products,
        doctor: entry.doctors,
        pharmacy: entry.pharmacies
      }));
      setReportEntries(transformedEntries);
    } catch (error) {
      console.error('Error fetching report entries:', error);
    } finally {
      setEntriesLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getTotalAmount = () => {
    return reportEntries.reduce((sum, entry) => sum + entry.total_amount, 0);
  };

  const getTotalQuantity = () => {
    return reportEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  };

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-6 md:h-8 w-24 md:w-32 mb-2" />
            <Skeleton className="h-4 md:h-5 w-48 md:w-64" />
          </div>
        </div>
        <div className="grid gap-2.5 md:gap-4">
          <Skeleton className="h-28 md:h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Reporting" 
        description="Generate reports based on doctors and pharmacies"
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">

      {/* Filters */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Filter className="h-4 w-4 md:h-5 md:w-5" />
            Report Filters
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Select a doctor or pharmacy to view related entries
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4">
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-xs md:text-sm font-medium">Select Doctor</label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue placeholder="Choose a doctor..." />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Doctors</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <label className="text-xs md:text-sm font-medium">Select Pharmacy</label>
              <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue placeholder="Choose a pharmacy..." />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Pharmacies</SelectItem>
                  {pharmacies.map((pharmacy) => (
                    <SelectItem key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(selectedDoctor !== 'all' || selectedPharmacy !== 'all') && (
            <div className="mt-3 md:mt-4 flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 md:h-9 text-xs md:text-sm"
                 onClick={() => {
                   setSelectedDoctor('all');
                   setSelectedPharmacy('all');
                 }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {reportEntries.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-lg md:text-2xl font-bold">{reportEntries.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Qty</p>
                  <p className="text-lg md:text-2xl font-bold">{getTotalQuantity()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-base md:text-2xl font-bold">{formatCurrency(getTotalAmount())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Entries */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
          <CardTitle className="text-base md:text-lg">Report Entries</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {selectedDoctor && selectedPharmacy
              ? `Showing orders for selected doctor and pharmacy`
              : selectedDoctor
              ? `Showing orders for ${doctors.find(d => d.id === selectedDoctor)?.name}`
              : selectedPharmacy
              ? `Showing orders for ${pharmacies.find(p => p.id === selectedPharmacy)?.name}`
              : 'Select a doctor or pharmacy to view report entries'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          {entriesLoading ? (
            <div className="space-y-2.5 md:space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 md:h-24 w-full" />
              ))}
            </div>
          ) : reportEntries.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <FileText className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
               <p className="text-xs md:text-sm text-muted-foreground">
                 {selectedDoctor !== 'all' || selectedPharmacy !== 'all'
                   ? 'No entries found for the selected filters'
                   : 'Select a doctor or pharmacy to generate a report'}
               </p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-4">
              {reportEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-3 md:p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <div>
                      <h4 className="font-medium text-sm md:text-base">{entry.product?.name}</h4>
                      <p className="text-xs md:text-sm text-muted-foreground">{entry.product?.category}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs md:text-sm">
                      {formatCurrency(entry.total_amount)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
                    <div>
                      <p className="font-medium text-xs">Doctor</p>
                      <p className="text-muted-foreground text-xs md:text-sm">
                        {entry.doctor?.name} - {entry.doctor?.specialty}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-xs">Pharmacy</p>
                      <p className="text-muted-foreground text-xs md:text-sm">{entry.pharmacy?.name}</p>
                    </div>
                    <div>
                      <p className="font-medium text-xs">Order Details</p>
                      <p className="text-muted-foreground text-xs md:text-sm">
                        Qty: {entry.quantity} | {new Date(entry.order_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Reporting;
