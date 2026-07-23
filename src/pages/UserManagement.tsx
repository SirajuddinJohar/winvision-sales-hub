import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users } from 'lucide-react';

interface Row {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'mr';
  created_at?: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const { signUp } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'mr'>('mr');

  const load = async () => {
    setLoading(true);
    const { data: users } = await supabase.from('users').select('id, name, email, created_at').order('created_at', { ascending: false });
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
    setRows((users || []).map((u: any) => ({ ...u, role: roleMap.get(u.id) || 'mr' })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await signUp(email, password, name, role);
    setSaving(false);
    if (!error) {
      toast({ title: 'Employee account created', description: `${email} can now sign in. Ask them to use "Forgot Password" to set their own password.` });
      setOpen(false);
      setName(''); setEmail(''); setPassword(''); setRole('mr');
      setTimeout(load, 1500);
    }
  };

  const changeRole = async (userId: string, newRole: 'admin' | 'mr') => {
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    if (error) {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Role updated' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> User Management</h1>
          <p className="text-sm text-muted-foreground">Only administrators can create new employee accounts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> Create Employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Employee Account</DialogTitle>
              <DialogDescription>
                The employee should use "Forgot Password" at their first sign-in to set their own password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Temporary Password</Label>
                <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                <p className="text-[11px] text-muted-foreground mt-1">Minimum 8 characters.</p>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v: 'admin' | 'mr') => setRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mr">Medical Representative</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Account'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Employees ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>
                        <Badge variant={r.role === 'admin' ? 'default' : 'secondary'}>{r.role.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={r.role} onValueChange={(v: 'admin' | 'mr') => changeRole(r.id, v)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mr">Medical Rep</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4 text-sm text-amber-900">
          <strong>Important:</strong> To fully block public signup, also disable "Enable Signups" in your Supabase Dashboard → Authentication → Providers → Email. Admin creation from this page will still work.
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
