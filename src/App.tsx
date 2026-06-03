import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { rescheduleAllReminders, initNotificationTapHandler } from "@/lib/deviceNotifications";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./components/auth/AuthPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
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
const MonthlyReports = lazy(() => import("./pages/MonthlyReports"));
const Master = lazy(() => import("./pages/Master"));
const AddSample = lazy(() => import("./pages/AddSample"));
const AttachDoctorPharmacy = lazy(() => import("./pages/AttachDoctorPharmacy"));
const SalesAndStocks = lazy(() => import("./pages/SalesAndStocks"));
const SecondarySales = lazy(() => import("./pages/SecondarySales"));
const PrimarySales = lazy(() => import("./pages/PrimarySales"));
const AreaDoctorVisits = lazy(() => import("./pages/AreaDoctorVisits"));
const WorkingAreas = lazy(() => import("./pages/WorkingAreas"));
const FinancialYear = lazy(() => import("./pages/FinancialYear"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Incentives = lazy(() => import("./pages/Incentives"));
const ProductAnalytics = lazy(() => import("./pages/ProductAnalytics"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Reminders = lazy(() => import("./pages/Reminders"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-64 mx-auto" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

const PermissionInitializer = ({ children }: { children: React.ReactNode }) => {
  const { isRequesting } = usePermissions();
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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Dashboard with nested layout */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="doctors" element={<Doctors />} />
                  <Route path="doctors/:id" element={<DoctorDetails />} />
                  <Route path="doctors/:id/incentive" element={<DoctorIncentive />} />
                  <Route path="distributors" element={<Distributors />} />
                  <Route path="distributors/:id" element={<DistributorDetails />} />
                  <Route path="pharmacies" element={<Pharmacies />} />
                  <Route path="products" element={<Products />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="targets" element={<Targets />} />
                  <Route path="targets/mr/:mrId" element={<MRTargetDetails />} />
                  <Route path="daily-working" element={<DailyWorking />} />
                  <Route path="reporting" element={<Reporting />} />
                  <Route path="tour-plan" element={<MonthlyTourPlan />} />
                  <Route path="tour-plan-requests" element={<TourPlanRequests />} />
                  <Route path="my-performance" element={<MyPerformance />} />
                  <Route path="call-reports" element={<CallReports />} />
                  <Route path="expenses-reports" element={<ExpensesReports />} />
                  <Route path="monthly-reports" element={<MonthlyReports />} />
                  <Route path="master" element={<Master />} />
                  <Route path="master/add-sample" element={<AddSample />} />
                  <Route path="master/attach-doctor-pharmacy" element={<AttachDoctorPharmacy />} />
                  <Route path="master/sales-and-stocks" element={<SalesAndStocks />} />
                  <Route path="master/secondary-sales" element={<SecondarySales />} />
                  <Route path="master/primary-sales" element={<PrimarySales />} />
                  <Route path="master/area-doctor-visits" element={<AreaDoctorVisits />} />
                  <Route path="master/working-areas" element={<WorkingAreas />} />
                  <Route path="purchases" element={<Purchases />} />
                  <Route path="incentives" element={<Incentives />} />
                  <Route path="financial-year" element={<FinancialYear />} />
                  <Route path="product-analytics" element={<ProductAnalytics />} />
                  <Route path="rewards" element={<Rewards />} />
                  <Route path="reminders" element={<Reminders />} />
                </Route>
                
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
