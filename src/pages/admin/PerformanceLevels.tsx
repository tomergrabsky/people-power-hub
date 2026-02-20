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
import { Plus, Pencil, Trash2, Loader2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

interface PerformanceLevel {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

export default function PerformanceLevels() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const [levels, setLevels] = useState<PerformanceLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<PerformanceLevel | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });

    useEffect(() => {
        if (!authLoading && isSuperAdmin) {
            fetchLevels();
        }
    }, [authLoading, isSuperAdmin]);

    const fetchLevels = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'performance_levels'));
            const fetched = snap.docs.map(doc => ({
                id: doc.id,
                created_at: new Date().toISOString(),
                ...doc.data()
            })) as PerformanceLevel[];
            setLevels(fetched.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (e) {
            console.error(e);
            toast.error('שגיאה בטעינת רמות הביצועים');
        }
        setLoading(false);
    };

    const resetForm = () => {
        setFormData({ name: '', description: '' });
    };

    const handleAdd = async () => {
        if (!formData.name.trim()) {
            toast.error('נא להזין שם רמת ביצועים');
            return;
        }

        setFormLoading(true);
        try {
            await addDoc(collection(db, 'performance_levels'), {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                created_at: new Date().toISOString()
            });
            setFormLoading(false);
            toast.success('רמת הביצועים נוספה בהצלחה');
            setIsAddDialogOpen(false);
            resetForm();
            fetchLevels();
        } catch (e) {
            setFormLoading(false);
            toast.error('שגיאה בהוספת רמת הביצועים');
        }
    };

    const handleEdit = async () => {
        if (!selectedLevel) return;
        if (!formData.name.trim()) {
            toast.error('נא להזין שם רמת ביצועים');
            return;
        }

        setFormLoading(true);
        try {
            await updateDoc(doc(db, 'performance_levels', selectedLevel.id), {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
            });
            setFormLoading(false);
            toast.success('רמת הביצועים עודכנה בהצלחה');
            setIsEditDialogOpen(false);
            setSelectedLevel(null);
            resetForm();
            fetchLevels();
        } catch (e) {
            setFormLoading(false);
            toast.error('שגיאה בעדכון רמת הביצועים');
        }
    };

    const handleDelete = async (level: PerformanceLevel) => {
        if (!confirm(`האם למחוק את רמת הביצועים "${level.name}"?`)) return;

        try {
            await deleteDoc(doc(db, 'performance_levels', level.id));
            toast.success('רמת הביצועים נמחקה בהצלחה');
            fetchLevels();
        } catch (e) {
            toast.error('שגיאה במחיקת רמת הביצועים');
        }
    };

    const openEditDialog = (level: PerformanceLevel) => {
        setSelectedLevel(level);
        setFormData({
            name: level.name,
            description: level.description || '',
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
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">ניהול רמות ביצועים</h1>
                        <p className="text-muted-foreground mt-1">ניהול רשימת רמות הביצועים בארגון</p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}>
                                <Plus className="w-4 h-4 ml-2" />
                                הוסף רמת ביצועים
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader className="text-right">
                                <DialogTitle className="text-right">הוספת רמת ביצועים חדשה</DialogTitle>
                                <DialogDescription className="text-right">הזן את פרטי רמת הביצועים</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">שם רמת הביצועים *</Label>
                                    <Input
                                        id="name"
                                        className="text-right"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">תיאור</Label>
                                    <Textarea
                                        id="description"
                                        className="text-right"
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

                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : levels.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-lg border">
                        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">אין רמות ביצועים</h3>
                        <p className="text-muted-foreground">הוסף רמת ביצועים ראשונה כדי להתחיל</p>
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">שם רמת הביצועים</TableHead>
                                    <TableHead className="text-right">תיאור</TableHead>
                                    <TableHead className="text-right w-[100px]">פעולות</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {levels.map((level) => (
                                    <TableRow key={level.id}>
                                        <TableCell className="font-medium text-right">{level.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-right">
                                            {level.description || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(level)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(level)}
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

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader className="text-right">
                            <DialogTitle className="text-right">עריכת רמת ביצועים</DialogTitle>
                            <DialogDescription className="text-right">עדכן את פרטי רמת הביצועים</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">שם רמת הביצועים *</Label>
                                <Input
                                    id="edit-name"
                                    className="text-right"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">תיאור</Label>
                                <Textarea
                                    id="edit-description"
                                    className="text-right"
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
