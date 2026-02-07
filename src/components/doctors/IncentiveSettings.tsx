import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Percent } from 'lucide-react';

interface IncentiveSettingsProps {
  doctorId: string;
  currentPercentage: number;
  onUpdate: () => void;
}

const IncentiveSettings = ({ doctorId, currentPercentage, onUpdate }: IncentiveSettingsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [percentage, setPercentage] = useState(currentPercentage);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    setPercentage(currentPercentage);
  }, [currentPercentage]);

  const handleSave = async () => {
    if (percentage < 0 || percentage > 100) {
      toast({
        title: "Invalid percentage",
        description: "Percentage must be between 0 and 100",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('doctors')
        .update({ incentive_percentage: percentage })
        .eq('id', doctorId);

      if (error) throw error;

      toast({ title: "Incentive percentage updated successfully" });
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating incentive percentage:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update percentage",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
            <Settings className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm md:text-lg">Incentive Settings</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Configure incentive percentage for this doctor
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
        {isEditing ? (
          <div className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Incentive Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="h-9 md:h-10 text-sm w-24"
                />
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                This percentage will be applied to all new orders for this doctor
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading}
                className="h-8 md:h-9 text-xs md:text-sm"
              >
                {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPercentage(currentPercentage);
                  setIsEditing(false);
                }}
                className="h-8 md:h-9 text-xs md:text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Current Percentage</p>
              <p className="text-xl md:text-2xl font-bold text-primary">{currentPercentage}%</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="h-8 md:h-9 text-xs md:text-sm"
            >
              Change
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IncentiveSettings;
