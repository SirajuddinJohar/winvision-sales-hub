import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, MapPin, Briefcase, Calendar, Coffee, Palmtree } from 'lucide-react';
import { format } from 'date-fns';

interface MRSetup {
  id: string;
  mr_id: string;
  mr_name: string;
  mr_email: string;
  work_type: 'leave' | 'holiday' | 'on_field';
  working_with: string | null;
  selected_areas: string[];
  work_date: string;
}

interface AreaInfo {
  id: string;
  area_name: string;
}

const MRDailyWorkingDashboard = () => {
  const [mrSetups, setMrSetups] = useState<MRSetup[]>([]);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaySetups();
  }, []);

  const fetchTodaySetups = async () => {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch all areas for lookup
      const { data: areasData } = await supabase
        .from('areas')
        .select('id, area_name');
      
      setAreas(areasData || []);

      // Fetch all MRs
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('role', 'mr');

      if (usersError) throw usersError;

      // Fetch today's setups
      const { data: setupsData, error: setupsError } = await supabase
        .from('daily_working_setup')
        .select('*')
        .eq('work_date', today);

      if (setupsError) throw setupsError;

      // Combine data
      const mrList = (usersData || []).map(user => {
        const setup = (setupsData || []).find(s => s.mr_id === user.id);
        return {
          id: setup?.id || user.id,
          mr_id: user.id,
          mr_name: user.name,
          mr_email: user.email,
          work_type: setup?.work_type || 'not_set',
          working_with: setup?.working_with || null,
          selected_areas: (setup?.selected_areas as string[]) || [],
          work_date: today
        };
      });

      setMrSetups(mrList as MRSetup[]);
    } catch (error) {
      console.error('Error fetching MR setups:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAreaName = (areaId: string) => {
    return areas.find(a => a.id === areaId)?.area_name || 'Unknown Area';
  };

  const getWorkTypeIcon = (workType: string) => {
    switch (workType) {
      case 'on_field':
        return <Briefcase className="h-4 w-4" />;
      case 'leave':
        return <Coffee className="h-4 w-4" />;
      case 'holiday':
        return <Palmtree className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getWorkTypeBadge = (workType: string) => {
    switch (workType) {
      case 'on_field':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">On Field</Badge>;
      case 'leave':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Leave</Badge>;
      case 'holiday':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Holiday</Badge>;
      default:
        return <Badge variant="secondary">Not Set</Badge>;
    }
  };

  const onFieldCount = mrSetups.filter(s => s.work_type === 'on_field').length;
  const leaveCount = mrSetups.filter(s => s.work_type === 'leave').length;
  const holidayCount = mrSetups.filter(s => s.work_type === 'holiday').length;
  const notSetCount = mrSetups.filter(s => !['on_field', 'leave', 'holiday'].includes(s.work_type)).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          MR Daily Working Status - {format(new Date(), 'dd MMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-green-500/10 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">{onFieldCount}</p>
            <p className="text-xs text-muted-foreground">On Field</p>
          </div>
          <div className="p-3 bg-orange-500/10 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-600">{leaveCount}</p>
            <p className="text-xs text-muted-foreground">On Leave</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">{holidayCount}</p>
            <p className="text-xs text-muted-foreground">Holiday</p>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-2xl font-bold text-muted-foreground">{notSetCount}</p>
            <p className="text-xs text-muted-foreground">Not Set</p>
          </div>
        </div>

        {/* MR List */}
        <div className="space-y-2">
          {mrSetups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No MRs found</p>
          ) : (
            mrSetups.map((mr) => (
              <div
                key={mr.mr_id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getWorkTypeIcon(mr.work_type)}
                  <div>
                    <p className="font-medium">{mr.mr_name}</p>
                    <p className="text-sm text-muted-foreground">{mr.mr_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {mr.work_type === 'on_field' && mr.selected_areas.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{mr.selected_areas.map(id => getAreaName(id)).join(', ')}</span>
                    </div>
                  )}
                  {mr.work_type === 'on_field' && mr.working_with && (
                    <Badge variant="outline" className="text-xs">
                      {mr.working_with === 'manager' ? 'With Manager' : 'Individual'}
                    </Badge>
                  )}
                  {getWorkTypeBadge(mr.work_type)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MRDailyWorkingDashboard;
