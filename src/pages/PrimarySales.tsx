import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

const PrimarySales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Primary Sales" description="Track primary sales data" />
      
      <div className="px-3 py-2 md:px-4 md:py-8">
        <Card>
          <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-base md:text-lg">Primary Sales</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-muted-foreground text-center py-6 md:py-8 text-xs md:text-sm">
              Primary sales content coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrimarySales;