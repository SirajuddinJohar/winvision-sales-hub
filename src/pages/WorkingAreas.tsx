import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { MapPin, Trash2, Search, User, ArrowLeft } from 'lucide-react';

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
    </div>
  );
};

export default WorkingAreas;
