import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Building, MapPin, Phone, Edit, Trash2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import PharmacyForm from '@/components/pharmacies/PharmacyForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Pharmacy {
  id: string;
  name: string;
  contact_person: string;
  dl_number_part1: string;
  dl_number_part2: string;
  phone: string;
  city: string;
  address: string;
  gstin?: string;
  created_at: string;
}

const Pharmacies = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filteredPharmacies, setFilteredPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPharmacies();
  }, [profile]);

  useEffect(() => {
    // Filter pharmacies based on search query
    const filtered = pharmacies.filter(pharmacy =>
      pharmacy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pharmacy.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pharmacy.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pharmacy.phone.includes(searchQuery)
    );
    setFilteredPharmacies(filtered);
  }, [pharmacies, searchQuery]);

  const fetchPharmacies = async () => {
    try {
      let query = supabase
        .from('pharmacies')
        .select('*')
        .order('name');

      const { data, error } = await query;

      if (error) throw error;

      setPharmacies(data || []);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPharmacy = () => {
    setEditingPharmacy(null);
    setShowForm(true);
  };

  const handleEditPharmacy = (pharmacy: Pharmacy) => {
    setEditingPharmacy(pharmacy);
    setShowForm(true);
  };

  const handleDeletePharmacy = async (pharmacyId: string) => {
    if (!confirm('Are you sure you want to delete this pharmacy?')) return;

    try {
      const { error } = await supabase
        .from('pharmacies')
        .delete()
        .eq('id', pharmacyId);

      if (error) throw error;

      toast({ title: "Pharmacy deleted successfully" });
      fetchPharmacies();
    } catch (error) {
      console.error('Error deleting pharmacy:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete pharmacy", 
        variant: "destructive" 
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPharmacy(null);
    fetchPharmacies();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingPharmacy(null);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pharmacies</h1>
          <p className="text-muted-foreground">
            Manage pharmacy information and contacts
          </p>
        </div>
        <Button onClick={handleAddPharmacy}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pharmacy
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search pharmacies by name, city, contact person, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredPharmacies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No pharmacies found matching your search' : 'No pharmacies found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPharmacies.map((pharmacy) => (
            <Card key={pharmacy.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{pharmacy.name}</CardTitle>
                      <CardDescription>{pharmacy.contact_person}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{pharmacy.city}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{pharmacy.phone}</span>
                </div>

                {(pharmacy.dl_number_part1 || pharmacy.dl_number_part2) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">DL No: </span>
                    {pharmacy.dl_number_part1}{pharmacy.dl_number_part2 ? `-${pharmacy.dl_number_part2}` : ''}
                  </div>
                )}

                <div className="pt-2 border-t flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Added: {new Date(pharmacy.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditPharmacy(pharmacy)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {profile?.role === 'admin' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePharmacy(pharmacy.id)}
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
          <PharmacyForm
            pharmacy={editingPharmacy}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pharmacies;