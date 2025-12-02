import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Calendar, User, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface VisitNote {
  id: string;
  visit_date: string;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  users: {
    name: string;
  };
}

interface VisitNotesProps {
  doctorId: string;
}

const VisitNotes = ({ doctorId }: VisitNotesProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [visitNotes, setVisitNotes] = useState<VisitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newTags, setNewTags] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVisitNotes();
  }, [doctorId]);

  const fetchVisitNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_visit_notes')
        .select(`
          *,
          users (
            name
          )
        `)
        .eq('doctor_id', doctorId)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setVisitNotes(data || []);
    } catch (error) {
      console.error('Error fetching visit notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast({ title: "Please enter a note", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('doctor_visit_notes')
        .insert([{
          doctor_id: doctorId,
          mr_id: profile?.id,
          visit_date: visitDate,
          notes: newNote,
          tags: newTags ? newTags.split(',').map(t => t.trim()).filter(Boolean) : []
        }]);

      if (error) throw error;

      toast({ title: "Visit note added successfully" });
      setNewNote('');
      setNewTags('');
      setShowForm(false);
      fetchVisitNotes();
    } catch (error) {
      console.error('Error adding visit note:', error);
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Visit Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Visit Notes
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 border rounded-lg space-y-3 bg-accent/30">
            <div>
              <Label htmlFor="visitDate">Visit Date</Label>
              <Input
                id="visitDate"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter visit notes..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="e.g., Follow-up, Sample Given, Order Placed"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddNote} disabled={saving}>
                Save Note
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {visitNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No visit notes yet
          </p>
        ) : (
          <div className="space-y-3">
            {visitNotes.map((note) => (
              <div
                key={note.id}
                className="p-3 border rounded-lg space-y-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Date(note.visit_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{note.users.name}</span>
                  </div>
                </div>
                {note.notes && (
                  <p className="text-sm">{note.notes}</p>
                )}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {note.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisitNotes;