import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Building, MapPin, Phone, Edit, Trash2, Search, ShoppingCart, Clock, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import PharmacyForm from '@/components/pharmacies/PharmacyForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PageHeader from '@/components/layout/PageHeader';

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
  last_order_date?: string;
  last_order_amount?: number;
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
        .order('last_order_date', { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;

      setPharmacies(data || []);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getDaysSinceLastOrder = (lastOrderDate?: string): number | null => {
    if (!lastOrderDate) return null;
    const today = new Date();
    const lastOrder = new Date(lastOrderDate);
    const diffTime = Math.abs(today.getTime() - lastOrder.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Pharmacies" 
        description="Manage pharmacy information and contacts"
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        <div className="flex justify-end">
          <Button onClick={handleAddPharmacy} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
            <Plus className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
            Add Pharmacy
          </Button>
        </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
        <Input
          placeholder="Search pharmacies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 md:pl-10 h-9 md:h-10 text-sm"
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
        <div className="grid gap-2.5 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPharmacies.map((pharmacy) => (
            <Card key={pharmacy.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                      <Building className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm md:text-lg truncate">{pharmacy.name}</CardTitle>
                      <CardDescription className="text-xs md:text-sm truncate">{pharmacy.contact_person}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 md:pt-0 space-y-2 md:space-y-4">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs md:text-sm">{pharmacy.city}</span>
                </div>
                
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs md:text-sm">{pharmacy.phone}</span>
                </div>

                {(pharmacy.dl_number_part1 || pharmacy.dl_number_part2) && (
                  <div className="text-xs md:text-sm">
                    <span className="text-muted-foreground">DL: </span>
                    {pharmacy.dl_number_part1}{pharmacy.dl_number_part2 ? `-${pharmacy.dl_number_part2}` : ''}
                  </div>
                )}

                {pharmacy.last_order_date && (
                  <div className="space-y-1.5 md:space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm">
                        Last: {new Date(pharmacy.last_order_date).toLocaleDateString()}
                      </span>
                    </div>
                    {pharmacy.last_order_amount && (
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs md:text-sm">
                          {formatCurrency(pharmacy.last_order_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] md:text-xs text-muted-foreground">
                        {getDaysSinceLastOrder(pharmacy.last_order_date)} days ago
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t flex justify-between items-center">
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    Added: {new Date(pharmacy.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-1.5 md:gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditPharmacy(pharmacy)}
                      className="h-7 w-7 md:h-8 md:w-8 p-0"
                    >
                      <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </Button>
                    {profile?.role === 'admin' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePharmacy(pharmacy.id)}
                        className="h-7 w-7 md:h-8 md:w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
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
    </div>
  );
};

export default Pharmacies;