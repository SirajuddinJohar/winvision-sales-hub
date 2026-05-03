import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import { FileText, DollarSign, BarChart3 } from 'lucide-react';

const MyPerformance = () => {
  const navigate = useNavigate();

  const cards = [
    {
      icon: FileText,
      title: 'Call Reports',
      description: 'View detailed reports of your daily doctor and pharmacy calls',
      cta: 'See Call Reports',
      to: '/dashboard/call-reports',
    },
    {
      icon: DollarSign,
      title: 'Expenses Reports',
      description: 'Track and analyze your monthly expenses',
      cta: 'See Expenses Reports',
      to: '/dashboard/expenses-reports',
    },
    {
      icon: BarChart3,
      title: 'Monthly Reports',
      description: 'View your monthly targets, calls, orders & achievements',
      cta: 'See Monthly Reports',
      to: '/dashboard/monthly-reports',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="My Performance" description="View your call reports, expenses and monthly performance" />
      <div className="px-3 py-2 md:p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {cards.map(({ icon: Icon, title, description, cta, to }) => (
            <Card key={title} className="p-6 md:p-8 hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center space-y-3 md:space-y-4">
                <div className="p-3 md:p-4 bg-primary/10 rounded-full">
                  <Icon className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
                <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
                <Button
                  onClick={() => navigate(to)}
                  className="w-full h-10 md:h-auto text-sm md:text-base"
                  size="lg"
                >
                  {cta}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyPerformance;
