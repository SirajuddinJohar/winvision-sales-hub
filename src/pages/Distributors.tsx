import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Truck, MapPin, Phone, Edit, Trash2, Search } from 'lucide-react';
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
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={handleAddDistributor}>
            <Plus className="mr-2 h-4 w-4" />
            Add Distributor
          </Button>
        </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search distributors by name, city, contact person, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDistributors.map((distributor) => (
            <Card key={distributor.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{distributor.name}</CardTitle>
                      <CardDescription>{distributor.contact_person}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{distributor.city}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{distributor.phone}</span>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="line-clamp-2">{distributor.address}</p>
                </div>

                <div className="pt-2 border-t flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Added: {new Date(distributor.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditDistributor(distributor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {profile?.role === 'admin' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDistributor(distributor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
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