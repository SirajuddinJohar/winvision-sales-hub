import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
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
  mrName?: string;
  mrEmail?: string;
}

interface MROption {
  id: string;
  name: string;
  email: string;
}

const CallReports = () => {
  const { user } = useAuth();
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedMrId, setSelectedMrId] = useState<string>('all');
  const [mrsList, setMrsList] = useState<MROption[]>([]);
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
    if (isAdmin) {
      fetchMRs();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      fetchCallReports();
    }
  }, [selectedYear, selectedMonth, selectedMrId, user]);

  const fetchMRs = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'mr')
        .order('name');

      if (error) throw error;
      setMrsList(data || []);
    } catch (error) {
      console.error('Error fetching MRs:', error);
      toast({
        title: "Error",
        description: "Failed to load MRs list",
        variant: "destructive"
      });
    }
  };

  const fetchCallReports = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);

      let query = supabase
        .from('daily_calls')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      // Filter by MR based on role and selection
      if (isAdmin) {
        if (selectedMrId && selectedMrId !== 'all') {
          query = query.eq('mr_id', selectedMrId);
        }
      } else {
        query = query.eq('mr_id', user.id);
      }

      const { data: calls, error } = await query;

      if (error) throw error;

      // Fetch MR details for the calls
      const mrIds = [...new Set((calls || []).map(c => c.mr_id))];
      const { data: mrsData, error: mrsError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', mrIds);

      if (mrsError) throw mrsError;

      const mrsMap = new Map((mrsData || []).map(m => [m.id, m]));

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
        const mrData = mrsMap.get(call.mr_id);
        if (call.target_type === 'doctor') {
          const doctor = doctorsMap.get(call.target_id);
          return {
            date: call.date,
            targetName: doctor?.name || 'Unknown',
            targetType: 'doctor',
            specialty: doctor?.specialty,
            area: doctor?.area,
            status: call.status,
            mrName: mrData?.name,
            mrEmail: mrData?.email
          };
        } else {
          const pharmacy = pharmaciesMap.get(call.target_id);
          return {
            date: call.date,
            targetName: pharmacy?.name || 'Unknown',
            targetType: 'pharmacy',
            area: pharmacy?.city,
            status: call.status,
            mrName: mrData?.name,
            mrEmail: mrData?.email
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
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        {/* Total Calls Count - Admin Only */}
        {isAdmin && reports.length > 0 && (
          <Card className="p-3 md:p-6 bg-primary/5 border-primary/20">
            <div className="text-center">
              <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Total Calls</h3>
              <p className="text-2xl md:text-4xl font-bold text-primary">{reports.length}</p>
              <p className="text-[10px] md:text-sm text-muted-foreground mt-1 md:mt-2">
                {selectedMrId === 'all' ? 'All MRs' : mrsList.find(mr => mr.id === selectedMrId)?.name || 'Selected MR'} - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </p>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-3 md:p-6">
          <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-2 md:gap-4`}>
            <div>
              <label className="text-xs md:text-sm font-medium mb-1 md:mb-2 block">Select Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
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
              <label className="text-xs md:text-sm font-medium mb-1 md:mb-2 block">Select Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div>
                <label className="text-xs md:text-sm font-medium mb-1 md:mb-2 block">Select MR</label>
                <Select value={selectedMrId} onValueChange={setSelectedMrId}>
                  <SelectTrigger className="h-9 md:h-10 text-sm">
                    <SelectValue placeholder="Select MR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All MRs</SelectItem>
                    {mrsList.map(mr => (
                      <SelectItem key={mr.id} value={mr.id}>
                        {mr.name} ({mr.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Reports Table */}
        <Card>
          {loading ? (
            <div className="p-3 md:p-6 space-y-3 md:space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 md:h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm">Date</TableHead>
                    {isAdmin && selectedMrId === 'all' && <TableHead className="text-xs md:text-sm">MR Name</TableHead>}
                    <TableHead className="text-xs md:text-sm">Name</TableHead>
                    <TableHead className="text-xs md:text-sm">Type</TableHead>
                    <TableHead className="text-xs md:text-sm">Specialty/Area</TableHead>
                    <TableHead className="text-xs md:text-sm">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length > 0 ? (
                    reports.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-xs md:text-sm py-2 md:py-4">{format(new Date(report.date), 'dd MMM yyyy')}</TableCell>
                        {isAdmin && selectedMrId === 'all' && (
                          <TableCell className="py-2 md:py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-xs md:text-sm">{report.mrName || 'Unknown'}</span>
                              <span className="text-[10px] md:text-xs text-muted-foreground">{report.mrEmail}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-xs md:text-sm py-2 md:py-4">{report.targetName}</TableCell>
                        <TableCell className="py-2 md:py-4">
                          <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs ${
                            report.targetType === 'doctor' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {report.targetType === 'doctor' ? 'Doctor' : 'Pharmacy'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs md:text-sm py-2 md:py-4">{report.specialty || report.area || '-'}</TableCell>
                        <TableCell className="py-2 md:py-4">
                          <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs ${
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
                      <TableCell colSpan={isAdmin && selectedMrId === 'all' ? 6 : 5} className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground">
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