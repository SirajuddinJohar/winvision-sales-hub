import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronRight, MapPin, User, Save, Loader2, Trash2, Search, X, Users, ShieldAlert, Check, XCircle,
} from 'lucide-react';
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

interface DeleteRequest {
  id: string;
  area_id: string;
  doctor_id: string | null;
  requested_by: string;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
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

  // Delete request state
  const [pendingRequestKeys, setPendingRequestKeys] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ areaId: string; areaName: string; doctorId: string | null; doctorName?: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Admin requests
  const [adminRequests, setAdminRequests] = useState<DeleteRequest[]>([]);
  const [requesterMap, setRequesterMap] = useState<Record<string, string>>({});

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
      const [{ data: areasData }, { data: doctorsData }] = await Promise.all([
        supabase.from('areas').select('id, area_name').order('area_name'),
        supabase.from('doctors').select('id, name, specialty, area').order('name'),
      ]);

      setAreas(areasData || []);
      setDoctors(doctorsData || []);

      await fetchAssignments(areasData || [], doctorsData || []);
      await fetchMyPendingRequests();
      if (isAdmin) await fetchAdminRequests();
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (areasData: Area[], doctorsData: Doctor[]) => {
    const { data, error } = await supabase
      .from('area_doctor_visits')
      .select('area_id, doctor_id')
      .order('created_at');
    if (error) {
      toast.error('Failed to load assignments: ' + error.message);
      return;
    }
    const grouped: Record<string, string[]> = {};
    (data || []).forEach((a) => {
      if (!grouped[a.area_id]) grouped[a.area_id] = [];
      if (!grouped[a.area_id].includes(a.doctor_id)) grouped[a.area_id].push(a.doctor_id);
    });
    const formatted: AreaDoctorAssignment[] = Object.entries(grouped).map(([areaId, doctorIds]) => ({
      areaId,
      areaName: areasData.find(a => a.id === areaId)?.area_name || 'Unknown Area',
      doctors: doctorsData.filter(d => doctorIds.includes(d.id)),
    }));
    setAssignments(formatted);
  };

