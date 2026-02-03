import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

const SalesAndStocks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Sales And Stocks" description="Manage sales and stock information" />
      
      <div className="px-3 py-2 md:px-4 md:py-8">
        <Card>
          <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                <Package className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <CardTitle className="text-base md:text-lg">Sales And Stocks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-muted-foreground text-center py-6 md:py-8 text-xs md:text-sm">
              Sales and stocks content coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesAndStocks;