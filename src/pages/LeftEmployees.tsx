import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnauthorizedActionDialog } from '@/components/employees/UnauthorizedActionDialog';
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
import { Search, RotateCcw, Eye, Loader2, Users, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Employee {
    id: string;
    full_name: string;
    id_number?: string;
    job_role_id: string | null;
    job_percentage?: number | null;
    project_id?: string | null;
    branch_id?: string | null;
    section_id?: string | null;
    professional_experience_years?: number | null;
    employing_company_id?: string | null;
    recruitment_plan_id?: string | null;
    city?: string | null;
    start_date: string;
    birth_date?: string | null;
    phone?: string | null;
    emergency_phone?: string | null;
    performance_level_id?: string | null;
    performance_update_date?: string | null;
    seniority_level_id?: string | null;
    cost?: number | null;
    unit_criticality?: number | null;
    company_attrition_risk?: number | null;
    attrition_risk?: number | null;
    leaving_reason_id?: string | null;
    attrition_risk_reason?: string | null;
    retention_plan?: string | null;
    commander_summary_and_status?: string | null;
    replacement_needed?: string | null;
    company_retention_plan?: string | null;
    salary_raise_date?: string | null;
    salary_raise_percentage?: number | null;
    linkedin_url?: string | null;
    our_sourcing?: boolean | null;
    revolving_door?: boolean | null;
    real_market_salary?: number | null;
    is_left?: boolean;
    left_date?: string;
    left_reason?: string;
    left_notes?: string;
}

const LeftEmployees = () => {
    const { user, loading: authLoading, isManager, isSuperAdmin, allowedProjectIds } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [jobRoles, setJobRoles] = useState<any[]>([]);
    const [leavingReasons, setLeavingReasons] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [recruitmentPlans, setRecruitmentPlans] = useState<any[]>([]);
    const [employingCompanies, setEmployingCompanies] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [seniorityLevels, setSeniorityLevels] = useState<any[]>([]);
    const [performanceLevels, setPerformanceLevels] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('left_info');
    const [actionLoading, setActionLoading] = useState(false);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editReason, setEditReason] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [isUnauthorizedDialogOpen, setIsUnauthorizedDialogOpen] = useState(false);

    useEffect(() => {
        if (user && !authLoading) {
            fetchData();
        }
    }, [user, authLoading]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                employeesSnap,
                rolesSnap,
                projectsSnap,
                recruitmentPlansSnap,
                employingCompaniesSnap,
                branchesSnap,
                sectionsSnap,
                seniorityLevelsSnap,
                reasonsSnap,
                performanceLevelsSnap
            ] = await Promise.all([
                getDocs(collection(db, 'employees')),
                getDocs(collection(db, 'job_roles')),
                getDocs(collection(db, 'projects')),
                getDocs(collection(db, 'recruitment_plans')),
                getDocs(collection(db, 'employing_companies')),
                getDocs(collection(db, 'branches')),
                getDocs(collection(db, 'sections')),
                getDocs(collection(db, 'seniority_levels')),
                getDocs(collection(db, 'leaving_reasons')),
                getDocs(collection(db, 'performance_levels'))
            ]);

            const mapDocs = (snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            setJobRoles(mapDocs(rolesSnap));
            setProjects(mapDocs(projectsSnap));
            setRecruitmentPlans(mapDocs(recruitmentPlansSnap));
            setEmployingCompanies(mapDocs(employingCompaniesSnap));
            setBranches(mapDocs(branchesSnap));
            setSections(mapDocs(sectionsSnap));
            setSeniorityLevels(mapDocs(seniorityLevelsSnap));
            setLeavingReasons(mapDocs(reasonsSnap));
            setPerformanceLevels(mapDocs(performanceLevelsSnap));
            
            let allEmp = mapDocs(employeesSnap).filter((emp: any) => emp.is_left);

            // Filter by project permissions if not super admin
            if (!isSuperAdmin) {
                allEmp = allEmp.filter((emp: any) =>
                    emp.project_id && allowedProjectIds?.includes(emp.project_id)
                );
            }

            setEmployees(allEmp);
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

    const getProjectName = (id: string | null) => {
        if (!id) return '-';
        return projects.find(p => p.id === id)?.name || id;
    };

    const getBranchName = (id: string | null) => {
        if (!id) return '-';
        return branches.find(b => b.id === id)?.name || id;
    };

    const getSectionName = (id: string | null) => {
        if (!id) return '-';
        return sections.find(s => s.id === id)?.name || id;
    };

    const getEmployingCompanyName = (id: string | null) => {
        if (!id) return '-';
        return employingCompanies.find(c => c.id === id)?.name || id;
    };

    const getRecruitmentPlanName = (id: string | null) => {
        if (!id) return '-';
        return recruitmentPlans.find(p => p.id === id)?.name || id;
    };

    const getPerformanceLevelName = (id: string | null) => {
        if (!id) return '-';
        return performanceLevels.find(p => p.id === id)?.name || id;
    };

    const getSeniorityLevelName = (id: string | null) => {
        if (!id) return '-';
        return seniorityLevels.find(s => s.id === id)?.name || id;
    };

    const getLeavingReasonName = (id: string | null) => {
        if (!id) return '-';
        return leavingReasons.find(r => r.id === id)?.name || id;
    };

    const formatToHebrewNumber = (num: number | null | undefined) => {
        if (num === null || num === undefined) return '-';
        return num.toLocaleString('he-IL');
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
        if (!isSuperAdmin) {
            setIsUnauthorizedDialogOpen(true);
            return;
        }
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
        setActiveTab('left_info');
        setIsViewDialogOpen(true);
    };

    const openEditDialog = (employee: Employee) => {
        if (!isSuperAdmin) {
            setIsUnauthorizedDialogOpen(true);
            return;
        }
        setEmployeeToEdit(employee);
        setEditDate(employee.left_date ? new Date(employee.left_date).toISOString().split('T')[0] : '');
        setEditReason(employee.left_reason || '');
        setEditNotes(employee.left_notes || '');
        setIsEditDialogOpen(true);
    };

    const handleEditSave = async () => {
        if (!employeeToEdit || !editDate || !editReason) {
            toast.error('יש להזין תאריך עזיבה וסיבת עזיבה');
            return;
        }
        setEditLoading(true);
        try {
            await updateDoc(doc(db, 'employees', employeeToEdit.id), {
                left_date: editDate,
                left_reason: editReason,
                left_notes: editNotes
            });
            toast.success('פרטי העזיבה עודכנו בהצלחה');
            setIsEditDialogOpen(false);
            fetchData();
        } catch (e) {
            toast.error('שגיאה בעדכון פרטי העזיבה');
        } finally {
            setEditLoading(false);
        }
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
                                <TableHead className="text-right">שם העובד</TableHead>
                                <TableHead className="text-right">תאריך עזיבה</TableHead>
                                <TableHead className="text-right">סיבת עזיבה</TableHead>
                                <TableHead className="text-right">הערות</TableHead>
                                <TableHead className="text-right">תפקיד</TableHead>
                                <TableHead className="text-right">תאריך התחלה</TableHead>
                                <TableHead className="text-right">משך הזמן שעבד</TableHead>
                                <TableHead className="text-right">פעולות</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        טוען נתונים...
                                    </TableCell>
                                </TableRow>
                            ) : filteredEmployees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        לא נמצאו עובדים שעזבו שעונים על תנאי החיפוש.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEmployees.map((employee) => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="text-right">{employee.full_name}</TableCell>
                                        <TableCell className="text-right">{employee.left_date ? new Date(employee.left_date).toLocaleDateString('he-IL') : '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-right">{employee.left_reason || '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-right" title={employee.left_notes || ''}>{employee.left_notes || '-'}</TableCell>
                                        <TableCell className="text-right">{getRoleName(employee.job_role_id)}</TableCell>
                                        <TableCell className="text-right">{employee.start_date ? new Date(employee.start_date).toLocaleDateString('he-IL') : '-'}</TableCell>
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
                                                    onClick={() => openEditDialog(employee)}
                                                    title="עריכת פרטי עזיבה"
                                                >
                                                    <Pencil className="w-4 h-4" />
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
                    <DialogContent className="w-full h-[100dvh] max-h-[100dvh] rounded-none p-4 sm:p-6 sm:rounded-lg sm:h-auto sm:max-h-[85vh] max-w-4xl sm:w-[90vw] flex flex-col overflow-hidden text-right">
                        <DialogHeader className="text-right flex-shrink-0">
                            <DialogTitle className="text-right">צפייה בפרטי יוצא הארגון</DialogTitle>
                            <DialogDescription className="text-right">פרטי עזיבה ועובד</DialogDescription>
                        </DialogHeader>
                        {selectedEmployee && (
                            <>
                                <ScrollArea className="flex-1 overflow-y-auto pr-4" dir="rtl">
                                    <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full py-4">
                                        <TabsList className={`grid w-full ${isManager ? 'grid-cols-4' : 'grid-cols-2'} gap-2 mb-6 bg-transparent h-auto p-0`}>
                                            <TabsTrigger
                                                value="left_info"
                                                className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all text-right justify-start"
                                            >
                                                פרטי עזיבה
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="general"
                                                className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all text-right justify-start"
                                            >
                                                פרטים כלליים
                                            </TabsTrigger>
                                            {isManager && (
                                                <TabsTrigger
                                                    value="performance"
                                                    className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all text-right justify-start"
                                                >
                                                    ביצועים ושכר
                                                </TabsTrigger>
                                            )}
                                            {isManager && (
                                                <TabsTrigger
                                                    value="retention"
                                                    className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all text-right justify-start"
                                                >
                                                    שימור וקריטיות
                                                </TabsTrigger>
                                            )}
                                        </TabsList>

                                        <TabsContent value="left_info" className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2 text-right">
                                                    <Label>שם מלא</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.full_name || ''} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>תעודת זהות</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.id_number || ''} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>תפקיד מקורי</Label>
                                                    <Input className="text-right bg-muted" value={getRoleName(selectedEmployee.job_role_id)} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>אחוז משרה</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.job_percentage ? `${selectedEmployee.job_percentage}%` : '-'} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>תאריך התחלה</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.start_date ? new Date(selectedEmployee.start_date).toLocaleDateString('he-IL') : '-'} disabled dir="ltr" />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>תאריך עזיבה</Label>
                                                    <Input className="text-right bg-muted border-destructive/50 text-destructive font-medium" value={selectedEmployee.left_date ? new Date(selectedEmployee.left_date).toLocaleDateString('he-IL') : '-'} disabled dir="ltr" />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>משך הזמן שעבד</Label>
                                                    <Input className="text-right bg-muted" value={calculateTenure(selectedEmployee.start_date, selectedEmployee.left_date)} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>סיבת עזיבה במערכת</Label>
                                                    <Input className="text-right bg-muted text-destructive font-medium" value={selectedEmployee.left_reason || '-'} disabled />
                                                </div>
                                                {selectedEmployee.left_notes && (
                                                    <div className="space-y-2 text-right md:col-span-2">
                                                        <Label>הערות עזיבה</Label>
                                                        <Input className="text-right bg-muted" value={selectedEmployee.left_notes} disabled />
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="general" className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2 text-right">
                                                    <Label>תכנית</Label>
                                                    <Input className="text-right bg-muted" value={getProjectName(selectedEmployee.project_id || null)} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>ענף</Label>
                                                    <Input className="text-right bg-muted" value={getBranchName(selectedEmployee.branch_id || null)} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>מדור</Label>
                                                    <Input className="text-right bg-muted" value={getSectionName(selectedEmployee.section_id || null)} disabled />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2 text-right">
                                                    <Label>ותק במקצוע (שנים)</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.professional_experience_years?.toString() || '0'} disabled dir="ltr" />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>עיר מגורים</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.city || '-'} disabled />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2 text-right">
                                                    <Label>חברה מעסיקה</Label>
                                                    <Input className="text-right bg-muted" value={getEmployingCompanyName(selectedEmployee.employing_company_id || null)} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>קבלן משנה/תכנית גיוס</Label>
                                                    <Input className="text-right bg-muted" value={getRecruitmentPlanName(selectedEmployee.recruitment_plan_id || null)} disabled />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2 text-right">
                                                    <Label>תאריך לידה</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.birth_date ? new Date(selectedEmployee.birth_date).toLocaleDateString('he-IL') : '-'} disabled dir="ltr" />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>מספר טלפון</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.phone || '-'} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>טלפון חירום</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.emergency_phone || '-'} disabled />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2 text-right">
                                                    <Label>איתור שלנו?</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.our_sourcing === true ? 'כן' : selectedEmployee.our_sourcing === false ? 'לא' : '-'} disabled />
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <Label>דלת מסתובבת</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.revolving_door === true ? 'כן' : selectedEmployee.revolving_door === false ? 'לא' : '-'} disabled />
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-right">
                                                <Label>קישור ללינקדאין</Label>
                                                {selectedEmployee.linkedin_url ? (
                                                    <a
                                                        href={selectedEmployee.linkedin_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block p-2 bg-muted rounded-md text-right text-primary hover:underline text-sm truncate"
                                                    >
                                                        {selectedEmployee.linkedin_url}
                                                    </a>
                                                ) : (
                                                    <Input className="text-right bg-muted" value="-" disabled />
                                                )}
                                            </div>
                                        </TabsContent>

                                        {isManager && (
                                            <TabsContent value="performance" className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2 text-right">
                                                        <Label>סניוריטי</Label>
                                                        <Input className="text-right bg-muted" value={getSeniorityLevelName(selectedEmployee.seniority_level_id || null)} disabled />
                                                    </div>
                                                    <div className="space-y-2 text-right">
                                                        <Label>עלות העובד בחודש (₪) - כולל מע"מ</Label>
                                                        <Input className="text-right bg-muted" value={selectedEmployee.cost ? `₪${formatToHebrewNumber(selectedEmployee.cost)}` : '-'} disabled />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2 text-right">
                                                        <Label>ביצועי העובד</Label>
                                                        <Input className="text-right bg-muted" value={getPerformanceLevelName(selectedEmployee.performance_level_id || null)} disabled />
                                                    </div>
                                                    <div className="space-y-2 text-right">
                                                        <Label>תאריך עדכון ביצועים</Label>
                                                        <Input className="text-right bg-muted" value={selectedEmployee.performance_update_date ? new Date(selectedEmployee.performance_update_date).toLocaleDateString('he-IL') : '-'} disabled dir="ltr" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2 text-right">
                                                        <Label>תאריך העלאת שכר</Label>
                                                        <Input className="text-right bg-muted" value={selectedEmployee.salary_raise_date ? new Date(selectedEmployee.salary_raise_date).toLocaleDateString('he-IL') : '-'} disabled dir="ltr" />
                                                    </div>
                                                    <div className="space-y-2 text-right">
                                                        <Label>אחוז העלאת שכר (%)</Label>
                                                        <Input className="text-right bg-muted" value={selectedEmployee.salary_raise_percentage ? `${formatToHebrewNumber(selectedEmployee.salary_raise_percentage)}%` : '-'} disabled />
                                                    </div>
                                                </div>

                                                {isSuperAdmin && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2 text-right">
                                                            <Label>שכר חודשי משוער (₪)</Label>
                                                            <Input className="text-right bg-muted" value={selectedEmployee.cost ? `₪${formatToHebrewNumber(selectedEmployee.cost / 1.4 / 1.1 / 1.18)}` : '-'} disabled />
                                                        </div>
                                                        <div className="space-y-2 text-right">
                                                            <Label>שכר חודשי ריאלי בשוק (₪)</Label>
                                                            <Input className="text-right bg-muted" value={selectedEmployee.real_market_salary ? `₪${formatToHebrewNumber(selectedEmployee.real_market_salary)}` : '-'} disabled />
                                                        </div>
                                                    </div>
                                                )}
                                            </TabsContent>
                                        )}

                                        {isManager && (
                                            <TabsContent value="retention" className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-2 text-right">
                                                        <Label>קריטיות ליחידה (0-5)</Label>
                                                        <Input
                                                            className="text-right bg-muted"
                                                            value={selectedEmployee.unit_criticality != null ? `${selectedEmployee.unit_criticality}${selectedEmployee.unit_criticality === 1 ? ' - די חשוב לארגון' : selectedEmployee.unit_criticality === 2 ? ' - חשוב לארגון' : selectedEmployee.unit_criticality === 3 ? ' - חשוב מאוד לארגון' : selectedEmployee.unit_criticality === 4 ? ' - קריטי לארגון' : selectedEmployee.unit_criticality === 5 ? ' - קריטי מאוד לארגון' : ''}` : '-'}
                                                            disabled
                                                        />
                                                    </div>
                                                    <div className="space-y-2 text-right">
                                                        <Label>סיכוי לעזוב - לדעת החברה (0-5)</Label>
                                                        <Input className="text-right bg-muted" value={selectedEmployee.company_attrition_risk?.toString() ?? '-'} disabled />
                                                    </div>
                                                    <div className="space-y-2 text-right">
                                                        <Label>סיכוי לעזוב - לדעת היחידה (0-5)</Label>
                                                        <Input className="text-right bg-muted" value={selectedEmployee.attrition_risk?.toString() ?? '-'} disabled />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-right">
                                                    <Label>סיבת רצון לעזוב - קטגוריות</Label>
                                                    <Input className="text-right bg-muted" value={getLeavingReasonName(selectedEmployee.leaving_reason_id || null)} disabled />
                                                </div>

                                                <div className="space-y-2 text-right">
                                                    <Label>סיבת רצון לעזוב - מלל חופשי</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.attrition_risk_reason || '-'} disabled />
                                                </div>

                                                <div className="space-y-2 text-right">
                                                    <Label>תכנית שימור - מבחינת היחידה</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.retention_plan || '-'} disabled />
                                                </div>

                                                <div className="space-y-2 text-right">
                                                    <Label>התיחסות חברה למעבר דרומה</Label>
                                                    <Input className="text-right bg-muted" value={selectedEmployee.company_retention_plan || '-'} disabled />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2 text-right">
                                                        <Label>סיכום מפקד יחידה וסטטוס</Label>
                                                        <Input className="text-right bg-muted" value={selectedEmployee.commander_summary_and_status || '-'} disabled />
                                                    </div>
                                                    <div className="space-y-2 text-right">
                                                        <Label>לגייס במקומו?</Label>
                                                        <Input className="text-right bg-muted" value={selectedEmployee.replacement_needed || '-'} disabled />
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        )}
                                    </Tabs>
                                </ScrollArea>
                                <DialogFooter className="mt-4 pt-4 border-t flex-shrink-0">
                                    <Button onClick={() => setIsViewDialogOpen(false)}>סגור</Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="sm:max-w-md text-right">
                        <DialogHeader>
                            <DialogTitle className="text-right">עריכת פרטי עזיבה</DialogTitle>
                            <DialogDescription className="text-right">
                                עדכון תאריך, סיבה והערות לעזיבת העובד
                            </DialogDescription>
                        </DialogHeader>
                        {employeeToEdit && (
                            <div className="grid gap-4 py-4 w-full">
                                <div className="space-y-2 text-right">
                                    <Label htmlFor="edit_date">תאריך עזיבה *</Label>
                                    <Input
                                        id="edit_date"
                                        type="date"
                                        dir="ltr"
                                        className="text-right"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 text-right">
                                    <Label htmlFor="edit_reason">סיבת עזיבה *</Label>
                                    <Input
                                        id="edit_reason"
                                        className="text-right"
                                        placeholder="הזן סיבת עזיבה (טקסט חופשי)..."
                                        value={editReason}
                                        onChange={(e) => setEditReason(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 text-right">
                                    <Label htmlFor="edit_notes">הערות (אופציונלי)</Label>
                                    <Input
                                        id="edit_notes"
                                        className="text-right"
                                        placeholder="הזן פירוט על סיבת העזיבה"
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter className="w-full flex justify-start space-x-2 space-x-reverse mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                ביטול
                            </Button>
                            <Button onClick={handleEditSave} disabled={editLoading}>
                                {editLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                                שמור שינויים
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <UnauthorizedActionDialog
                    isOpen={isUnauthorizedDialogOpen}
                    onClose={() => setIsUnauthorizedDialogOpen(false)}
                />

            </div>
        </MainLayout>
    );
};

export default LeftEmployees;
