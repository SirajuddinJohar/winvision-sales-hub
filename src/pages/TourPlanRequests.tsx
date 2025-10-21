import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/layout/PageHeader';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface EditRequest {
  id: string;
  tour_plan_id: string;
  user_id: string;
  request_reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  admin_remarks?: string;
  users: {
    name: string;
    email: string;
  };
  tour_plans: {
    month: number;
    year: number;
  };
}

const TourPlanRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [loading, setLoading] = useState(true);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tour_plan_edit_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching requests', variant: 'destructive' });
      setRequests([]);
    } else {
      // Fetch user and tour plan data separately
      const enrichedData = await Promise.all(
        (data || []).map(async (request) => {
          const { data: userData } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', request.user_id)
            .single();
          
          const { data: planData } = await supabase
            .from('tour_plans')
            .select('month, year')
            .eq('id', request.tour_plan_id)
            .single();
          
          return {
            ...request,
            users: userData || { name: 'Unknown', email: 'unknown@example.com' },
            tour_plans: planData || { month: 1, year: 2025 }
          };
        })
      );
      setRequests(enrichedData as any);
    }
    setLoading(false);
  };

  const handleOpenModal = (request: EditRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminRemarks('');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedRequest) return;

    const updates: any = {
      status: actionType === 'approve' ? 'approved' : 'rejected',
      admin_id: user?.id,
      admin_remarks: adminRemarks,
      admin_response_at: new Date().toISOString()
    };

    const { error: requestError } = await supabase
      .from('tour_plan_edit_requests')
      .update(updates)
      .eq('id', selectedRequest.id);

    if (requestError) {
      toast({ title: 'Error updating request', variant: 'destructive' });
      return;
    }

    // If approved, unlock the tour plan
    if (actionType === 'approve') {
      const { error: planError } = await supabase
        .from('tour_plans')
        .update({ 
          status: 'draft',
          locked_at: null
        })
        .eq('id', selectedRequest.tour_plan_id);

      if (planError) {
        toast({ title: 'Error unlocking plan', variant: 'destructive' });
        return;
      }
    }

    toast({ 
      title: `Request ${actionType === 'approve' ? 'approved' : 'rejected'}`,
      description: actionType === 'approve' ? 'User can now edit their plan' : 'Request has been rejected'
    });

    setIsModalOpen(false);
    fetchRequests();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Tour Plan Edit Requests" description="Manage edit requests from users" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Tour Plan Edit Requests" description="Manage edit requests from users" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Month/Year</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No edit requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.users.name}</div>
                      <div className="text-sm text-muted-foreground">{request.users.email}</div>
                    </TableCell>
                    <TableCell>
                      {monthNames[request.tour_plans.month - 1]} {request.tour_plans.year}
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.requested_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleOpenModal(request, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleOpenModal(request, 'reject')}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {request.status !== 'pending' && request.admin_remarks && (
                        <div className="text-sm text-muted-foreground">
                          {request.admin_remarks}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Action Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Edit Request' : 'Reject Edit Request'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRequest && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm">
                  <strong>User:</strong> {selectedRequest.users.name}
                </div>
                <div className="text-sm">
                  <strong>Period:</strong> {monthNames[selectedRequest.tour_plans.month - 1]} {selectedRequest.tour_plans.year}
                </div>
              </div>
            )}

            <div>
              <Label>Admin Remarks</Label>
              <Textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Add remarks for this decision..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TourPlanRequests;