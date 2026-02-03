import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, MapPin, User, Save, Loader2, Trash2, Search, X, Users } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import MRAreaAssignments from '@/components/admin/MRAreaAssignments';

interface Area {
  id: string;
  area_name: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  area: string;
}

interface AreaDoctorAssignment {
  areaId: string;
  areaName: string;
  doctors: Doctor[];
}

const AreaDoctorVisits = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useRoleAccess();
  
  const [areas, setAreas] = useState<Area[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<AreaDoctorAssignment[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('id, area_name')
        .order('area_name');

      if (areasError) throw areasError;
      setAreas(areasData || []);

      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('id, name, specialty, area')
        .order('name');

      if (doctorsError) throw doctorsError;
      setDoctors(doctorsData || []);

      await fetchAssignments(areasData || [], doctorsData || []);
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (areasData: Area[], doctorsData: Doctor[]) => {
    try {
      const { data: assignmentsData, error } = await supabase
        .from('area_doctor_visits')
        .select('area_id, doctor_id')
        .order('created_at');

      if (error) throw error;

      const groupedAssignments: Record<string, string[]> = {};
      (assignmentsData || []).forEach((assignment) => {
        if (!groupedAssignments[assignment.area_id]) {
          groupedAssignments[assignment.area_id] = [];
        }
        groupedAssignments[assignment.area_id].push(assignment.doctor_id);
      });

      const formattedAssignments: AreaDoctorAssignment[] = Object.entries(groupedAssignments).map(([areaId, doctorIds]) => {
        const area = areasData.find(a => a.id === areaId);
        const areaDoctors = doctorsData.filter(d => doctorIds.includes(d.id));
        return {
          areaId,
          areaName: area?.area_name || 'Unknown Area',
          doctors: areaDoctors
        };
      });

      setAssignments(formattedAssignments);
    } catch (error: any) {
      toast.error('Failed to load assignments: ' + error.message);
    }
  };

  const handleAreaToggle = (areaId: string) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const handleDoctorToggle = (doctorId: string) => {
    setSelectedDoctors(prev => 
      prev.includes(doctorId) 
        ? prev.filter(id => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors;
    
    const query = searchQuery.toLowerCase();
    return doctors.filter(doctor =>
      doctor.name.toLowerCase().includes(query) ||
      doctor.specialty.toLowerCase().includes(query) ||
      doctor.area.toLowerCase().includes(query)
    );
  }, [doctors, searchQuery]);

  const handleSaveAssignment = async () => {
    if (selectedAreas.length === 0) {
      toast.error('Please select at least one area');
      return;
    }

    if (selectedDoctors.length < 5) {
      toast.error('Please select at least 5 doctors');
      return;
    }

    if (!user?.id) {
      toast.error('Please log in to save assignments');
      return;
    }

    setSaving(true);
    
    try {
      // Delete existing assignments for selected areas by this user
      for (const areaId of selectedAreas) {
        const { error: deleteError } = await supabase
          .from('area_doctor_visits')
          .delete()
          .eq('area_id', areaId)
          .eq('created_by', user.id);

        if (deleteError) throw deleteError;
      }

      // Insert new assignments for all selected areas
      const insertData: { area_id: string; doctor_id: string; created_by: string }[] = [];
      
      for (const areaId of selectedAreas) {
        for (const doctorId of selectedDoctors) {
          insertData.push({
            area_id: areaId,
            doctor_id: doctorId,
            created_by: user.id
          });
        }
      }

      const { error: insertError } = await supabase
        .from('area_doctor_visits')
        .insert(insertData);

      if (insertError) throw insertError;

      await fetchAssignments(areas, doctors);
      
      setSelectedAreas([]);
      setSelectedDoctors([]);
      setSearchQuery('');
      
      toast.success('Assignments saved successfully!');
    } catch (error: any) {
      toast.error('Failed to save assignment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (areaId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('area_doctor_visits')
        .delete()
        .eq('area_id', areaId)
        .eq('created_by', user.id);

      if (error) throw error;

      setAssignments(prev => prev.filter(a => a.areaId !== areaId));
      toast.success('Assignment deleted');
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const toggleAreaExpanded = (areaId: string) => {
    setExpandedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const getSelectedAreaNames = () => {
    return areas
      .filter(a => selectedAreas.includes(a.id))
      .map(a => a.area_name);
  };

  if (!user) return null;

  // Reusable Assignment Form Component
  const AssignmentForm = () => (
    <Card>
      <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          Assign Doctors to Areas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
        {/* Area Selection - Multi Select */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs md:text-sm font-medium">Select Areas</label>
            <Badge variant={selectedAreas.length > 0 ? "default" : "secondary"} className="text-[10px] md:text-xs">
              {selectedAreas.length} selected
            </Badge>
          </div>
          
          {/* Selected Areas Tags */}
          {selectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2">
              {getSelectedAreaNames().map((name, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1 text-[10px] md:text-xs">
                  {name}
                  <X 
                    className="h-2.5 w-2.5 md:h-3 md:w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => {
                      const area = areas.find(a => a.area_name === name);
                      if (area) handleAreaToggle(area.id);
                    }}
                  />
                </Badge>
              ))}
            </div>
          )}
          
          <div className="max-h-32 md:max-h-40 overflow-y-auto border rounded-lg p-1.5 md:p-2 space-y-0.5 md:space-y-1">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center space-x-2 md:space-x-3 p-1.5 md:p-2 hover:bg-muted rounded-lg cursor-pointer"
                onClick={() => handleAreaToggle(area.id)}
              >
                <Checkbox
                  checked={selectedAreas.includes(area.id)}
                  onCheckedChange={() => handleAreaToggle(area.id)}
                />
                <span className="font-medium text-xs md:text-sm">{area.area_name}</span>
              </div>
            ))}
            {areas.length === 0 && (
              <p className="text-center text-muted-foreground py-2 text-xs md:text-sm">No areas available</p>
            )}
          </div>
        </div>

        {/* Doctor Selection with Search */}
        {selectedAreas.length > 0 && (
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs md:text-sm font-medium">Select Doctors (minimum 5)</label>
              <Badge variant={selectedDoctors.length >= 5 ? "default" : "secondary"} className="text-[10px] md:text-xs">
                {selectedDoctors.length} selected
              </Badge>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, specialty, or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 md:pl-10 h-9 md:h-10 text-sm"
              />
              {searchQuery && (
                <X 
                  className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setSearchQuery('')}
                />
              )}
            </div>
            
            <div className="max-h-48 md:max-h-64 overflow-y-auto border rounded-lg p-1.5 md:p-2 space-y-1.5 md:space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-6 md:py-8">
                  <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-primary" />
                </div>
              ) : filteredDoctors.length === 0 ? (
                <p className="text-center text-muted-foreground py-3 md:py-4 text-xs md:text-sm">
                  {searchQuery ? 'No doctors match your search' : 'No doctors available'}
                </p>
              ) : (
                filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center space-x-2 md:space-x-3 p-1.5 md:p-2 hover:bg-muted rounded-lg cursor-pointer"
                    onClick={() => handleDoctorToggle(doctor.id)}
                  >
                    <Checkbox
                      checked={selectedDoctors.includes(doctor.id)}
                      onCheckedChange={() => handleDoctorToggle(doctor.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-xs md:text-sm">{doctor.name}</p>
                      <p className="text-[10px] md:text-sm text-muted-foreground">{doctor.specialty} • {doctor.area}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSaveAssignment} 
          disabled={selectedAreas.length === 0 || selectedDoctors.length < 5 || saving}
          className="w-full h-9 md:h-10 text-sm"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
          )}
          Save Assignment ({selectedAreas.length} area{selectedAreas.length !== 1 ? 's' : ''}, {selectedDoctors.length} doctors)
        </Button>
      </CardContent>
    </Card>
  );

  // Reusable Assignments List Component
  const AssignmentsList = () => (
    <Card>
      <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
        <CardTitle className="text-base md:text-lg">My Area Assignments</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-6 md:py-8">
            <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-primary" />
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 md:py-8 text-xs md:text-sm">
            No area assignments yet. Select areas and assign doctors above.
          </p>
        ) : (
          <div className="space-y-1.5 md:space-y-2">
            {assignments.map((assignment) => (
              <Collapsible
                key={assignment.areaId}
                open={expandedAreas.includes(assignment.areaId)}
                onOpenChange={() => toggleAreaExpanded(assignment.areaId)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 md:p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                    <div className="flex items-center gap-2 md:gap-3">
                      <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      <span className="font-medium text-xs md:text-sm">{assignment.areaName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Badge variant="secondary" className="text-[10px] md:text-xs">
                        {assignment.doctors.length} doctors
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAssignment(assignment.areaId);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                      {expandedAreas.includes(assignment.areaId) ? (
                        <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1.5 md:mt-2 ml-3 md:ml-4 space-y-1.5 md:space-y-2">
                    {assignment.doctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-card border rounded-lg"
                      >
                        <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-xs md:text-sm">{doctor.name}</p>
                          <p className="text-[10px] md:text-sm text-muted-foreground">
                            {doctor.specialty} • {doctor.area}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Area Wise Doctor Visits" description="Assign doctors to areas for visits" />
      
      <div className="px-3 py-2 md:px-4 md:py-6 space-y-3 md:space-y-6">
        {isAdmin ? (
          <Tabs defaultValue="my-assignments" className="space-y-3 md:space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-assignments" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                My Assignments
              </TabsTrigger>
              <TabsTrigger value="all-mrs" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                All MRs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-assignments" className="space-y-3 md:space-y-6">
              <AssignmentForm />
              <AssignmentsList />
            </TabsContent>

            <TabsContent value="all-mrs">
              <MRAreaAssignments />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <AssignmentForm />
            <AssignmentsList />
          </>
        )}
      </div>
    </div>
  );
};

export default AreaDoctorVisits;