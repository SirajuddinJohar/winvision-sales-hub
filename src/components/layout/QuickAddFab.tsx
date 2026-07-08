import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingCart, Receipt, Bell, Package } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * Mobile-only floating quick-add button — the 4 things field users do daily.
 * Hidden on md+ screens where the sidebar covers navigation.
 */
const QuickAddFab = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: ShoppingCart, label: "New Order", path: "/dashboard/orders", color: "text-primary bg-primary/10" },
    { icon: Receipt, label: "Add Expense", path: "/dashboard/expenses", color: "text-warning bg-warning/10" },
    { icon: Bell, label: "New Reminder", path: "/dashboard/reminders", color: "text-info bg-info/10" },
    { icon: Package, label: "Add Sample", path: "/dashboard/master/add-sample", color: "text-success bg-success/10" },
  ];

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="md:hidden fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-lg bg-gradient-primary text-primary-foreground hover:scale-105 transition-transform"
          aria-label="Quick add"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle>Quick actions</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {actions.map((a) => (
            <button
              key={a.path}
              onClick={() => go(a.path)}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
            >
              <div className={`p-2 rounded-lg ${a.color}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">{a.label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickAddFab;
