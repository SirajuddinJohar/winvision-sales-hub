import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Users, MapPin, ChevronDown, ChevronRight, User } from 'lucide-react';

interface MRUser {
  id: string;
  name: string;
  email: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  area: string;
}

interface Area {
  id: string;
  area_name: string;
}

interface MRAreaAssignment {
  mrId: string;
  mrName: string;
  mrEmail: string;
  areas: {
    areaId: string;
    areaName: string;
    doctors: Doctor[];
  }[];
}

const MRAreaAssignments = () => {
  const [assignments, setAssignments] = useState<MRAreaAssignment[]>([]);
  const [expandedMRs, setExpandedMRs] = useState<string[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllAssignments();
  }, []);

  const fetchAllAssignments = async () => {
    setLoading(true);
    try {
      // Fetch all MRs
      const { data: mrsData, error: mrsError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'mr');

      if (mrsError) throw mrsError;

      // Fetch all areas
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('id, area_name');

      if (areasError) throw areasError;

      // Fetch all doctors
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('id, name, specialty, area');

      if (doctorsError) throw doctorsError;

      // Fetch all area doctor visits (admin can see all due to RLS)
      const { data: visitsData, error: visitsError } = await supabase
        .from('area_doctor_visits')
        .select('area_id, doctor_id, created_by')
        .order('created_at');

      if (visitsError) throw visitsError;

      // Group by MR
      const mrAssignments: MRAreaAssignment[] = (mrsData || []).map(mr => {
        // Get visits for this MR
        const mrVisits = (visitsData || []).filter(v => v.created_by === mr.id);
        
        // Group by area
        const areaMap: Record<string, string[]> = {};
        mrVisits.forEach(visit => {
          if (!areaMap[visit.area_id]) {
            areaMap[visit.area_id] = [];
          }
          if (!areaMap[visit.area_id].includes(visit.doctor_id)) {
            areaMap[visit.area_id].push(visit.doctor_id);
          }
        });

        const areas = Object.entries(areaMap).map(([areaId, doctorIds]) => {
          const area = (areasData || []).find(a => a.id === areaId);
          const doctors = (doctorsData || []).filter(d => doctorIds.includes(d.id));
          return {
            areaId,
            areaName: area?.area_name || 'Unknown Area',
            doctors
          };
        });

        return {
          mrId: mr.id,
          mrName: mr.name,
          mrEmail: mr.email,
          areas
        };
      });

      setAssignments(mrAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMRExpanded = (mrId: string) => {
    setExpandedMRs(prev =>
      prev.includes(mrId) ? prev.filter(id => id !== mrId) : [...prev, mrId]
    );
  };

  const toggleAreaExpanded = (areaKey: string) => {
    setExpandedAreas(prev =>
      prev.includes(areaKey) ? prev.filter(id => id !== areaKey) : [...prev, areaKey]
    );
  };

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
          All MR Area Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {assignments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No MRs found</p>
        ) : (
          assignments.map((mr) => (
            <Collapsible
              key={mr.mrId}
              open={expandedMRs.includes(mr.mrId)}
              onOpenChange={() => toggleMRExpanded(mr.mrId)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{mr.mrName}</p>
                      <p className="text-sm text-muted-foreground">{mr.mrEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={mr.areas.length > 0 ? "default" : "secondary"}>
                      {mr.areas.length} areas
                    </Badge>
                    <Badge variant="outline">
                      {mr.areas.reduce((sum, a) => sum + a.doctors.length, 0)} doctors
                    </Badge>
                    {expandedMRs.includes(mr.mrId) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 ml-4 space-y-2">
                  {mr.areas.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 bg-card border rounded-lg">
                      No area assignments yet
                    </p>
                  ) : (
                    mr.areas.map((area) => (
                      <Collapsible
                        key={`${mr.mrId}-${area.areaId}`}
                        open={expandedAreas.includes(`${mr.mrId}-${area.areaId}`)}
                        onOpenChange={() => toggleAreaExpanded(`${mr.mrId}-${area.areaId}`)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-medium">{area.areaName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{area.doctors.length} doctors</Badge>
                              {expandedAreas.includes(`${mr.mrId}-${area.areaId}`) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-1 ml-4 space-y-1">
                            {area.doctors.map((doctor) => (
                              <div
                                key={doctor.id}
                                className="flex items-center gap-2 p-2 text-sm bg-muted/30 rounded"
                              >
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span>{doctor.name}</span>
                                <span className="text-muted-foreground">• {doctor.specialty}</span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default MRAreaAssignments;
