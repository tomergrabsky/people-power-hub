import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, RotateCcw, Eye, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
    id: string;
    full_name: string;
    job_role_id: string | null;
    start_date: string;
    is_left?: boolean;
    left_date?: string;
    left_reason?: string;
    left_notes?: string;
}

const LeftEmployees = () => {
    const { user, isManager } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [jobRoles, setJobRoles] = useState<any[]>([]);
    const [leavingReasons, setLeavingReasons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [employeesSnap, rolesSnap, reasonsSnap] = await Promise.all([
                getDocs(collection(db, 'employees')),
                getDocs(collection(db, 'job_roles')),
                getDocs(collection(db, 'leaving_reasons')),
            ]);

            const mapDocs = (snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            setJobRoles(mapDocs(rolesSnap));
            setLeavingReasons(mapDocs(reasonsSnap));
            // Only keep employees that left
            setEmployees(mapDocs(employeesSnap).filter((emp: any) => emp.is_left));
        } catch (e) {
            console.error(e);
            toast.error('שגיאה בטעינת הנתונים');
        }
        setLoading(false);
    };

    const getRoleName = (id: string | null) => {
        if (!id) return '-';
        return jobRoles.find(r => r.id === id)?.name || id;
    };

    const calculateTenure = (startDateStr: string, endDateStr?: string) => {
        if (!startDateStr || !endDateStr) return '-';
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        if (years === 0) return `${remainingMonths} חודשים`;
        return `${years} שנים ו-${remainingMonths} חודשים`;
    };

    const filteredEmployees = employees.filter(emp =>
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRestore = async (employee: Employee) => {
        if (!confirm(`האם אתה בטוח שברצונך להחזיר את ${employee.full_name} לסטאטוס עובד פעיל?`)) return;

        setActionLoading(true);
        try {
            await updateDoc(doc(db, 'employees', employee.id), {
                is_left: false,
                left_date: null,
                left_reason: null
            });
            toast.success('העובד הוחזר לסטאטוס פעיל בהצלחה');
            fetchData();
        } catch (e) {
            toast.error('שגיאה בשחזור העובד');
        } finally {
            setActionLoading(false);
        }
    };

    const openViewDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsViewDialogOpen(true);
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Users className="w-8 h-8 text-primary" />
                            עובדים לשעבר
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            ניהול רשומות ההיסטוריה של יוצאי הארגון
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="חיפוש עובד..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-9"
                        />
                    </div>
                </div>

                <div className="table-container">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right font-bold text-foreground">שם העובד</TableHead>
                                <TableHead className="text-right">תאריך עזיבה</TableHead>
                                <TableHead className="text-right">סיבת עזיבה</TableHead>
                                <TableHead className="text-right">הערות</TableHead>
                                <TableHead className="text-right">תפקיד</TableHead>
                                <TableHead className="text-right">תאריך התחלה</TableHead>
                                <TableHead className="text-right">תאריך עזיבה</TableHead>
                                <TableHead className="text-right">משך הזמן שעבד</TableHead>
                                <TableHead className="text-right">פעולות</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        טוען נתונים...
                                    </TableCell>
                                </TableRow>
                            ) : filteredEmployees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        לא נמצאו עובדים שעזבו שעונים על תנאי החיפוש.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEmployees.map((employee) => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-bold text-foreground text-right">{employee.full_name}</TableCell>
                                        <TableCell className="text-right font-semibold text-destructive">{employee.left_date ? new Date(employee.left_date).toLocaleDateString('he-IL') : '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-right">{employee.left_reason || '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-right" title={employee.left_notes || ''}>{employee.left_notes || '-'}</TableCell>
                                        <TableCell className="text-right">{getRoleName(employee.job_role_id)}</TableCell>
                                        <TableCell className="text-right">{employee.start_date ? new Date(employee.start_date).toLocaleDateString('he-IL') : '-'}</TableCell>
                                        <TableCell className="text-right font-semibold text-destructive">{employee.left_date ? new Date(employee.left_date).toLocaleDateString('he-IL') : '-'}</TableCell>
                                        <TableCell className="text-right">{calculateTenure(employee.start_date, employee.left_date)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openViewDialog(employee)}
                                                    title="צפייה בכרטיסייה"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRestore(employee)}
                                                    title="בטל עזיבה (החזר לפעיל)"
                                                >
                                                    <RotateCcw className="w-4 h-4 text-primary" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="sm:max-w-md text-right">
                        <DialogHeader>
                            <DialogTitle className="text-right">צפייה בפרטי יוצא הארגון</DialogTitle>
                            <DialogDescription className="text-right">פרטי עזיבה ועובד</DialogDescription>
                        </DialogHeader>
                        {selectedEmployee && (
                            <div className="grid gap-4 py-4 w-full">
                                <div className="space-y-2 text-right">
                                    <Label>שם מלא</Label>
                                    <Input className="text-right bg-muted" value={selectedEmployee.full_name} disabled />
                                </div>
                                <div className="space-y-2 text-right">
                                    <Label>תפקיד מקורי</Label>
                                    <Input className="text-right bg-muted" value={getRoleName(selectedEmployee.job_role_id)} disabled />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 text-right">
                                        <Label>תאריך התחלה</Label>
                                        <Input className="text-right bg-muted" value={selectedEmployee.start_date ? new Date(selectedEmployee.start_date).toLocaleDateString('he-IL') : '-'} disabled />
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <Label>תאריך עזיבה</Label>
                                        <Input className="text-right bg-muted border-destructive/50" value={selectedEmployee.left_date ? new Date(selectedEmployee.left_date).toLocaleDateString('he-IL') : '-'} disabled />
                                    </div>
                                </div>
                                <div className="space-y-2 text-right">
                                    <Label>סיבת עזיבה במערכת</Label>
                                    <Input className="text-right bg-muted text-destructive font-medium" value={selectedEmployee.left_reason || '-'} disabled />
                                </div>
                                {selectedEmployee.left_notes && (
                                    <div className="space-y-2 text-right">
                                        <Label>הערות עזיבה</Label>
                                        <Input className="text-right bg-muted" value={selectedEmployee.left_notes} disabled />
                                    </div>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setIsViewDialogOpen(false)}>סגור</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </MainLayout>
    );
};

export default LeftEmployees;
