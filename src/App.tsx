import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./components/auth/AuthPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const Doctors = lazy(() => import("./pages/Doctors"));
const DoctorDetails = lazy(() => import("./pages/DoctorDetails"));
const DoctorIncentive = lazy(() => import("./pages/DoctorIncentive"));
const Distributors = lazy(() => import("./pages/Distributors"));
const DistributorDetails = lazy(() => import("./pages/DistributorDetails"));
const Pharmacies = lazy(() => import("./pages/Pharmacies"));
const Products = lazy(() => import("./pages/Products"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Targets = lazy(() => import("./pages/Targets"));
const MRTargetDetails = lazy(() => import("./pages/MRTargetDetails"));
const Reporting = lazy(() => import("./pages/Reporting"));
const DailyWorking = lazy(() => import("./pages/DailyWorking"));
const MonthlyTourPlan = lazy(() => import("./pages/MonthlyTourPlan"));
const TourPlanRequests = lazy(() => import("./pages/TourPlanRequests"));
const MyPerformance = lazy(() => import("./pages/MyPerformance"));
const CallReports = lazy(() => import("./pages/CallReports"));
const ExpensesReports = lazy(() => import("./pages/ExpensesReports"));
const Master = lazy(() => import("./pages/Master"));
const AddSample = lazy(() => import("./pages/AddSample"));
const AttachDoctorPharmacy = lazy(() => import("./pages/AttachDoctorPharmacy"));
const SalesAndStocks = lazy(() => import("./pages/SalesAndStocks"));
const SecondarySales = lazy(() => import("./pages/SecondarySales"));
const PrimarySales = lazy(() => import("./pages/PrimarySales"));
const AreaDoctorVisits = lazy(() => import("./pages/AreaDoctorVisits"));
const WorkingAreas = lazy(() => import("./pages/WorkingAreas"));
const FinancialYear = lazy(() => import("./pages/FinancialYear"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-64 mx-auto" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

// Component to initialize permissions on app load
const PermissionInitializer = ({ children }: { children: React.ReactNode }) => {
  const { isRequesting } = usePermissions();
  return <>{children}</>;
};

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <PermissionInitializer>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<P><Dashboard /></P>} />
                <Route path="/dashboard/doctors" element={<P><Doctors /></P>} />
                <Route path="/dashboard/doctors/:id" element={<P><DoctorDetails /></P>} />
                <Route path="/dashboard/doctors/:id/incentive" element={<P><DoctorIncentive /></P>} />
                <Route path="/dashboard/distributors" element={<P><Distributors /></P>} />
                <Route path="/dashboard/distributors/:id" element={<P><DistributorDetails /></P>} />
                <Route path="/dashboard/pharmacies" element={<P><Pharmacies /></P>} />
                <Route path="/dashboard/products" element={<P><Products /></P>} />
                <Route path="/dashboard/orders" element={<P><Orders /></P>} />
                <Route path="/dashboard/expenses" element={<P><Expenses /></P>} />
                <Route path="/dashboard/targets" element={<P><Targets /></P>} />
                <Route path="/dashboard/targets/mr/:mrId" element={<P><MRTargetDetails /></P>} />
                <Route path="/dashboard/daily-working" element={<P><DailyWorking /></P>} />
                <Route path="/dashboard/reporting" element={<P><Reporting /></P>} />
                <Route path="/dashboard/tour-plan" element={<P><MonthlyTourPlan /></P>} />
                <Route path="/dashboard/tour-plan-requests" element={<P><TourPlanRequests /></P>} />
                <Route path="/dashboard/my-performance" element={<P><MyPerformance /></P>} />
                <Route path="/dashboard/call-reports" element={<P><CallReports /></P>} />
                <Route path="/dashboard/expenses-reports" element={<P><ExpensesReports /></P>} />
                <Route path="/dashboard/master" element={<P><Master /></P>} />
                <Route path="/dashboard/master/add-sample" element={<P><AddSample /></P>} />
                <Route path="/dashboard/master/attach-doctor-pharmacy" element={<P><AttachDoctorPharmacy /></P>} />
                <Route path="/dashboard/master/sales-and-stocks" element={<P><SalesAndStocks /></P>} />
                <Route path="/dashboard/master/secondary-sales" element={<P><SecondarySales /></P>} />
                <Route path="/dashboard/master/primary-sales" element={<P><PrimarySales /></P>} />
                <Route path="/dashboard/master/area-doctor-visits" element={<P><AreaDoctorVisits /></P>} />
                <Route path="/dashboard/master/working-areas" element={<P><WorkingAreas /></P>} />
                <Route path="/dashboard/financial-year" element={<P><FinancialYear /></P>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </PermissionInitializer>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
