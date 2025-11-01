import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import { FileText, DollarSign } from 'lucide-react';

const MyPerformance = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="My Performance" description="View your call reports and expenses" />
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Call Reports</h2>
              <p className="text-muted-foreground">
                View detailed reports of your daily doctor and pharmacy calls
              </p>
              <Button 
                onClick={() => navigate('/dashboard/call-reports')}
                className="w-full"
                size="lg"
              >
                See Call Reports
              </Button>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <DollarSign className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Expenses Reports</h2>
              <p className="text-muted-foreground">
                Track and analyze your monthly expenses
              </p>
              <Button 
                onClick={() => navigate('/dashboard/expenses-reports')}
                className="w-full"
                size="lg"
              >
                See Expenses Reports
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyPerformance;
