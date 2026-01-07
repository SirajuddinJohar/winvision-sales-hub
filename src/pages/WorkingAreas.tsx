import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, Trash2, Search, User, ArrowLeft, Users, Plus, X } from 'lucide-react';

interface AreaWithUser {
  id: string;
  area_name: string;
  from_location: string;
  to_location: string;
  distance: number;
  created_at: string;
  created_by: string | null;
  user_name: string | null;
  user_email: string | null;
  doctor_count: number;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  area: string;
}

interface AreaDoctor {
  id: string;
  doctor_id: string;
  doctor: Doctor;
}

const WorkingAreas = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useRoleAccess();
  const [areas, setAreas] = useState<AreaWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByUser, setFilterByUser] = useState<string>('');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  
  // Doctor management dialog state
  const [selectedArea, setSelectedArea] = useState<AreaWithUser | null>(null);
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [areaDoctors, setAreaDoctors] = useState<AreaDoctor[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctorsToAdd, setSelectedDoctorsToAdd] = useState<string[]>([]);
  const [showAddDoctors, setShowAddDoctors] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAreas();
    fetchUsers();
  }, [user, navigate]);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .order('created_at', { ascending: false });

      if (areasError) throw areasError;

      // Fetch doctor counts for all areas
      const { data: doctorCounts } = await supabase
        .from('area_doctor_visits')
        .select('area_id');

      // Count doctors per area
      const countByArea = (doctorCounts || []).reduce((acc, item) => {
        acc[item.area_id] = (acc[item.area_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Fetch user info for each area
      const areasWithUsers: AreaWithUser[] = await Promise.all(
        (areasData || []).map(async (area) => {
          let userName = null;
          let userEmail = null;
          
          if (area.created_by) {
            const { data: userData } = await supabase
              .from('users')
              .select('name, email')
              .eq('id', area.created_by)
              .single();
            
            if (userData) {
              userName = userData.name;
              userEmail = userData.email;
            }
          }

          return {
            ...area,
            user_name: userName,
            user_email: userEmail,
            doctor_count: countByArea[area.id] || 0,
          };
        })
      );

      setAreas(areasWithUsers);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch areas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    try {
      // First delete related area_doctor_visits
      await supabase
        .from('area_doctor_visits')
        .delete()
        .eq('area_id', areaId);

      // Then delete the area
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', areaId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Area deleted successfully',
      });
      
      fetchAreas();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete area',
        variant: 'destructive',
      });
    }
  };

  // Fetch doctors for selected area
  const fetchAreaDoctors = async (areaId: string) => {
    setLoadingDoctors(true);
    try {
      const { data, error } = await supabase
        .from('area_doctor_visits')
        .select('id, doctor_id, doctors(id, name, specialty, area)')
        .eq('area_id', areaId);

      if (error) throw error;

      const formattedDoctors = (data || []).map((item: any) => ({
        id: item.id,
        doctor_id: item.doctor_id,
        doctor: item.doctors,
      }));

      setAreaDoctors(formattedDoctors);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch doctors',
        variant: 'destructive',
      });
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Fetch all doctors for adding
  const fetchAllDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name, specialty, area')
        .order('name');

      if (error) throw error;
      setAllDoctors(data || []);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  const handleOpenDoctorDialog = async (area: AreaWithUser) => {
    setSelectedArea(area);
    setDoctorDialogOpen(true);
    setShowAddDoctors(false);
    setSelectedDoctorsToAdd([]);
    setDoctorSearch('');
    await Promise.all([fetchAreaDoctors(area.id), fetchAllDoctors()]);
  };

  const handleRemoveDoctor = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('area_doctor_visits')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Doctor removed from area' });
      
      if (selectedArea) {
        fetchAreaDoctors(selectedArea.id);
        fetchAreas(); // Refresh counts
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove doctor',
        variant: 'destructive',
      });
    }
  };

  const handleAddDoctors = async () => {
    if (!selectedArea || selectedDoctorsToAdd.length === 0 || !user) return;

    try {
      const insertData = selectedDoctorsToAdd.map((doctorId) => ({
        area_id: selectedArea.id,
        doctor_id: doctorId,
        created_by: user.id,
      }));

      const { error } = await supabase
        .from('area_doctor_visits')
        .insert(insertData);

      if (error) throw error;

      toast({ title: 'Success', description: `Added ${selectedDoctorsToAdd.length} doctor(s) to area` });
      
      setSelectedDoctorsToAdd([]);
      setShowAddDoctors(false);
      fetchAreaDoctors(selectedArea.id);
      fetchAreas();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add doctors',
        variant: 'destructive',
      });
    }
  };

  const toggleDoctorSelection = (doctorId: string) => {
    setSelectedDoctorsToAdd((prev) =>
      prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  // Get available doctors (not already assigned to this area)
  const availableDoctors = allDoctors.filter(
    (doc) => !areaDoctors.some((ad) => ad.doctor_id === doc.id)
  );

  const filteredAvailableDoctors = availableDoctors.filter(
    (doc) =>
      doc.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.area.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const filteredAreas = areas.filter((area) => {
    const matchesSearch =
      area.area_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.from_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.to_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (area.user_name && area.user_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesUser = !filterByUser || area.created_by === filterByUser;

    return matchesSearch && matchesUser;
  });

  // Group areas by user for summary
  const areasByUser = areas.reduce((acc, area) => {
    const key = area.created_by || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        name: area.user_name || 'Unknown User',
        count: 0,
      };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, { name: string; count: number }>);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Working Areas" description="Admin access required" />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">You don't have permission to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Working Areas" description="Manage all MR working areas" />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard/master')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Master
        </Button>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Areas</p>
                  <p className="text-2xl font-bold">{areas.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {Object.entries(areasByUser).slice(0, 3).map(([userId, data]) => (
            <Card key={userId} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilterByUser(userId === filterByUser ? '' : userId)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground truncate">{data.name}</p>
                    <p className="text-2xl font-bold">{data.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by area, location, or MR name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterByUser}
                onChange={(e) => setFilterByUser(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            {filterByUser && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterByUser('')}>
                Filtering by: {users.find(u => u.id === filterByUser)?.name || 'Unknown'} ✕
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Areas Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Areas List ({filteredAreas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading areas...</div>
            ) : filteredAreas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No areas found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area Name</TableHead>
                      <TableHead>From → To</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Doctors</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAreas.map((area) => (
                      <TableRow key={area.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            {area.area_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {area.from_location} → {area.to_location}
                          </span>
                        </TableCell>
                        <TableCell>{area.distance} km</TableCell>
                        <TableCell>
                          <Badge 
                            variant={area.doctor_count > 0 ? "default" : "outline"} 
                            className="flex items-center gap-1 w-fit cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleOpenDoctorDialog(area)}
                          >
                            <Users className="h-3 w-3" />
                            {area.doctor_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {area.user_name ? (
                            <div>
                              <p className="font-medium">{area.user_name}</p>
                              <p className="text-xs text-muted-foreground">{area.user_email}</p>
                            </div>
                          ) : (
                            <Badge variant="outline">Unknown</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(area.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Area</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{area.area_name}"? This will also remove all doctor assignments to this area. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteArea(area.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Doctor Management Dialog */}
      <Dialog open={doctorDialogOpen} onOpenChange={setDoctorDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {selectedArea?.area_name} - Doctors
            </DialogTitle>
            <DialogDescription>
              Manage doctors assigned to this area
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Current Doctors List */}
            {!showAddDoctors && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Assigned Doctors ({areaDoctors.length})</h4>
                  <Button size="sm" onClick={() => setShowAddDoctors(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Doctors
                  </Button>
                </div>

                {loadingDoctors ? (
                  <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : areaDoctors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    No doctors assigned to this area
                  </div>
                ) : (
                  <div className="space-y-2">
                    {areaDoctors.map((ad) => (
                      <div
                        key={ad.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-card"
                      >
                        <div>
                          <p className="font-medium">{ad.doctor?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {ad.doctor?.specialty} • {ad.doctor?.area}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveDoctor(ad.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add Doctors View */}
            {showAddDoctors && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Add Doctors</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddDoctors(false)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search doctors..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {filteredAvailableDoctors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    No available doctors found
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {filteredAvailableDoctors.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedDoctorsToAdd.includes(doc.id)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => toggleDoctorSelection(doc.id)}
                      >
                        <Checkbox
                          checked={selectedDoctorsToAdd.includes(doc.id)}
                          onCheckedChange={() => toggleDoctorSelection(doc.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.specialty} • {doc.area}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedDoctorsToAdd.length > 0 && (
                  <Button className="w-full" onClick={handleAddDoctors}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add {selectedDoctorsToAdd.length} Doctor(s)
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkingAreas;
