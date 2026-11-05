import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Download,
  FileSpreadsheet,
  Users,
  Building,
  Truck,
  Package,
  ShoppingCart,
  ListChecks,
  ClipboardList,
  CalendarRange,
  CalendarOff,
  Receipt,
  Wallet,
  IndianRupee,
  Gift,
  Bell,
  UserCog,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { deliverExcel, ExcelSheet, todayStamp } from '@/lib/excelExport';

type Row = Record<string, any>;

interface DatasetDef {
  key: string;
  label: string;
  icon: React.ElementType;
  fetch: (lk: Lookups) => Promise<Row[]>;
}

interface Lookups {
  users: Map<string, string>;
  doctors: Map<string, string>;
  distributors: Map<string, string>;
  products: Map<string, string>;
  areas: Map<string, string>;
  campaigns: Map<string, string>;
  orders: Map<string, { date: string; mr: string }>;
}

const nameMap = (rows: any[] | null, key: string) =>
  new Map<string, string>((rows || []).map((r) => [r.id, r[key] ?? '']));

/** Name lookups are fetched once and joined in code, so the export never
 *  depends on which foreign keys exist in the database. */
const fetchLookups = async (): Promise<Lookups> => {
  const [users, doctors, distributors, products, areas, campaigns, orders] =
    await Promise.all([
      supabase.from('users').select('id, name'),
      supabase.from('doctors').select('id, name'),
      supabase.from('Distributors').select('id, name'),
      supabase.from('products').select('id, name'),
      supabase.from('areas').select('id, area_name'),
      supabase.from('reward_campaigns').select('id, name'),
      supabase.from('orders').select('id, order_date, mr_id'),
    ]);
  const firstError = [users, doctors, distributors, products, areas, campaigns, orders]
    .map((r) => r.error)
    .find(Boolean);
  if (firstError) throw firstError;
  return {
    users: nameMap(users.data, 'name'),
    doctors: nameMap(doctors.data, 'name'),
    distributors: nameMap(distributors.data, 'name'),
    products: nameMap(products.data, 'name'),
    areas: nameMap(areas.data, 'area_name'),
    campaigns: nameMap(campaigns.data, 'name'),
    orders: new Map(
      (orders.data || []).map((o) => [
        o.id,
        { date: o.order_date ?? '', mr: o.mr_id ?? '' },
      ]),
    ),
  };
};

const dt = (v: string) => (v ? v.slice(0, 16).replace('T', ' ') : '');

