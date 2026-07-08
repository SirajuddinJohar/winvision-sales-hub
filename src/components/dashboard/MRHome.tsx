import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/layout/PageHeader";
import DataState from "@/components/layout/DataState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Bell,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  MapPin,
  ChevronRight,
  Target,
  IndianRupee,
} from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;

const fetchMRHome = async (userId: string) => {
  const today = todayISO();
  const [plan, reminders, myOrders, myTargets] = await Promise.all([
    supabase
      .from("daily_working_setup")
      .select("id, area_id, planned_doctors, areas(name)")
      .eq("mr_id", userId)
      .eq("work_date", today)
      .maybeSingle(),
    supabase
      .from("reminders")
      .select("id, title, remind_time, source, link, entity_type")
      .eq("user_id", userId)
      .eq("remind_date", today)
      .eq("status", "pending")
      .order("remind_time", { ascending: true })
      .limit(5),
    supabase
      .from("orders")
      .select("total_amount, order_date")
      .eq("mr_id", userId)
      .gte("order_date", monthStart()),
    supabase
      .from("targets")
      .select("target_value, achieved_value, target_month")
      .eq("mr_id", userId),
  ]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentTargets =
    myTargets.data?.filter((t) => t.target_month?.slice(0, 7) === currentMonth) ?? [];
  const totalTarget = currentTargets.reduce((s, t) => s + Number(t.target_value || 0), 0);
  const totalAchieved = currentTargets.reduce((s, t) => s + Number(t.achieved_value || 0), 0);
  const monthRevenue =
    myOrders.data?.reduce((s, o) => s + Number(o.total_amount || 0), 0) ?? 0;

  return {
    plan: plan.data,
    reminders: reminders.data ?? [],
    monthRevenue,
    orderCount: myOrders.data?.length ?? 0,
    targetPct: totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0,
  };
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const MRHome = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["mr-home", user?.id],
    queryFn: () => fetchMRHome(user!.id),
    enabled: !!user?.id,
  });

  const quickActions = [
    { icon: ClipboardList, label: "Daily Working", path: "/dashboard/daily-working", color: "bg-primary/10 text-primary" },
    { icon: ShoppingCart, label: "New Order", path: "/dashboard/orders", color: "bg-accent/10 text-accent" },
    { icon: Receipt, label: "Add Expense", path: "/dashboard/expenses", color: "bg-warning/10 text-warning" },
    { icon: Package, label: "Add Sample", path: "/dashboard/master/add-sample", color: "bg-success/10 text-success" },
    { icon: Users, label: "Doctors", path: "/dashboard/doctors", color: "bg-info/10 text-info" },
    { icon: Bell, label: "Reminders", path: "/dashboard/reminders", color: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={`Hi, ${profile?.name?.split(" ")[0] ?? "there"}`}
        description={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      />

      <div className="px-3 py-2 md:p-6 space-y-4 md:space-y-6">
        {/* Snapshot stats */}
        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee className="h-3.5 w-3.5 text-success" />
                <span className="text-[10px] md:text-xs uppercase tracking-wide text-muted-foreground font-semibold">This month</span>
              </div>
              <div className="text-base md:text-2xl font-bold">{formatINR(data?.monthRevenue ?? 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-3.5 w-3.5 text-accent" />
                <span className="text-[10px] md:text-xs uppercase tracking-wide text-muted-foreground font-semibold">Orders</span>
              </div>
              <div className="text-base md:text-2xl font-bold">{data?.orderCount ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] md:text-xs uppercase tracking-wide text-muted-foreground font-semibold">Target</span>
              </div>
              <div className="text-base md:text-2xl font-bold">{data?.targetPct ?? 0}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Today's plan */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="p-3 md:p-6 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Today's Working Area
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard/daily-working")}>
              Open <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <DataState loading={isLoading} error={error} empty={!data?.plan} emptyTitle="No plan for today" emptyDescription="Set up your working area in Daily Working." emptyAction={<Button size="sm" onClick={() => navigate("/dashboard/daily-working")}>Set up now</Button>}>
              {data?.plan && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm md:text-base">
                      {(data.plan as any).areas?.name ?? "Area"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(data.plan.planned_doctors ?? []).length} doctors planned
                    </p>
                  </div>
                  <Badge variant="default">Today</Badge>
                </div>
              )}
            </DataState>
          </CardContent>
        </Card>

        {/* Today's reminders */}
        <Card className="border-l-4 border-l-info">
          <CardHeader className="p-3 md:p-6 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-info" />
              Today's Reminders
              {(data?.reminders.length ?? 0) > 0 && (
                <Badge variant="secondary">{data?.reminders.length}</Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard/reminders")}>
              All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <DataState loading={isLoading} error={error} empty={(data?.reminders.length ?? 0) === 0} emptyTitle="Nothing due today" emptyDescription="You're all caught up.">
              <div className="space-y-2">
                {data?.reminders.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => r.link ? navigate(r.link) : navigate("/dashboard/reminders")}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{r.source?.replace("_", " ")}</div>
                    </div>
                    {r.remind_time && (
                      <Badge variant="outline" className="shrink-0">
                        {String(r.remind_time).slice(0, 5)}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </DataState>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="grid grid-cols-3 gap-2.5">
              {quickActions.map((a) => (
                <button
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-start gap-2 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={`p-2 rounded-lg ${a.color}`}>
                    <a.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MRHome;
