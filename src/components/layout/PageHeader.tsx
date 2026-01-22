import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageHeaderProps {
  title: string;
  description?: string;
}

const PageHeader = ({ title, description }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border shadow-sm mb-3 md:mb-6">
      <div className="flex items-center justify-between px-3 md:px-6 py-2.5 md:py-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            {description && (
              <p className="text-xs md:text-sm text-muted-foreground font-medium mt-0.5">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-110"
            title="Home"
          >
            <Home className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-110"
              >
                <User className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-lg">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-foreground">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  <p className="text-xs text-primary font-bold mt-1">
                    {profile?.role === 'admin' ? 'Administrator' : 'Medical Rep'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="font-medium">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
