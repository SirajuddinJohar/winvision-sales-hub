import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, MapPin, User, Save, Loader2 } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

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
  
  const [areas, setAreas] = useState<Area[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<AreaDoctorAssignment[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      // Fetch areas
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('id, area_name')
        .order('area_name');

      if (areasError) throw areasError;
      setAreas(areasData || []);

      // Fetch doctors assigned to current MR
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('id, name, specialty, area')
        .order('name');

      if (doctorsError) throw doctorsError;
      setDoctors(doctorsData || []);

      // Load existing assignments from localStorage (or could be from DB)
      const savedAssignments = localStorage.getItem(`area_doctor_visits_${user?.id}`);
      if (savedAssignments) {
        setAssignments(JSON.parse(savedAssignments));
      }
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorToggle = (doctorId: string) => {
    setSelectedDoctors(prev => 
      prev.includes(doctorId) 
        ? prev.filter(id => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  const handleSaveAssignment = () => {
    if (!selectedArea) {
      toast.error('Please select an area');
      return;
    }

    if (selectedDoctors.length < 5) {
      toast.error('Please select at least 5 doctors');
      return;
    }

    setSaving(true);
    
    const selectedAreaData = areas.find(a => a.id === selectedArea);
    const selectedDoctorsData = doctors.filter(d => selectedDoctors.includes(d.id));

    const newAssignment: AreaDoctorAssignment = {
      areaId: selectedArea,
      areaName: selectedAreaData?.area_name || '',
      doctors: selectedDoctorsData
    };

    // Update or add assignment
    const existingIndex = assignments.findIndex(a => a.areaId === selectedArea);
    let updatedAssignments: AreaDoctorAssignment[];
    
    if (existingIndex >= 0) {
      updatedAssignments = [...assignments];
      updatedAssignments[existingIndex] = newAssignment;
    } else {
      updatedAssignments = [...assignments, newAssignment];
    }

    setAssignments(updatedAssignments);
    
    // Save to localStorage
    localStorage.setItem(`area_doctor_visits_${user?.id}`, JSON.stringify(updatedAssignments));
    
    // Reset form
    setSelectedArea('');
    setSelectedDoctors([]);
    setSaving(false);
    
    toast.success('Assignment saved successfully!');
  };

  const toggleAreaExpanded = (areaId: string) => {
    setExpandedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const filteredDoctors = selectedArea 
    ? doctors 
    : doctors;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Area Wise Doctor Visits" description="Assign doctors to areas for visits" />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Assignment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Assign Doctors to Area
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Area Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Area</label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an area" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.area_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor Selection */}
            {selectedArea && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Select Doctors (minimum 5)</label>
                  <Badge variant={selectedDoctors.length >= 5 ? "default" : "secondary"}>
                    {selectedDoctors.length} selected
                  </Badge>
                </div>
                
                <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredDoctors.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No doctors available</p>
                  ) : (
                    filteredDoctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => handleDoctorToggle(doctor.id)}
                      >
                        <Checkbox
                          checked={selectedDoctors.includes(doctor.id)}
                          onCheckedChange={() => handleDoctorToggle(doctor.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{doctor.name}</p>
                          <p className="text-sm text-muted-foreground">{doctor.specialty} • {doctor.area}</p>
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
              disabled={!selectedArea || selectedDoctors.length < 5 || saving}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Assignment
            </Button>
          </CardContent>
        </Card>

        {/* Assignments List */}
        <Card>
          <CardHeader>
            <CardTitle>Area Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No area assignments yet. Select an area and assign doctors above.
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <Collapsible
                    key={assignment.areaId}
                    open={expandedAreas.includes(assignment.areaId)}
                    onOpenChange={() => toggleAreaExpanded(assignment.areaId)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="font-medium">{assignment.areaName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {assignment.doctors.length} doctors
                          </Badge>
                          {expandedAreas.includes(assignment.areaId) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 ml-4 space-y-2">
                        {assignment.doctors.map((doctor) => (
                          <div
                            key={doctor.id}
                            className="flex items-center gap-3 p-3 bg-card border rounded-lg"
                          >
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doctor.name}</p>
                              <p className="text-sm text-muted-foreground">
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
      </div>
    </div>
  );
};

export default AreaDoctorVisits;
