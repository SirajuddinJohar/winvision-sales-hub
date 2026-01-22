import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Truck, MapPin, Phone, Edit, Trash2, Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import DistributorForm from '@/components/distributors/DistributorForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PageHeader from '@/components/layout/PageHeader';

interface Distributor {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  city: string;
  address: string;
  created_at: string;
}

const Distributors = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [filteredDistributors, setFilteredDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDistributors();
  }, [profile]);

  useEffect(() => {
    // Filter distributors based on search query
    const filtered = distributors.filter(distributor =>
      distributor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      distributor.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      distributor.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      distributor.phone.includes(searchQuery)
    );
    setFilteredDistributors(filtered);
  }, [distributors, searchQuery]);

  const fetchDistributors = async () => {
    try {
      let query = supabase
        .from('Distributors')
        .select('*')
        .order('name');

      const { data, error } = await query;

      if (error) throw error;

      setDistributors(data || []);
    } catch (error) {
      console.error('Error fetching distributors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDistributor = () => {
    setEditingDistributor(null);
    setShowForm(true);
  };

  const handleEditDistributor = (distributor: Distributor) => {
    setEditingDistributor(distributor);
    setShowForm(true);
  };

  const handleDeleteDistributor = async (distributorId: string) => {
    if (!confirm('Are you sure you want to delete this distributor?')) return;

    try {
      const { error } = await supabase
        .from('Distributors')
        .delete()
        .eq('id', distributorId);

      if (error) throw error;

      toast({ title: "Distributor deleted successfully" });
      fetchDistributors();
    } catch (error) {
      console.error('Error deleting distributor:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete distributor", 
        variant: "destructive" 
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDistributor(null);
    fetchDistributors();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingDistributor(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Distributors" 
        description="Manage your distributor network and contacts"
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        {profile?.role === 'admin' && (
          <div className="flex justify-end">
            <Button onClick={handleAddDistributor} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
              <Plus className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
              Add Distributor
            </Button>
          </div>
        )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
        <Input
          placeholder="Search distributors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 md:pl-10 h-9 md:h-10 text-sm"
        />
      </div>

      {filteredDistributors.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No distributors found matching your search' : 'No distributors found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2.5 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDistributors.map((distributor) => (
            <Card 
              key={distributor.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/dashboard/distributors/${distributor.id}`)}
            >
              <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                      <Truck className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm md:text-lg truncate">{distributor.name}</CardTitle>
                      <CardDescription className="text-xs md:text-sm truncate">{distributor.contact_person}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 md:pt-0 space-y-2 md:space-y-4">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs md:text-sm">{distributor.city}</span>
                </div>
                
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs md:text-sm">{distributor.phone}</span>
                </div>

                <div className="text-xs md:text-sm text-muted-foreground">
                  <p className="line-clamp-2">{distributor.address}</p>
                </div>

                {profile?.role === 'admin' && (
                  <div className="pt-2 border-t flex justify-between items-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      Added: {new Date(distributor.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-1.5 md:gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditDistributor(distributor)}
                        className="h-7 w-7 md:h-8 md:w-8 p-0"
                      >
                        <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDistributor(distributor.id)}
                        className="h-7 w-7 md:h-8 md:w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DistributorForm
            distributor={editingDistributor}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default Distributors;