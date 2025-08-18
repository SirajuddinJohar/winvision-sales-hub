import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Filter, Calendar, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('');
  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedDoctor || selectedPharmacy) {
      fetchReportEntries();
    } else {
      setReportEntries([]);
    }
  }, [selectedDoctor, selectedPharmacy]);

  const fetchInitialData = async () => {
    try {
      const [doctorsResponse, pharmaciesResponse] = await Promise.all([
        supabase.from('doctors').select('id, name, specialty, area').order('name'),
        supabase.from('pharmacies').select('id, name, address').order('name')
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

      if (selectedDoctor) {
        query = query.eq('doctor_id', selectedDoctor);
      }
      if (selectedPharmacy) {
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporting</h1>
          <p className="text-muted-foreground">
            Generate reports based on doctors and pharmacies
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
          <CardDescription>
            Select a doctor or pharmacy to view related entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Doctor</label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a doctor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Doctors</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Pharmacy</label>
              <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a pharmacy..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Pharmacies</SelectItem>
                  {pharmacies.map((pharmacy) => (
                    <SelectItem key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(selectedDoctor || selectedPharmacy) && (
            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedDoctor('');
                  setSelectedPharmacy('');
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{reportEntries.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold">{getTotalQuantity()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(getTotalAmount())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Report Entries</CardTitle>
          <CardDescription>
            {selectedDoctor && selectedPharmacy
              ? `Showing orders for selected doctor and pharmacy`
              : selectedDoctor
              ? `Showing orders for ${doctors.find(d => d.id === selectedDoctor)?.name}`
              : selectedPharmacy
              ? `Showing orders for ${pharmacies.find(p => p.id === selectedPharmacy)?.name}`
              : 'Select a doctor or pharmacy to view report entries'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : reportEntries.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {selectedDoctor || selectedPharmacy
                  ? 'No entries found for the selected filters'
                  : 'Select a doctor or pharmacy to generate a report'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{entry.product?.name}</h4>
                      <p className="text-sm text-muted-foreground">{entry.product?.category}</p>
                    </div>
                    <Badge variant="secondary">
                      {formatCurrency(entry.total_amount)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Doctor</p>
                      <p className="text-muted-foreground">
                        {entry.doctor?.name} - {entry.doctor?.specialty}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Pharmacy</p>
                      <p className="text-muted-foreground">{entry.pharmacy?.name}</p>
                    </div>
                    <div>
                      <p className="font-medium">Order Details</p>
                      <p className="text-muted-foreground">
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
  );
};

export default Reporting;