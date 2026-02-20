import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

interface Branch {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function Branches() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchBranches();
    }
  }, [authLoading, isSuperAdmin]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'branches'));
      const fetched = snap.docs.map(doc => ({
        id: doc.id,
        created_at: new Date().toISOString(),
        ...doc.data()
      })) as Branch[];
      setBranches(fetched.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בטעינת הענפים');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('נא להזין שם ענף');
      return;
    }

    try {
      await addDoc(collection(db, 'branches'), {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        created_at: new Date().toISOString()
      });
      setFormLoading(false);
      toast.success('הענף נוסף בהצלחה');
      setIsAddDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (e) {
      setFormLoading(false);
      toast.error('שגיאה בהוספת הענף');
    }
  };

  const handleEdit = async () => {
    if (!selectedBranch) return;
    if (!formData.name.trim()) {
      toast.error('נא להזין שם ענף');
      return;
    }

    try {
      await updateDoc(doc(db, 'branches', selectedBranch.id), {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      });
      setFormLoading(false);
      toast.success('הענף עודכן בהצלחה');
      setIsEditDialogOpen(false);
      setSelectedBranch(null);
      resetForm();
      fetchBranches();
    } catch (e) {
      setFormLoading(false);
      toast.error('שגיאה בעדכון הענף');
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`האם למחוק את הענף "${branch.name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'branches', branch.id));
      toast.success('הענף נמחק בהצלחה');
      fetchBranches();
    } catch (e) {
      toast.error('שגיאה במחיקת הענף. ייתכן שיש עובדים המשויכים לענף זה.');
    }
  };

  const openEditDialog = (branch: Branch) => {
    setSelectedBranch(branch);
    setFormData({
      name: branch.name,
      description: branch.description || '',
    });
    setIsEditDialogOpen(true);
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ניהול ענפים</h1>
            <p className="text-muted-foreground mt-1">ניהול רשימת הענפים בארגון</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף ענף
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader className="text-right">
                <DialogTitle className="text-right">הוספת ענף חדש</DialogTitle>
                <DialogDescription className="text-right">הזן את פרטי הענף</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם הענף *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <DialogFooter className="mt-4">
                  <Button type="button" onClick={handleAdd} disabled={formLoading}>
                    {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    הוסף
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">אין ענפים</h3>
            <p className="text-muted-foreground">הוסף ענף ראשון כדי להתחיל</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם הענף</TableHead>
                  <TableHead className="text-right">תיאור</TableHead>
                  <TableHead className="text-right w-[100px]">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(branch)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(branch)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader className="text-right">
              <DialogTitle className="text-right">עריכת ענף</DialogTitle>
              <DialogDescription className="text-right">עדכן את פרטי הענף</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">שם הענף *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">תיאור</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" onClick={handleEdit} disabled={formLoading}>
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  עדכן
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
