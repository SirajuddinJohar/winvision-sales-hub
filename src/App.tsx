import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AuthPage from "./components/auth/AuthPage";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Doctors from "./pages/Doctors";
import Distributors from "./pages/Distributors";
import Pharmacies from "./pages/Pharmacies";
import Products from "./pages/Products";
import Expenses from "./pages/Expenses";
import Targets from "./pages/Targets";
import Reporting from "./pages/Reporting";
import DailyWorking from "./pages/DailyWorking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/doctors" element={<Doctors />} />
            <Route path="/dashboard/distributors" element={<Distributors />} />
            <Route path="/dashboard/pharmacies" element={<Pharmacies />} />
            <Route path="/dashboard/products" element={<Products />} />
            <Route path="/dashboard/orders" element={<Orders />} />
            <Route path="/dashboard/expenses" element={<Expenses />} />
            <Route path="/dashboard/targets" element={<Targets />} />
            <Route path="/dashboard/daily-working" element={<DailyWorking />} />
            <Route path="/dashboard/reporting" element={<Reporting />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
