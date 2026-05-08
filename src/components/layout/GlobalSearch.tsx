import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Users, Building, Truck, Package, ShoppingCart } from 'lucide-react';

type Result = {
  id: string;
  label: string;
  sublabel?: string;
  group: 'Doctors' | 'Pharmacies' | 'Distributors' | 'Products' | 'Orders';
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

const fetchAll = async (): Promise<Result[]> => {
  const [doctors, pharmacies, distributors, products, orders] = await Promise.all([
    supabase.from('doctors').select('id, name, specialty, hospital_clinic').limit(200),
    supabase.from('pharmacies').select('id, name, address').limit(200),
    supabase.from('distributors').select('id, name, city').limit(200),
    supabase.from('products').select('id, name, category').limit(200),
    supabase
      .from('orders')
      .select('id, order_number, total_amount, order_date')
      .order('order_date', { ascending: false })
      .limit(100),
  ]);

  const out: Result[] = [];
  (doctors.data || []).forEach((d: any) =>
    out.push({
      id: d.id,
      label: d.name,
      sublabel: [d.specialty, d.hospital_clinic].filter(Boolean).join(' • '),
      group: 'Doctors',
      path: `/dashboard/doctors/${d.id}`,
      icon: Users,
    }),
  );
  (pharmacies.data || []).forEach((p: any) =>
    out.push({
      id: p.id,
      label: p.name,
      sublabel: p.address || '',
      group: 'Pharmacies',
      path: `/dashboard/pharmacies`,
      icon: Building,
    }),
  );
  (distributors.data || []).forEach((d: any) =>
    out.push({
      id: d.id,
      label: d.name,
      sublabel: d.city || '',
      group: 'Distributors',
      path: `/dashboard/distributors/${d.id}`,
      icon: Truck,
    }),
  );
  (products.data || []).forEach((p: any) =>
    out.push({
      id: p.id,
      label: p.name,
      sublabel: p.category || '',
      group: 'Products',
      path: `/dashboard/products`,
      icon: Package,
    }),
  );
  (orders.data || []).forEach((o: any) =>
    out.push({
      id: o.id,
      label: o.order_number || `Order ${String(o.id).slice(0, 8)}`,
      sublabel: `${o.order_date || ''} • ₹${Number(o.total_amount || 0).toLocaleString('en-IN')}`,
      group: 'Orders',
      path: `/dashboard/orders`,
      icon: ShoppingCart,
    }),
  );
  return out;
};

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: results = [] } = useQuery({
    queryKey: ['global-search'],
    queryFn: fetchAll,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const groups: Result['group'][] = ['Doctors', 'Pharmacies', 'Distributors', 'Products', 'Orders'];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 text-muted-foreground w-64 justify-between"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search anything…
        </span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="md:hidden"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search doctors, pharmacies, distributors, products, orders…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {groups.map((g, idx) => {
            const items = results.filter((r) => r.group === g);
            if (items.length === 0) return null;
            return (
              <div key={g}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={g}>
                  {items.slice(0, 25).map((r) => (
                    <CommandItem
                      key={`${r.group}-${r.id}`}
                      value={`${r.group} ${r.label} ${r.sublabel || ''}`}
                      onSelect={() => go(r.path)}
                    >
                      <r.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{r.label}</span>
                        {r.sublabel && (
                          <span className="text-xs text-muted-foreground">{r.sublabel}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;