const DATASETS: DatasetDef[] = [
  {
    key: 'doctors',
    label: 'Doctors',
    icon: Users,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('doctors')
        .select(
          'name, specialty, area, territory, phone, address, birthday, anniversary, monthly_target, incentive_percentage, relationship_score, last_visit_date, notes, created_at, assigned_mr_id',
        )
        .order('name');
      if (error) throw error;
      return (data || []).map((r) => ({
        Name: r.name,
        Specialty: r.specialty,
        Area: r.area,
        Territory: r.territory,
        Phone: r.phone,
        Address: r.address,
        Birthday: r.birthday,
        Anniversary: r.anniversary,
        'Monthly Target': r.monthly_target,
        'Incentive %': r.incentive_percentage,
        'Relationship Score': r.relationship_score,
        'Last Visit': r.last_visit_date,
        Notes: r.notes,
        'Assigned MR': lk.users.get(r.assigned_mr_id) ?? '',
        Created: r.created_at?.slice(0, 10),
      }));
    },
  },
  {
    key: 'pharmacies',
    label: 'Pharmacies',
    icon: Building,
    fetch: async () => {
      const { data, error } = await supabase
        .from('pharmacies')
        .select(
          'name, contact_person, dl_number_part1, dl_number_part2, phone, city, address, gstin, last_order_date, last_order_amount, created_at',
        )
        .order('name');
      if (error) throw error;
      return (data || []).map((r) => ({
        Name: r.name,
        'Contact Person': r.contact_person,
        Phone: r.phone,
        City: r.city,
        Address: r.address,
        GSTIN: r.gstin,
        'DL Number': `${r.dl_number_part1 ?? ''} ${r.dl_number_part2 ?? ''}`.trim(),
        'Last Order Date': r.last_order_date,
        'Last Order Amount': r.last_order_amount,
        Created: r.created_at?.slice(0, 10),
      }));
    },
  },
  {
    key: 'distributors',
    label: 'Distributors',
    icon: Truck,
    fetch: async () => {
      const { data, error } = await supabase
        .from('Distributors')
        .select(
          'name, contact_person, phone, city, address, gstin, dl_number_part1, dl_number_part2, created_at',
        )
        .order('name');
      if (error) throw error;
      return (data || []).map((r) => ({
        Name: r.name,
        'Contact Person': r.contact_person,
        Phone: r.phone,
        City: r.city,
        Address: r.address,
        GSTIN: r.gstin,
        'DL Number': `${r.dl_number_part1 ?? ''} ${r.dl_number_part2 ?? ''}`.trim(),
        Created: r.created_at?.slice(0, 10),
      }));
    },
  },
  {
    key: 'products',
    label: 'Products',
    icon: Package,
    fetch: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name, category, product_type, price, stock, description, created_at')
        .order('name');
      if (error) throw error;
      return (data || []).map((r) => ({
        Name: r.name,
        Category: r.category,
        Type: r.product_type,
        Price: r.price,
        Stock: r.stock,
        Description: r.description,
        Created: r.created_at?.slice(0, 10),
      }));
    },
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: ShoppingCart,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'order_date, quantity, unit_price, total_amount, scheme, mr_id, doctor_id, pharmacy_id, product_id, created_at',
        )
        .order('order_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Date: r.order_date,
        MR: lk.users.get(r.mr_id) ?? '',
        Doctor: lk.doctors.get(r.doctor_id) ?? '',
        Pharmacy: lk.distributors.get(r.pharmacy_id) ?? '',
        Product: lk.products.get(r.product_id) ?? '',
        Qty: r.quantity,
        'Unit Price': r.unit_price,
        Total: r.total_amount,
        Scheme: r.scheme,
      }));
    },
  },
  {
    key: 'order_items',
    label: 'Order Items',
    icon: ListChecks,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('order_items')
        .select('order_id, quantity, unit_price, total_amount, scheme, product_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => {
        const order = lk.orders.get(r.order_id);
        return {
          Date: order?.date ?? '',
          MR: lk.users.get(order?.mr ?? '') ?? '',
          Product: lk.products.get(r.product_id) ?? '',
          Qty: r.quantity,
          'Unit Price': r.unit_price,
          Total: r.total_amount,
          Scheme: r.scheme,
        };
      });
    },
  },
  {
    key: 'daily_working',
    label: 'Daily Working',
    icon: ClipboardList,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('daily_working')
        .select('work_date, sample_details, order_details, location, mr_id, doctor_id, distributor_id, created_at')
        .order('work_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Date: r.work_date,
        MR: lk.users.get(r.mr_id) ?? '',
        Doctor: lk.doctors.get(r.doctor_id) ?? '',
        Distributor: lk.distributors.get(r.distributor_id) ?? '',
        Samples: r.sample_details ? JSON.stringify(r.sample_details) : '',
        'Order Details': r.order_details ? JSON.stringify(r.order_details) : '',
        'GPS Location': r.location ? JSON.stringify(r.location) : '',
      }));
    },
  },
  {
    key: 'daily_working_setup',
    label: 'Working Setup',
    icon: CalendarRange,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('daily_working_setup')
        .select('work_date, work_type, working_with, selected_areas, mr_id')
        .order('work_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Date: r.work_date,
        MR: lk.users.get(r.mr_id) ?? '',
        'Work Type': r.work_type,
        'Working With': r.working_with,
        Areas: r.selected_areas ? JSON.stringify(r.selected_areas) : '',
      }));
    },
  },
  {
    key: 'area_doctor_visits',
    label: 'Area Doctor Visits',
    icon: CalendarRange,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('area_doctor_visits')
        .select('area_id, doctor_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Doctor: lk.doctors.get(r.doctor_id) ?? '',
        Area: lk.areas.get(r.area_id) ?? '',
        Created: r.created_at?.slice(0, 10),
      }));
    },
  },
  {
    key: 'targets',
    label: 'Targets',
    icon: Package,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('targets')
        .select('target_month, target_value, achieved_value, target_type, mr_id, doctor_id')
        .order('target_month', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Month: r.target_month,
        MR: lk.users.get(r.mr_id) ?? '',
        Doctor: lk.doctors.get(r.doctor_id) ?? '',
        Type: r.target_type,
        'Target Value': r.target_value,
        Achieved: r.achieved_value,
      }));
    },
  },
  {
    key: 'tour_plans',
    label: 'Tour Plans',
    icon: CalendarRange,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('tour_plans')
        .select('user_id, month, year, status, locked_at, approved_at, approved_by, approval_message')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        MR: lk.users.get(r.user_id) ?? '',
        Month: r.month,
        Year: r.year,
        Status: r.status,
        'Locked At': dt(r.locked_at),
        'Approved At': dt(r.approved_at),
        Approver: lk.users.get(r.approved_by) ?? '',
        Message: r.approval_message,
      }));
    },
  },
  {
    key: 'leave_requests',
    label: 'Leave Requests',
    icon: CalendarOff,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('mr_id, leave_date, reason, status, remarks, reviewed_by, reviewed_at')
        .order('leave_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        MR: lk.users.get(r.mr_id) ?? '',
        'Leave Date': r.leave_date,
        Reason: r.reason,
        Status: r.status,
        Reviewer: lk.users.get(r.reviewed_by) ?? '',
        'Reviewed At': dt(r.reviewed_at),
        Remarks: r.remarks,
      }));
    },
  },
  {
    key: 'expenses',
    label: 'Expenses',
    icon: Receipt,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('expenses')
        .select('mr_id, expense_date, expense_type, amount, description, status, travel_allowance, other_expenses, approved_by, approved_at')
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Date: r.expense_date,
        MR: lk.users.get(r.mr_id) ?? '',
        Type: r.expense_type,
        Amount: r.amount,
        'Travel Allowance': r.travel_allowance,
        'Other Expenses': r.other_expenses,
        Description: r.description,
        Status: r.status,
        'Approved By': lk.users.get(r.approved_by) ?? '',
      }));
    },
  },
  {
    key: 'doctor_incentives',
    label: 'Doctor Incentives',
    icon: IndianRupee,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('doctor_incentives')
        .select('doctor_id, order_amount, incentive_percentage, incentive_amount, status, paid_at, notes')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Doctor: lk.doctors.get(r.doctor_id) ?? '',
        'Order Amount': r.order_amount,
        'Incentive %': r.incentive_percentage,
        'Incentive Amount': r.incentive_amount,
        Status: r.status,
        'Paid At': r.paid_at?.slice(0, 10),
        Notes: r.notes,
      }));
    },
  },
  {
    key: 'advance_incentives',
    label: 'Advance Incentives',
    icon: Wallet,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('doctor_advance_incentives')
        .select('doctor_id, amount, given_date, notes, status, settled_at')
        .order('given_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Doctor: lk.doctors.get(r.doctor_id) ?? '',
        Amount: r.amount,
        'Given Date': r.given_date,
        Status: r.status,
        'Settled At': r.settled_at?.slice(0, 10),
        Notes: r.notes,
      }));
    },
  },
  {
    key: 'reward_campaigns',
    label: 'Reward Campaigns',
    icon: Gift,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('reward_campaigns')
        .select('name, product_id, target_quantity, reward_description, beneficiary_type, start_date, end_date, is_active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Campaign: r.name,
        Product: lk.products.get(r.product_id) ?? '',
        'Target Qty': r.target_quantity,
        Reward: r.reward_description,
        'Beneficiary Type': r.beneficiary_type,
        'Start Date': r.start_date,
        'End Date': r.end_date,
        Active: r.is_active ? 'Yes' : 'No',
      }));
    },
  },
  {
    key: 'reward_claims',
    label: 'Reward Claims',
    icon: Gift,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('reward_claims')
        .select('campaign_id, beneficiary_type, achieved_quantity, status, achieved_at, approved_at, delivered_at, admin_notes, delivery_notes')
        .order('achieved_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Campaign: lk.campaigns.get(r.campaign_id) ?? '',
        'Beneficiary Type': r.beneficiary_type,
        'Achieved Qty': r.achieved_quantity,
        Status: r.status,
        'Achieved At': r.achieved_at?.slice(0, 10),
        'Approved At': r.approved_at?.slice(0, 10),
        'Delivered At': r.delivered_at?.slice(0, 10),
        'Admin Notes': r.admin_notes,
        'Delivery Notes': r.delivery_notes,
      }));
    },
  },
  {
    key: 'secondary_sales',
    label: 'Secondary Sales',
    icon: ShoppingCart,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('secondary_sales')
        .select('distributor_id, sales_month, description')
        .order('sales_month', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Month: r.sales_month,
        Distributor: lk.distributors.get(r.distributor_id) ?? '',
        Description: r.description,
      }));
    },
  },
  {
    key: 'purchases',
    label: 'Purchases',
    icon: Package,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('purchases')
        .select('purchase_date, supplier_name, invoice_number, product_id, quantity, unit_cost, gst_amount, transport_amount, total_cost, notes')
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Date: r.purchase_date,
        Supplier: r.supplier_name,
        'Invoice No': r.invoice_number,
        Product: lk.products.get(r.product_id) ?? '',
        Qty: r.quantity,
        'Unit Cost': r.unit_cost,
        GST: r.gst_amount,
        Transport: r.transport_amount,
        Total: r.total_cost,
        Notes: r.notes,
      }));
    },
  },
  {
    key: 'users',
    label: 'Users',
    icon: UserCog,
    fetch: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('name, email, role, created_at')
        .order('name');
      if (error) throw error;
      return (data || []).map((r) => ({
        Name: r.name,
        Email: r.email,
        Role: r.role,
        Created: r.created_at?.slice(0, 10),
      }));
    },
  },
  {
    key: 'reminders',
    label: 'Reminders',
    icon: Bell,
    fetch: async (lk) => {
      const { data, error } = await supabase
        .from('reminders')
        .select('user_id, title, note, remind_date, remind_time, status, entity_type, is_auto')
        .order('remind_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        Title: r.title,
        Note: r.note,
        Date: r.remind_date,
        Time: r.remind_time,
        Status: r.status,
        'Entity Type': r.entity_type,
        Automatic: r.is_auto ? 'Yes' : 'No',
        User: lk.users.get(r.user_id) ?? '',
      }));
    },
  },
];

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'People', keys: ['doctors', 'pharmacies', 'distributors', 'users'] },
  { title: 'Sales & Stock', keys: ['orders', 'order_items', 'products', 'secondary_sales', 'purchases'] },
  { title: 'Field Work', keys: ['daily_working', 'daily_working_setup', 'area_doctor_visits', 'targets', 'tour_plans', 'leave_requests'] },
  { title: 'Money & Rewards', keys: ['expenses', 'doctor_incentives', 'advance_incentives', 'reward_campaigns', 'reward_claims'] },
  { title: 'Other', keys: ['reminders'] },
];

