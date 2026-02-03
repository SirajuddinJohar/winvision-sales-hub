import { useParams } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee } from 'lucide-react';

const DoctorIncentive = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Incentive" />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        <Card>
          <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                <IndianRupee className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <CardTitle className="text-base md:text-lg">Incentive Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-muted-foreground text-center py-6 md:py-8 text-xs md:text-sm">
              Incentive details will be displayed here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorIncentive;