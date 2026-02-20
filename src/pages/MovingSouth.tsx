import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Filter, X, Users, Eye, Edit, Download, Search, ArrowUpDown, ChevronUp, ChevronDown, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

const criticalityLabels: Record<string, string> = {
    '0': '0 - אינו חשוב לארגון',
    '1': '1 - די חשוב לארגון',
    '2': '2 - חשוב לארגון',
    '3': '3 - חשוב מאוד לארגון',
    '4': '4 - קריטי לארגון',
    '5': '5 - קריטי מאוד לארגון',
};

const attritionRiskLabels: Record<string, string> = {
    '0': '0 - בטוח נשאר',
    '1': '1 - סיכוי קטן מאוד לעזיבה',
    '2': '2 - סיכוי קטן לעזיבה',
    '3': '3 - סיכוי סביר לעזיבה',
    '4': '4 - סיכוי גבוה לעזיבה',
    '5': '5 - בטוח יעזוב',
};

const getCriticalityLabel = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'לא מוגדר';
    return criticalityLabels[val.toString()] || val.toString();
};

const getAttritionRiskLabel = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'לא מוגדר';
    return attritionRiskLabels[val.toString()] || val.toString();
};

interface Employee {
    id: string;
    full_name: string;
    job_role_id: string | null;
    project_id: string | null;
    city: string | null;
    start_date: string;
    cost: number | null;
    employing_company_id: string | null;
    professional_experience_years: number | null;
    branch_id: string | null;
    seniority_level_id: string | null;
    birth_date?: string | null;
    attrition_risk?: number | null;
    attrition_risk_reason?: string | null;
    unit_criticality?: number | null;
    salary_raise_date?: string | null;
    salary_raise_percentage?: number | null;
    phone?: string | null;
    emergency_phone?: string | null;
    linkedin_url?: string | null;
    real_market_salary?: number | null;
    revolving_door?: boolean | null;
    leaving_reason_id?: string | null;
    replacement_needed?: string | null;
    retention_plan?: string | null;
    company_retention_plan?: string | null;
    company_attrition_risk?: number | null;
    id_number?: string | null;
    performance_level_id?: string | null;
    performance_update_date?: string | null;
    our_sourcing?: boolean | null;
}

interface NamedEntity {
    id: string;
    name: string;
}

export default function MovingSouth() {
    const navigate = useNavigate();
    const { user, loading: authLoading, isManager } = useAuth();
    const [loading, setLoading] = useState(true);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<NamedEntity[]>([]);
    const [roles, setRoles] = useState<NamedEntity[]>([]);
    const [companies, setCompanies] = useState<NamedEntity[]>([]);
    const [branches, setBranches] = useState<NamedEntity[]>([]);
    const [seniorityLevels, setSeniorityLevels] = useState<NamedEntity[]>([]);
    const [leavingReasons, setLeavingReasons] = useState<NamedEntity[]>([]);
    const [performanceLevels, setPerformanceLevels] = useState<NamedEntity[]>([]);

    // Moving South Table states
    const [movingSouthSearch, setMovingSouthSearch] = useState('');
    const [movingSouthFilterProject, setMovingSouthFilterProject] = useState('all');
    const [movingSouthFilterBranch, setMovingSouthFilterBranch] = useState('all');
    const [movingSouthFilterCriticality, setMovingSouthFilterCriticality] = useState('all');
    const [movingSouthFilterAttritionRisk, setMovingSouthFilterAttritionRisk] = useState('all');
    const [movingSouthFilterReplacement, setMovingSouthFilterReplacement] = useState('all');
    const [movingSouthSortConfig, setMovingSouthSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'attentionScore', direction: 'desc' });

    // Dialog states
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isEmployeeDetailDialogOpen, setIsEmployeeDetailDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Employee>>({});


    const movingSouthColumnsConfig = [
        { id: 'attentionScore', label: 'קריטיות X סיכוי לעזיבה', sortable: true },
        { id: 'unit_criticality', label: 'מידת קריטיות ליחידה', sortable: true },
        { id: 'attrition_risk', label: 'מידת סיכוי לעזיבה', sortable: true },
        { id: 'full_name', label: 'שם העובד', sortable: true },
        { id: 'branchName', label: 'ענף', sortable: true },
        { id: 'projectName', label: 'תכנית', sortable: true },
        { id: 'city', label: 'עיר', sortable: true },
        { id: 'leavingReasonName', label: 'סיבת רצון לעזוב (מפקדים)', sortable: true },
        { id: 'attrition_risk_reason', label: 'סיבת רצון לעזוב (מפקדים)', sortable: true },
        { id: 'company_attrition_risk', label: 'סיכוי לעזוב (חברה)', sortable: true },
        { id: 'company_retention_plan', label: 'התייחסות למעבר דרומה (חברה)', sortable: true },
        { id: 'retention_plan', label: 'תכנית שימור (יחידה)', sortable: true },
        { id: 'replacement_needed', label: 'לגייס במקומו', sortable: true },
    ];

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
        Object.fromEntries(movingSouthColumnsConfig.map(c => [c.id, true]))
    );
    const [columnOrder] = useState<string[]>(movingSouthColumnsConfig.map(c => c.id));

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [employeesRes, projectsRes, rolesRes, companiesRes, branchesRes, seniorityRes, leavingReasonsRes, performanceLevelsRes] = await Promise.all([
                getDocs(collection(db, 'employees')),
                getDocs(collection(db, 'projects')),
                getDocs(collection(db, 'job_roles')),
                getDocs(collection(db, 'employing_companies')),
                getDocs(collection(db, 'branches')),
                getDocs(collection(db, 'seniority_levels')),
                getDocs(collection(db, 'leaving_reasons')),
                getDocs(collection(db, 'performance_levels')),
            ]);

            const mapDocs = (snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            setAllEmployees(mapDocs(employeesRes));
            setProjects(mapDocs(projectsRes));
            setRoles(mapDocs(rolesRes));
            setCompanies(mapDocs(companiesRes));
            setBranches(mapDocs(branchesRes));
            setSeniorityLevels(mapDocs(seniorityRes));
            setLeavingReasons(mapDocs(leavingReasonsRes));
            setPerformanceLevels(mapDocs(performanceLevelsRes));
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('שגיאה בטעינת נתונים');
        } finally {
            setLoading(false);
        }
    };

    const formatToHebrewNumber = (val: number | string | null | undefined) => {
        if (val === null || val === undefined || val === '') return '';
        const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
        if (isNaN(num)) return '';
        return Math.round(num).toLocaleString('he-IL');
    };

    const getLeavingReasonName = (id: string | null | undefined) => {
        if (!id) return '-';
        return leavingReasons.find(r => r.id === id)?.name || '-';
    };


    const movingSouthTableData = useMemo(() => {
        let data = allEmployees
            .map((emp) => ({
                ...emp,
                roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
                branchName: branches.find((b) => b.id === emp.branch_id)?.name || 'לא מוגדר',
                projectName: projects.find((p) => p.id === emp.project_id)?.name || 'לא משויך',
                leavingReasonName: leavingReasons.find((r) => r.id === emp.leaving_reason_id)?.name || 'לא מוגדר',
                attentionScore: (emp.unit_criticality ?? 0) * (emp.attrition_risk ?? 0),
            }));

        if (movingSouthSearch) {
            const search = movingSouthSearch.toLowerCase();
            data = data.filter(emp =>
                emp.full_name.toLowerCase().includes(search) ||
                emp.projectName.toLowerCase().includes(search) ||
                emp.branchName.toLowerCase().includes(search) ||
                emp.city?.toLowerCase().includes(search) ||
                emp.leavingReasonName.toLowerCase().includes(search)
            );
        }

        if (movingSouthFilterProject !== 'all') {
            data = data.filter(emp => emp.project_id === movingSouthFilterProject);
        }
        if (movingSouthFilterBranch !== 'all') {
            data = data.filter(emp => emp.branch_id === movingSouthFilterBranch);
        }
        if (movingSouthFilterCriticality !== 'all') {
            data = data.filter(emp => emp.unit_criticality?.toString() === movingSouthFilterCriticality);
        }
        if (movingSouthFilterAttritionRisk !== 'all') {
            data = data.filter(emp => emp.attrition_risk?.toString() === movingSouthFilterAttritionRisk);
        }
        if (movingSouthFilterReplacement !== 'all') {
            data = data.filter(emp => emp.replacement_needed === movingSouthFilterReplacement);
        }

        if (movingSouthSortConfig) {
            data.sort((a, b) => {
                const key = movingSouthSortConfig.key as keyof typeof a;
                const aVal = a[key];
                const bVal = b[key];

                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                const modifier = movingSouthSortConfig.direction === 'asc' ? 1 : -1;

                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return aVal.localeCompare(bVal, 'he') * modifier;
                }
                return ((aVal as any) - (bVal as any)) * modifier;
            });
        }

        return data;
    }, [allEmployees, roles, branches, projects, leavingReasons, movingSouthSearch, movingSouthSortConfig, movingSouthFilterProject, movingSouthFilterBranch, movingSouthFilterCriticality, movingSouthFilterAttritionRisk, movingSouthFilterReplacement]);

    const toggleSort = (key: string) => {
        setMovingSouthSortConfig(prev => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const handleExportToExcel = () => {
        const dataToExport = movingSouthTableData.map(emp => ({
            'קריטיות X סיכוי לעזיבה': emp.attentionScore,
            'מידת קריטיות ליחידה': emp.unit_criticality || 0,
            'מידת סיכוי לעזיבה': emp.attrition_risk || 0,
            'לגייס במקומו': emp.replacement_needed || '-',
            'שם העובד': emp.full_name,
            'ענף': emp.branchName,
            'תכנית': emp.projectName,
            'עיר': emp.city || '-',
            'סיבת רצון לעזוב (מפקדים) - קטגוריה': emp.leavingReasonName,
            'סיבת רצון לעזוב (מפקדים) - מלל חופשי': emp.attrition_risk_reason || '-',
            'תכנית שימור (יחידה)': emp.retention_plan || '-',
            'סיכוי לעזוב (חברה)': emp.company_attrition_risk || 0,
            'התייחסות למעבר דרומה (חברה)': emp.company_retention_plan || '-',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Moving South");
        XLSX.writeFile(workbook, "report_moving_south.xlsx");
        toast.success('דוח אקסל יוצא בהצלחה');
    };

    const openEmployeeDetailDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsEmployeeDetailDialogOpen(true);
    };

    const handleOpenEdit = (emp: Employee) => {
        setEditFormData(emp);
        setIsEditDialogOpen(true);
    };

    const handleUpdateEmployee = async () => {
        if (!editFormData.id) return;
        try {
            const empRef = doc(db, 'employees', editFormData.id);
            const { id, roleName, branchName, projectName, leavingReasonName, attentionScore, ...updateData } = editFormData as any;
            await updateDoc(empRef, updateData);
            setAllEmployees(prev => prev.map(e => e.id === editFormData.id ? { ...e, ...updateData } : e));
            setIsEditDialogOpen(false);
            toast.success('נתוני העובד עודכנו בהצלחה');
        } catch (error) {
            console.error('Error updating employee:', error);
            toast.error('שגיאה בעדכון נתוני העובד');
        }
    };


    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <MainLayout>
            {loading ? (
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">מעבר דרומה</h1>
                            <p className="text-muted-foreground mt-1">ניהול וניתוח מעבר דרומה</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" onClick={handleExportToExcel} className="gap-2">
                                <Download className="w-4 h-4 ml-2" />
                                ייצוא לאקסל
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Settings2 className="w-4 h-4 ml-2" />
                                        ניהול עמודות
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 text-right">
                                    {movingSouthColumnsConfig.map((col) => (
                                        <DropdownMenuCheckboxItem
                                            key={col.id}
                                            className="text-right"
                                            checked={visibleColumns[col.id]}
                                            onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [col.id]: !!checked }))}
                                        >
                                            {col.label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="חיפוש חופשי..."
                                    className="pr-10"
                                    value={movingSouthSearch}
                                    onChange={(e) => setMovingSouthSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Select value={movingSouthFilterProject} onValueChange={setMovingSouthFilterProject}>
                                    <SelectTrigger className="w-[180px] text-right"><SelectValue placeholder="פילטר תכנית" /></SelectTrigger>
                                    <SelectContent className="text-right">
                                        <SelectItem value="all" className="text-right">כל התכניות</SelectItem>
                                        {projects.map(p => (<SelectItem key={p.id} value={p.id} className="text-right">{p.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <Select value={movingSouthFilterBranch} onValueChange={setMovingSouthFilterBranch}>
                                    <SelectTrigger className="w-[180px] text-right"><SelectValue placeholder="פילטר ענף" /></SelectTrigger>
                                    <SelectContent className="text-right">
                                        <SelectItem value="all" className="text-right">כל הענפים</SelectItem>
                                        {branches.map(b => (<SelectItem key={b.id} value={b.id} className="text-right">{b.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <Select value={movingSouthFilterCriticality} onValueChange={setMovingSouthFilterCriticality}>
                                    <SelectTrigger className="w-[180px] text-right"><SelectValue placeholder="פילטר קריטיות" /></SelectTrigger>
                                    <SelectContent className="text-right">
                                        <SelectItem value="all" className="text-right">כל רמות הקריטיות</SelectItem>
                                        {Object.entries(criticalityLabels).map(([val, label]) => (<SelectItem key={val} value={val} className="text-right">{label}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <Select value={movingSouthFilterAttritionRisk} onValueChange={setMovingSouthFilterAttritionRisk}>
                                    <SelectTrigger className="w-[180px] text-right"><SelectValue placeholder="פילטר סיכוי לעזיבה" /></SelectTrigger>
                                    <SelectContent className="text-right">
                                        <SelectItem value="all" className="text-right">כל רמות הסיכוי</SelectItem>
                                        {Object.entries(attritionRiskLabels).map(([val, label]) => (<SelectItem key={val} value={val} className="text-right">{label}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <Select value={movingSouthFilterReplacement} onValueChange={setMovingSouthFilterReplacement}>
                                    <SelectTrigger className="w-[180px] text-right"><SelectValue placeholder="פילטר לגייס במקומו" /></SelectTrigger>
                                    <SelectContent className="text-right">
                                        <SelectItem value="all" className="text-right">הכל (גיוס חליפי)</SelectItem>
                                        <SelectItem value="כן" className="text-right">כן</SelectItem>
                                        <SelectItem value="לא" className="text-right">לא</SelectItem>
                                        <SelectItem value="טרם הוחלט" className="text-right">טרם הוחלט</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="table-container bg-card border rounded-lg overflow-hidden">
                        <div className="h-[600px] w-full overflow-auto relative scrollbar-always-visible" dir="rtl">
                            <div className="min-w-max">
                                <Table className="border-separate border-spacing-0" noWrapper>
                                    <TableHeader className="sticky top-0 z-30 shadow-sm">
                                        <TableRow>
                                            {movingSouthColumnsConfig.map(col => {
                                                if (!visibleColumns[col.id]) return null;
                                                return (
                                                    <TableHead key={col.id} className="text-right whitespace-normal px-4 py-3 border-b min-w-[140px] max-w-[180px] align-top bg-muted/95 backdrop-blur-sm sticky top-0 z-10">
                                                        <Button variant="ghost" className="h-auto gap-2 p-0 hover:bg-transparent font-semibold text-foreground group text-right flex items-start whitespace-normal w-full" onClick={() => toggleSort(col.id)}>
                                                            <span className="leading-tight flex-1">{col.label}</span>
                                                            {movingSouthSortConfig?.key === col.id ? (
                                                                movingSouthSortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-primary shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                            ) : (
                                                                <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity shrink-0 mt-0.5" />
                                                            )}
                                                        </Button>
                                                    </TableHead>
                                                );
                                            })}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {movingSouthTableData.map((emp) => (
                                            <TableRow
                                                key={emp.id}
                                                className="hover:bg-muted/30 transition-colors group cursor-pointer"
                                                onClick={() => handleOpenEdit(emp)}
                                            >
                                                {movingSouthColumnsConfig.map(col => {
                                                    if (!visibleColumns[col.id]) return null;
                                                    let content: any = (emp as any)[col.id];
                                                    if (col.id === 'unit_criticality') content = getCriticalityLabel(emp.unit_criticality);
                                                    if (col.id === 'attrition_risk') content = getAttritionRiskLabel(emp.attrition_risk);
                                                    return (
                                                        <TableCell key={col.id} className={`text-right px-4 py-3 whitespace-nowrap border-b ${col.id === 'attentionScore' ? 'font-bold text-primary' : ''}`}>
                                                            {content ?? '-'}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    {/* Employee Detail Dialog */}
                    <Dialog open={isEmployeeDetailDialogOpen} onOpenChange={setIsEmployeeDetailDialogOpen}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <DialogHeader className="text-right">
                                <DialogTitle>פרטי עובד: {selectedEmployee?.full_name}</DialogTitle>
                            </DialogHeader>
                            {selectedEmployee && (
                                <ScrollArea className="flex-1 p-4">
                                    <Tabs defaultValue="retention" dir="rtl">
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="general">כללי</TabsTrigger>
                                            <TabsTrigger value="performance">ביצועים ושכר</TabsTrigger>
                                            <TabsTrigger value="retention">שימור</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="general" className="space-y-4 pt-4">
                                            <div className="grid grid-cols-2 gap-4 text-right">
                                                <div><Label>שם מלא</Label><Input value={selectedEmployee.full_name} disabled className="bg-muted" /></div>
                                                <div><Label>תפקיד</Label><Input value={roles.find(r => r.id === selectedEmployee.job_role_id)?.name || '-'} disabled className="bg-muted" /></div>
                                                <div><Label>תכנית</Label><Input value={projects.find(p => p.id === selectedEmployee.project_id)?.name || '-'} disabled className="bg-muted" /></div>
                                                <div><Label>ענף</Label><Input value={branches.find(b => b.id === selectedEmployee.branch_id)?.name || '-'} disabled className="bg-muted" /></div>
                                                <div><Label>עיר</Label><Input value={selectedEmployee.city || '-'} disabled className="bg-muted" /></div>
                                                <div><Label>תאריך תחילת עבודה</Label><Input value={selectedEmployee.start_date || '-'} disabled className="bg-muted" /></div>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="performance" className="space-y-4 pt-4 text-right">
                                            <div className="grid grid-cols-2 gap-4">
                                                {isManager && (
                                                    <>
                                                        <div><Label>עלות חודשית</Label><Input value={formatToHebrewNumber(selectedEmployee.cost)} disabled className="bg-muted" /></div>
                                                        <div><Label>שכר שוק ריאלי</Label><Input value={formatToHebrewNumber(selectedEmployee.real_market_salary)} disabled className="bg-muted" /></div>
                                                    </>
                                                )}
                                                <div><Label>רמת ביצועים</Label><Input value={performanceLevels.find(l => l.id === selectedEmployee.performance_level_id)?.name || 'לא מוגדר'} disabled className="bg-muted" /></div>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="retention" className="space-y-4 pt-4 text-right">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><Label>רמת קריטיות</Label><Input value={getCriticalityLabel(selectedEmployee.unit_criticality)} disabled className="bg-muted" /></div>
                                                <div><Label>סיכוי לעזיבה</Label><Input value={getAttritionRiskLabel(selectedEmployee.attrition_risk)} disabled className="bg-muted" /></div>
                                                <div className="col-span-2"><Label>סיבת רצון לעזוב (קטגוריות)</Label><Input value={getLeavingReasonName(selectedEmployee.leaving_reason_id)} disabled className="bg-muted" /></div>
                                                <div className="col-span-2"><Label>סיבת רצון לעזוב (מלל חופשי)</Label><Input value={selectedEmployee.attrition_risk_reason || '-'} disabled className="bg-muted" /></div>
                                                <div className="col-span-2"><Label>תכנית שימור (יחידה)</Label><Input value={selectedEmployee.retention_plan || '-'} disabled className="bg-muted" /></div>
                                                <div><Label>לגייס במקומו?</Label><Input value={selectedEmployee.replacement_needed || '-'} disabled className="bg-muted" /></div>
                                                <div><Label>סיכוי לעזוב (חברה)</Label><Input value={selectedEmployee.company_attrition_risk || '-'} disabled className="bg-muted" /></div>
                                                <div className="col-span-2"><Label>התייחסות למעבר דרומה (חברה)</Label><Input value={selectedEmployee.company_retention_plan || '-'} disabled className="bg-muted" /></div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </ScrollArea>
                            )}
                            <DialogFooter className="p-4 border-t">
                                <Button onClick={() => setIsEmployeeDetailDialogOpen(false)}>סגור</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Employee Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <DialogHeader className="text-right">
                                <DialogTitle>עריכת נתוני מעבר דרומה: {editFormData?.full_name}</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="flex-1 p-4">
                                <div className="grid grid-cols-2 gap-6 text-right" dir="rtl">
                                    <div className="space-y-2">
                                        <Label>מידת קריטיות ליחידה</Label>
                                        <Select value={editFormData.unit_criticality?.toString()} onValueChange={v => setEditFormData(p => ({ ...p, unit_criticality: parseInt(v) }))}>
                                            <SelectTrigger className="text-right"><SelectValue placeholder="בחר רמה" /></SelectTrigger>
                                            <SelectContent className="text-right">
                                                {Object.entries(criticalityLabels).map(([v, l]) => <SelectItem key={v} value={v} className="text-right">{l}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>מידת סיכוי לעזיבה</Label>
                                        <Select value={editFormData.attrition_risk?.toString()} onValueChange={v => setEditFormData(p => ({ ...p, attrition_risk: parseInt(v) }))}>
                                            <SelectTrigger className="text-right"><SelectValue placeholder="בחר רמה" /></SelectTrigger>
                                            <SelectContent className="text-right">
                                                {Object.entries(attritionRiskLabels).map(([v, l]) => <SelectItem key={v} value={v} className="text-right">{l}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>סיבת רצון לעזוב (קטגוריות)</Label>
                                        <Select value={editFormData.leaving_reason_id || undefined} onValueChange={v => setEditFormData(p => ({ ...p, leaving_reason_id: v }))}>
                                            <SelectTrigger className="text-right"><SelectValue placeholder="בחר סיבה" /></SelectTrigger>
                                            <SelectContent className="text-right">
                                                {leavingReasons.map(r => <SelectItem key={r.id} value={r.id} className="text-right">{r.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>סיבת רצון לעזוב (מלל חופשי)</Label>
                                        <Input value={editFormData.attrition_risk_reason || ''} onChange={e => setEditFormData(p => ({ ...p, attrition_risk_reason: e.target.value }))} className="text-right" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>תכנית שימור (יחידה)</Label>
                                        <Input value={editFormData.retention_plan || ''} onChange={e => setEditFormData(p => ({ ...p, retention_plan: e.target.value }))} className="text-right" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>לגייס במקומו?</Label>
                                        <Select value={editFormData.replacement_needed || undefined} onValueChange={v => setEditFormData(p => ({ ...p, replacement_needed: v }))}>
                                            <SelectTrigger className="text-right"><SelectValue placeholder="בחר" /></SelectTrigger>
                                            <SelectContent className="text-right">
                                                <SelectItem value="כן" className="text-right">כן</SelectItem>
                                                <SelectItem value="לא" className="text-right">לא</SelectItem>
                                                <SelectItem value="טרם הוחלט" className="text-right">טרם הוחלט</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>סיכוי לעזיבה (חברה)</Label>
                                        <Select value={editFormData.company_attrition_risk?.toString()} onValueChange={v => setEditFormData(p => ({ ...p, company_attrition_risk: parseInt(v) }))}>
                                            <SelectTrigger className="text-right"><SelectValue placeholder="בחר רמה" /></SelectTrigger>
                                            <SelectContent className="text-right">
                                                {Object.entries(attritionRiskLabels).map(([v, l]) => <SelectItem key={v} value={v} className="text-right">{l}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>התייחסות למעבר דרומה (חברה)</Label>
                                        <Input value={editFormData.company_retention_plan || ''} onChange={e => setEditFormData(p => ({ ...p, company_retention_plan: e.target.value }))} className="text-right" />
                                    </div>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-4 border-t gap-2">
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>ביטול</Button>
                                <Button onClick={handleUpdateEmployee}>שמור שינויים</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </div>
            )}
        </MainLayout>
    );
}
