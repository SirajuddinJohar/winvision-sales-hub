import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { TrendingUp, Calendar, Building2, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, parse } from 'date-fns';

interface Distributor {
  id: string;
  name: string;
  city: string | null;
}

interface SecondarySalesEntry {
  id: string;
  distributor_id: string;
  sales_month: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  distributor?: Distributor;
}

const SecondarySales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [entries, setEntries] = useState<SecondarySalesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [selectedDistributor, setSelectedDistributor] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch distributors
      const { data: distributorsData, error: distributorsError } = await supabase
        .from('Distributors')
        .select('id, name, city')
        .order('name');
      
      if (distributorsError) throw distributorsError;
      setDistributors(distributorsData || []);
      
      // Fetch existing entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('secondary_sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (entriesError) throw entriesError;
      
      // Map distributor info to entries
      const entriesWithDistributor = (entriesData || []).map(entry => ({
        ...entry,
        distributor: distributorsData?.find(d => d.id === entry.distributor_id)
      }));
      
      setEntries(entriesWithDistributor);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      });
    }
    return options;
  };

  const handleSubmit = async () => {
    if (!selectedDistributor) {
      toast.error('Please select a distributor');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    try {
      setSaving(true);
      
      const salesMonthDate = startOfMonth(parse(selectedMonth, 'yyyy-MM', new Date()));
      
      const { error } = await supabase
        .from('secondary_sales')
        .insert({
          distributor_id: selectedDistributor,
          sales_month: format(salesMonthDate, 'yyyy-MM-dd'),
          description: description || null,
          image_url: imageUrl,
          created_by: user.id
        });
      
      if (error) throw error;
      
      toast.success('Secondary sales entry saved successfully');
      
      // Reset form
      setSelectedDistributor('');
      setDescription('');
      setImageUrl(null);
      
      // Refresh entries
      fetchData();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Secondary Sales" description="Track secondary sales data from distributors" />
      
      <div className="px-3 py-2 md:px-4 md:py-8 space-y-3 md:space-y-6">
        {/* Entry Form */}
        <Card>
          <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-base md:text-lg">Add Secondary Sales Entry</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
            {/* Distributor Selection */}
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="distributor" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Select Distributor
              </Label>
              <Select value={selectedDistributor} onValueChange={setSelectedDistributor}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue placeholder="Choose a distributor" />
                </SelectTrigger>
                <SelectContent>
                  {distributors.map((distributor) => (
                    <SelectItem key={distributor.id} value={distributor.id}>
                      {distributor.name} {distributor.city ? `(${distributor.city})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Selection */}
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="month" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Select Month
              </Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue placeholder="Choose a month" />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="description" className="text-xs md:text-sm">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any notes or description about this sales entry..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Photo Upload */}
            <PhotoUpload
              value={imageUrl || undefined}
              onChange={(url) => setImageUrl(url)}
              label="Sales Image (Optional)"
            />

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={saving || !selectedDistributor}
              className="w-full h-9 md:h-10 text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                  Save Entry
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Previous Entries */}
        <Card>
          <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
            <CardTitle className="text-base md:text-lg">Previous Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-6 md:py-8">
                <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 md:py-8 text-xs md:text-sm">
                No secondary sales entries yet
              </p>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {entries.map((entry) => (
                  <Card key={entry.id} className="bg-muted/50">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                        {entry.image_url && (
                          <img 
                            src={entry.image_url} 
                            alt="Sales" 
                            className="w-full md:w-32 h-24 md:h-32 object-cover rounded-md"
                          />
                        )}
                        <div className="flex-1 space-y-1 md:space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm md:text-base">
                              {entry.distributor?.name || 'Unknown Distributor'}
                            </h4>
                            <span className="text-[10px] md:text-sm text-muted-foreground">
                              {format(new Date(entry.sales_month), 'MMMM yyyy')}
                            </span>
                          </div>
                          {entry.distributor?.city && (
                            <p className="text-xs md:text-sm text-muted-foreground">
                              {entry.distributor.city}
                            </p>
                          )}
                          {entry.description && (
                            <p className="text-xs md:text-sm">{entry.description}</p>
                          )}
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            Added on {format(new Date(entry.created_at), 'dd MMM yyyy, hh:mm a')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecondarySales;