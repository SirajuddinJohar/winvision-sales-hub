import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PrescriptionData {
  id: string;
  product_id: string;
  frequency_count: number;
  last_prescribed_date: string | null;
  products: {
    name: string;
    category: string;
  };
}

interface PrescriptionTrackingProps {
  doctorId: string;
}

const PrescriptionTracking = ({ doctorId }: PrescriptionTrackingProps) => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrescriptions();
  }, [doctorId]);

  const fetchPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('prescription_tracking')
        .select(`
          *,
          products (
            name,
            category
          )
        `)
        .eq('doctor_id', doctorId)
        .order('frequency_count', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Prescription Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Prescription Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {prescriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No prescription data yet
          </p>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{prescription.products.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {prescription.products.category}
                    </Badge>
                  </div>
                  {prescription.last_prescribed_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last: {new Date(prescription.last_prescribed_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{prescription.frequency_count}x</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrescriptionTracking;