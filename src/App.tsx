import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import Index from "./pages/Index";
import AuthPage from "./components/auth/AuthPage";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Doctors from "./pages/Doctors";
import DoctorDetails from "./pages/DoctorDetails";
import DoctorIncentive from "./pages/DoctorIncentive";
import Distributors from "./pages/Distributors";
import DistributorDetails from "./pages/DistributorDetails";
import Pharmacies from "./pages/Pharmacies";
import Products from "./pages/Products";
import Expenses from "./pages/Expenses";
import Targets from "./pages/Targets";
import MRTargetDetails from "./pages/MRTargetDetails";
import Reporting from "./pages/Reporting";
import DailyWorking from "./pages/DailyWorking";
import MonthlyTourPlan from "./pages/MonthlyTourPlan";
import TourPlanRequests from "./pages/TourPlanRequests";
import MyPerformance from "./pages/MyPerformance";
import CallReports from "./pages/CallReports";
import ExpensesReports from "./pages/ExpensesReports";
import Master from "./pages/Master";
import AddSample from "./pages/AddSample";
import AttachDoctorPharmacy from "./pages/AttachDoctorPharmacy";
import SalesAndStocks from "./pages/SalesAndStocks";
import SecondarySales from "./pages/SecondarySales";
import PrimarySales from "./pages/PrimarySales";
import AreaDoctorVisits from "./pages/AreaDoctorVisits";
import WorkingAreas from "./pages/WorkingAreas";
import FinancialYear from "./pages/FinancialYear";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to initialize permissions on app load
const PermissionInitializer = ({ children }: { children: React.ReactNode }) => {
  const { isRequesting } = usePermissions();
  
  // Permissions are requested automatically in usePermissions hook
  // We just render children - no loading state needed
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <PermissionInitializer>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/doctors" element={<Doctors />} />
              <Route path="/dashboard/doctors/:id" element={<DoctorDetails />} />
              <Route path="/dashboard/doctors/:id/incentive" element={<DoctorIncentive />} />
              <Route path="/dashboard/distributors" element={<Distributors />} />
              <Route path="/dashboard/distributors/:id" element={<DistributorDetails />} />
              <Route path="/dashboard/pharmacies" element={<Pharmacies />} />
              <Route path="/dashboard/products" element={<Products />} />
              <Route path="/dashboard/orders" element={<Orders />} />
              <Route path="/dashboard/expenses" element={<Expenses />} />
              <Route path="/dashboard/targets" element={<Targets />} />
              <Route path="/dashboard/targets/mr/:mrId" element={<MRTargetDetails />} />
              <Route path="/dashboard/daily-working" element={<DailyWorking />} />
              <Route path="/dashboard/reporting" element={<Reporting />} />
              <Route path="/dashboard/tour-plan" element={<MonthlyTourPlan />} />
              <Route path="/dashboard/tour-plan-requests" element={<TourPlanRequests />} />
              <Route path="/dashboard/my-performance" element={<MyPerformance />} />
              <Route path="/dashboard/call-reports" element={<CallReports />} />
              <Route path="/dashboard/expenses-reports" element={<ExpensesReports />} />
              <Route path="/dashboard/master" element={<Master />} />
              <Route path="/dashboard/master/add-sample" element={<AddSample />} />
              <Route path="/dashboard/master/attach-doctor-pharmacy" element={<AttachDoctorPharmacy />} />
              <Route path="/dashboard/master/sales-and-stocks" element={<SalesAndStocks />} />
              <Route path="/dashboard/master/secondary-sales" element={<SecondarySales />} />
              <Route path="/dashboard/master/primary-sales" element={<PrimarySales />} />
              <Route path="/dashboard/master/area-doctor-visits" element={<AreaDoctorVisits />} />
              <Route path="/dashboard/master/working-areas" element={<WorkingAreas />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </PermissionInitializer>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