  const fetchMyPendingRequests = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('area_doctor_delete_requests')
      .select('area_id, doctor_id, status')
      .eq('requested_by', user.id)
      .eq('status', 'pending');
    const keys = new Set<string>();
    (data || []).forEach((r: any) => keys.add(`${r.area_id}:${r.doctor_id ?? 'ALL'}`));
    setPendingRequestKeys(keys);
  };

  const fetchAdminRequests = async () => {
    const { data, error } = await supabase
      .from('area_doctor_delete_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return;
    setAdminRequests(data || []);
    const userIds = Array.from(new Set((data || []).map((r: any) => r.requested_by)));
    if (userIds.length) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);
      const map: Record<string, string> = {};
      (usersData || []).forEach((u: any) => { map[u.id] = u.name; });
      setRequesterMap(map);
    }
  };

  const handleAreaToggle = (areaId: string) => {
    setSelectedAreas(prev => prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]);
  };

  const handleDoctorToggle = (doctorId: string) => {
    setSelectedDoctors(prev => prev.includes(doctorId) ? prev.filter(id => id !== doctorId) : [...prev, doctorId]);
  };

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors;
    const q = searchQuery.toLowerCase();
    return doctors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q) ||
      d.area.toLowerCase().includes(q)
    );
  }, [doctors, searchQuery]);

  // Existing doctor IDs for currently selected areas (to know what's already assigned)
  const existingDoctorIdsForSelectedAreas = useMemo(() => {
    const set = new Set<string>();
    selectedAreas.forEach(areaId => {
      const existing = assignments.find(a => a.areaId === areaId);
      existing?.doctors.forEach(d => set.add(d.id));
    });
    return set;
  }, [selectedAreas, assignments]);

  const handleSaveAssignment = async () => {
    if (selectedAreas.length === 0) {
      toast.error('Please select at least one area');
      return;
    }
    if (!user?.id) return;

    // Calculate combined count for at least one area to satisfy minimum 5 (existing + new)
    const insufficient = selectedAreas.some(areaId => {
      const existing = assignments.find(a => a.areaId === areaId)?.doctors.length || 0;
      const newDocs = selectedDoctors.filter(d => {
        const already = assignments.find(a => a.areaId === areaId)?.doctors.some(dd => dd.id === d);
        return !already;
      }).length;
      return existing + newDocs < 5;
    });
    if (insufficient) {
      toast.error('Each selected area must end up with at least 5 doctors total');
      return;
    }

    setSaving(true);
    try {
      const insertData: { area_id: string; doctor_id: string; created_by: string }[] = [];
      for (const areaId of selectedAreas) {
        const existingDocIds = new Set(assignments.find(a => a.areaId === areaId)?.doctors.map(d => d.id) || []);
        for (const doctorId of selectedDoctors) {
          if (!existingDocIds.has(doctorId)) {
            insertData.push({ area_id: areaId, doctor_id: doctorId, created_by: user.id });
          }
        }
      }

      if (insertData.length === 0) {
        toast.info('No new doctors to add');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('area_doctor_visits').insert(insertData);
      if (error) throw error;

      await fetchAssignments(areas, doctors);
      setSelectedAreas([]);
      setSelectedDoctors([]);
      setSearchQuery('');
      toast.success(`Added ${insertData.length} doctor assignment(s)`);
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteRequest = (areaId: string, areaName: string, doctorId: string | null, doctorName?: string) => {
    setDeleteDialog({ areaId, areaName, doctorId, doctorName });
    setDeleteReason('');
  };

  const submitDeleteRequest = async () => {
    if (!user?.id || !deleteDialog) return;
    setSubmittingRequest(true);
    try {
      const { error } = await supabase.from('area_doctor_delete_requests').insert({
        area_id: deleteDialog.areaId,
        doctor_id: deleteDialog.doctorId,
        requested_by: user.id,
        reason: deleteReason.trim() || null,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Deletion request sent to admin');
      setDeleteDialog(null);
      setDeleteReason('');
      await fetchMyPendingRequests();
    } catch (error: any) {
      toast.error('Failed to submit request: ' + error.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Admin-only direct delete (no approval needed)
  const adminDirectDelete = async (areaId: string, doctorId: string | null, createdBy?: string) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      let q = supabase.from('area_doctor_visits').delete().eq('area_id', areaId);
      if (doctorId) q = q.eq('doctor_id', doctorId);
      if (createdBy) q = q.eq('created_by', createdBy);
      const { error } = await q;
      if (error) throw error;
      toast.success('Deleted');
      await fetchAssignments(areas, doctors);
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  const reviewRequest = async (req: DeleteRequest, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const { error } = await supabase
        .from('area_doctor_delete_requests')
        .update({ status, admin_notes: notes ?? null })
        .eq('id', req.id);
      if (error) throw error;
      toast.success(`Request ${status}`);
      await fetchAdminRequests();
      await fetchAssignments(areas, doctors);
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  const toggleAreaExpanded = (areaId: string) => {
    setExpandedAreas(prev => prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]);
  };

  const getSelectedAreaNames = () =>
    areas.filter(a => selectedAreas.includes(a.id)).map(a => a.area_name);

  if (!user) return null;

  const hasPendingRequest = (areaId: string, doctorId: string | null) =>
    pendingRequestKeys.has(`${areaId}:${doctorId ?? 'ALL'}`);

  // ============= Assignment Form =============
  const AssignmentForm = () => (
    <Card>
      <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          Assign / Add Doctors to Areas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs md:text-sm font-medium">Select Areas</label>
            <Badge variant={selectedAreas.length > 0 ? "default" : "secondary"} className="text-[10px] md:text-xs">
              {selectedAreas.length} selected
            </Badge>
          </div>

          {selectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2">
              {getSelectedAreaNames().map((name, i) => (
                <Badge key={i} variant="outline" className="flex items-center gap-1 text-[10px] md:text-xs">
                  {name}
                  <X className="h-2.5 w-2.5 md:h-3 md:w-3 cursor-pointer hover:text-destructive"
                    onClick={() => {
                      const a = areas.find(x => x.area_name === name);
                      if (a) handleAreaToggle(a.id);
                    }} />
                </Badge>
              ))}
            </div>
          )}

          <div className="max-h-32 md:max-h-40 overflow-y-auto border rounded-lg p-1.5 md:p-2 space-y-0.5 md:space-y-1">
            {areas.map((area) => {
              const existingCount = assignments.find(a => a.areaId === area.id)?.doctors.length || 0;
              return (
                <div key={area.id}
                  className="flex items-center justify-between space-x-2 p-1.5 md:p-2 hover:bg-muted rounded-lg cursor-pointer"
                  onClick={() => handleAreaToggle(area.id)}>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={selectedAreas.includes(area.id)} onCheckedChange={() => handleAreaToggle(area.id)} />
                    <span className="font-medium text-xs md:text-sm">{area.area_name}</span>
                  </div>
                  {existingCount > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{existingCount} assigned</Badge>
                  )}
                </div>
              );
            })}
            {areas.length === 0 && <p className="text-center text-muted-foreground py-2 text-xs md:text-sm">No areas available</p>}
          </div>
        </div>

        {selectedAreas.length > 0 && (
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs md:text-sm font-medium">Select Doctors to Add</label>
              <Badge variant={selectedDoctors.length > 0 ? "default" : "secondary"} className="text-[10px] md:text-xs">
                {selectedDoctors.length} selected
              </Badge>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Already-assigned doctors are highlighted. Each area must have at least 5 doctors in total.
            </p>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              <Input placeholder="Search by name, specialty, or area..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 md:pl-10 h-9 md:h-10 text-sm" />
              {searchQuery && (
                <X className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setSearchQuery('')} />
              )}
            </div>

            <div className="max-h-48 md:max-h-64 overflow-y-auto border rounded-lg p-1.5 md:p-2 space-y-1.5 md:space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : filteredDoctors.length === 0 ? (
                <p className="text-center text-muted-foreground py-3 text-xs md:text-sm">{searchQuery ? 'No matches' : 'No doctors'}</p>
              ) : (
                filteredDoctors.map((doctor) => {
                  const alreadyAssigned = existingDoctorIdsForSelectedAreas.has(doctor.id);
                  return (
                    <div key={doctor.id}
                      className={`flex items-center space-x-2 md:space-x-3 p-1.5 md:p-2 rounded-lg cursor-pointer ${alreadyAssigned ? 'bg-primary/5' : 'hover:bg-muted'}`}
                      onClick={() => handleDoctorToggle(doctor.id)}>
                      <Checkbox checked={selectedDoctors.includes(doctor.id) || alreadyAssigned}
                        disabled={alreadyAssigned}
                        onCheckedChange={() => handleDoctorToggle(doctor.id)} />
                      <div className="flex-1">
                        <p className="font-medium text-xs md:text-sm">{doctor.name}</p>
                        <p className="text-[10px] md:text-sm text-muted-foreground">{doctor.specialty} • {doctor.area}</p>
                      </div>
                      {alreadyAssigned && <Badge variant="secondary" className="text-[10px]">Assigned</Badge>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <Button onClick={handleSaveAssignment}
          disabled={selectedAreas.length === 0 || saving}
          className="w-full h-9 md:h-10 text-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save / Add Doctors
        </Button>
      </CardContent>
    </Card>
  );

  // ============= Assignments List =============
  const AssignmentsList = () => (
    <Card>
      <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
        <CardTitle className="text-base md:text-lg">My Area Assignments</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : assignments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-xs md:text-sm">No area assignments yet.</p>
        ) : (
          <div className="space-y-1.5 md:space-y-2">
            {assignments.map((assignment) => {
              const areaPending = hasPendingRequest(assignment.areaId, null);
              return (
                <Collapsible key={assignment.areaId}
                  open={expandedAreas.includes(assignment.areaId)}
                  onOpenChange={() => toggleAreaExpanded(assignment.areaId)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 md:p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      <div className="flex items-center gap-2 md:gap-3">
                        <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        <span className="font-medium text-xs md:text-sm">{assignment.areaName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Badge variant="secondary" className="text-[10px] md:text-xs">{assignment.doctors.length} doctors</Badge>
                        {areaPending ? (
                          <Badge variant="outline" className="text-[10px] text-amber-600">Approval pending</Badge>
                        ) : (
                          <Button variant="ghost" size="icon"
                            className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAdmin) adminDirectDelete(assignment.areaId, null, user!.id);
                              else openDeleteRequest(assignment.areaId, assignment.areaName, null);
                            }}
                            title={isAdmin ? 'Delete area assignment' : 'Request deletion'}>
                            <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          </Button>
                        )}
                        {expandedAreas.includes(assignment.areaId) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1.5 md:mt-2 ml-3 md:ml-4 space-y-1.5 md:space-y-2">
                      {assignment.doctors.map((doctor) => {
                        const docPending = hasPendingRequest(assignment.areaId, doctor.id);
                        return (
                          <div key={doctor.id} className="flex items-center justify-between gap-2 p-2 md:p-3 bg-card border rounded-lg">
                            <div className="flex items-center gap-2 md:gap-3">
                              <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-xs md:text-sm">{doctor.name}</p>
                                <p className="text-[10px] md:text-sm text-muted-foreground">{doctor.specialty} • {doctor.area}</p>
                              </div>
                            </div>
                            {docPending ? (
                              <Badge variant="outline" className="text-[10px] text-amber-600">Approval pending</Badge>
                            ) : (
                              <Button variant="ghost" size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (isAdmin) adminDirectDelete(assignment.areaId, doctor.id, user!.id);
                                  else openDeleteRequest(assignment.areaId, assignment.areaName, doctor.id, doctor.name);
                                }}
                                title={isAdmin ? 'Delete doctor' : 'Request to remove this doctor'}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ============= Admin Requests Tab =============
  const AdminRequestsList = () => {
    const pending = adminRequests.filter(r => r.status === 'pending');
    const others = adminRequests.filter(r => r.status !== 'pending');

    const renderRow = (req: DeleteRequest) => {
      const area = areas.find(a => a.id === req.area_id);
      const doctor = req.doctor_id ? doctors.find(d => d.id === req.doctor_id) : null;
      return (
        <div key={req.id} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-medium">
                {area?.area_name || 'Unknown area'} {doctor ? `→ ${doctor.name}` : '(entire area)'}
              </p>
              <p className="text-xs text-muted-foreground">
                Requested by: {requesterMap[req.requested_by] || req.requested_by.slice(0, 8)}
              </p>
              {req.reason && <p className="text-xs mt-1"><span className="font-medium">Reason:</span> {req.reason}</p>}
            </div>
            <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
              {req.status}
            </Badge>
          </div>
          {req.status === 'pending' && (
            <div className="flex gap-2">
              <Button size="sm" variant="default" className="h-7 text-xs"
                onClick={() => reviewRequest(req, 'approved')}>
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => {
                  const note = prompt('Reason for rejection (optional):') || '';
                  reviewRequest(req, 'rejected', note);
                }}>
                <XCircle className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      );
    };

    return (
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <ShieldAlert className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
            Deletion Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-4">
          <div>
            <p className="text-xs font-medium mb-2">Pending ({pending.length})</p>
            {pending.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending requests</p>
            ) : (
              <div className="space-y-2">{pending.map(renderRow)}</div>
            )}
          </div>
          {others.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">History</p>
              <div className="space-y-2">{others.slice(0, 20).map(renderRow)}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Area Wise Doctor Visits" description="Assign doctors to areas for visits" />

      <div className="px-3 py-2 md:px-4 md:py-6 space-y-3 md:space-y-6">
        {isAdmin ? (
          <Tabs defaultValue="my-assignments" className="space-y-3 md:space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-assignments" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" /> My Assignments
              </TabsTrigger>
              <TabsTrigger value="all-mrs" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Users className="h-3.5 w-3.5 md:h-4 md:w-4" /> All MRs
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <ShieldAlert className="h-3.5 w-3.5 md:h-4 md:w-4" /> Requests
                {adminRequests.filter(r => r.status === 'pending').length > 0 && (
                  <Badge variant="destructive" className="text-[9px] h-4 ml-1">
                    {adminRequests.filter(r => r.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-assignments" className="space-y-3 md:space-y-6">
              <AssignmentForm />
              <AssignmentsList />
            </TabsContent>
            <TabsContent value="all-mrs"><MRAreaAssignments /></TabsContent>
            <TabsContent value="requests"><AdminRequestsList /></TabsContent>
          </Tabs>
        ) : (
          <>
            <AssignmentForm />
            <AssignmentsList />
          </>
        )}
      </div>

      {/* Delete Request Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(o) => { if (!o) setDeleteDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Deletion Approval</DialogTitle>
            <DialogDescription>
              {deleteDialog?.doctorId
                ? <>Request to remove <span className="font-medium">{deleteDialog.doctorName}</span> from <span className="font-medium">{deleteDialog.areaName}</span>.</>
                : <>Request to delete the entire assignment for <span className="font-medium">{deleteDialog?.areaName}</span>.</>}
              {' '}An admin must approve before the change is applied.
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason (optional)" value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button onClick={submitDeleteRequest} disabled={submittingRequest}>
              {submittingRequest && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AreaDoctorVisits;
