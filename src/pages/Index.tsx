import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Building2, Users, Package, BarChart3, ArrowRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: Users,
      title: 'Doctor Management',
      description: 'Manage doctor profiles, specialties, and monthly targets'
    },
    {
      icon: Package,
      title: 'Product Catalog',
      description: 'Track pharmaceutical products and inventory'
    },
    {
      icon: BarChart3,
      title: 'Sales Analytics',
      description: 'Monitor performance and target achievements'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <Building2 className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6">
            Winvision
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Professional pharmaceutical management system for administrators and medical representatives
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button 
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => navigate('/auth')}
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button 
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 bg-white/95 backdrop-blur-sm border-0 shadow-xl">
              <div className="text-center">
                <div className="p-3 rounded-lg bg-primary-light inline-block mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