const DataExport = () => {
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Data Export" description="Download company records as Excel" />
        <div className="px-3 py-6">
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Only admins can export company data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const runExport = async (defs: DatasetDef[], filename: string, busyKey: string) => {
    setBusy(busyKey);
    try {
      const lk = await fetchLookups();
      const sheets: ExcelSheet[] = [];
      let done = 0;
      for (const def of defs) {
        const rows = await def.fetch(lk);
        sheets.push({ name: def.label, rows });
        done += 1;
        if (defs.length > 3) setBusy(`${busyKey}:${done}/${defs.length}`);
      }
      await deliverExcel(sheets, filename);
      toast({
        title: 'Excel file ready',
        description: `${filename} downloaded (${defs.length} sheet${defs.length > 1 ? 's' : ''}).`,
      });
    } catch (error: any) {
      console.error('Excel export failed:', error);
      toast({
        title: 'Export failed',
        description: error?.message ?? 'Could not prepare the Excel file. Try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const exportAll = () =>
    runExport(DATASETS, `WinVision-All-Data-${todayStamp()}.xlsx`, 'all');

  const exportingAll = busy?.startsWith('all');

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Data Export" description="Download all company records as Excel" />

      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileSpreadsheet className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Export Everything
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              One Excel workbook with every record — {DATASETS.length} sheets (Doctors, Orders,
              Expenses, Incentives, Targets and more).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <Button
              onClick={exportAll}
              disabled={Boolean(busy)}
              className="w-full md:w-auto h-10 text-sm gap-2"
            >
              {exportingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exportingAll
                ? `Preparing… ${busy?.split(':')[1] ?? ''}`
                : 'Export All Data (.xlsx)'}
            </Button>
          </CardContent>
        </Card>

        {GROUPS.map((group) => {
          const defs = group.keys
            .map((k) => DATASETS.find((d) => d.key === k)!)
            .filter(Boolean);
          return (
            <Card key={group.title}>
              <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                <CardTitle className="text-sm md:text-base">{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 space-y-2">
                {defs.map((def) => {
                  const isBusy = busy?.startsWith(def.key);
                  return (
                    <div
                      key={def.key}
                      className="flex items-center justify-between gap-3 border rounded-lg p-2.5 md:p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                          <def.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs md:text-sm font-medium truncate">
                          {def.label}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs shrink-0 gap-1.5"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          runExport(
                            [def],
                            `WinVision-${def.label.replace(/\s+/g, '-')}-${todayStamp()}.xlsx`,
                            def.key,
                          )
                        }
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Export
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DataExport;
