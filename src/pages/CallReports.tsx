import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CallReport {
  date: string;
  targetName: string;
  targetType: 'doctor' | 'pharmacy';
  specialty?: string;
  area?: string;
  status: string;
}

const CallReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [reports, setReports] = useState<CallReport[]>([]);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      fetchCallReports();
    }
  }, [selectedYear, selectedMonth, user]);

  const fetchCallReports = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);

      const { data: calls, error } = await supabase
        .from('daily_calls')
        .select('*')
        .eq('mr_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;

      // Fetch doctor and pharmacy details
      const doctorIds = calls?.filter(c => c.target_type === 'doctor').map(c => c.target_id) || [];
      const pharmacyIds = calls?.filter(c => c.target_type === 'pharmacy').map(c => c.target_id) || [];

      const [doctorsRes, pharmaciesRes] = await Promise.all([
        doctorIds.length > 0 
          ? supabase.from('doctors').select('id, name, specialty, area').in('id', doctorIds)
          : { data: [], error: null },
        pharmacyIds.length > 0
          ? supabase.from('pharmacies').select('id, name, city').in('id', pharmacyIds)
          : { data: [], error: null }
      ]);

      const doctorsMap = new Map((doctorsRes.data || []).map(d => [d.id, d]));
      const pharmaciesMap = new Map((pharmaciesRes.data || []).map(p => [p.id, p]));

      const formattedReports: CallReport[] = (calls || []).map(call => {
        if (call.target_type === 'doctor') {
          const doctor = doctorsMap.get(call.target_id);
          return {
            date: call.date,
            targetName: doctor?.name || 'Unknown',
            targetType: 'doctor',
            specialty: doctor?.specialty,
            area: doctor?.area,
            status: call.status
          };
        } else {
          const pharmacy = pharmaciesMap.get(call.target_id);
          return {
            date: call.date,
            targetName: pharmacy?.name || 'Unknown',
            targetType: 'pharmacy',
            area: pharmacy?.city,
            status: call.status
          };
        }
      });

      setReports(formattedReports);
    } catch (error) {
      console.error('Error fetching call reports:', error);
      toast({
        title: "Error",
        description: "Failed to load call reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Call Reports" description="View your monthly call reports" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Select Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Reports Table */}
        <Card>
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Specialty/Area</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length > 0 ? (
                    reports.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(new Date(report.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-medium">{report.targetName}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            report.targetType === 'doctor' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {report.targetType === 'doctor' ? 'Doctor' : 'Pharmacy'}
                          </span>
                        </TableCell>
                        <TableCell>{report.specialty || report.area || '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            report.status === 'complete' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {report.status === 'complete' ? 'Completed' : 'Pending'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No call reports found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CallReports;
