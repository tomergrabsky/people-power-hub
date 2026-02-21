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
import { Loader2, Filter, X, Users, Eye, Edit, Download, Search, ArrowUpDown, ChevronUp, ChevronDown, Settings2, RotateCcw, Move, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFormFieldOrder } from '@/hooks/useFormFieldOrder';
import { DraggableFormContainer } from '@/components/employees/DraggableFormContainer';

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

const formatToHebrewNumber = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(num)) return '';
    return Math.round(num).toLocaleString('he-IL');
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
    const [jobRoles, setJobRoles] = useState<NamedEntity[]>([]);
    const [employingCompanies, setEmployingCompanies] = useState<NamedEntity[]>([]);
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
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [isDragMode, setIsDragMode] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const { isSuperAdmin } = useAuth();

    const defaultFieldOrder = useMemo(() => [
        'row_fullname_jobrole',
        'row_project_branch',
        'row_company_experience',
        'row_city_startdate',
        'row_birthdate_phone',
        'row_emergency_phone',
        'row_seniority',
        'row_linkedin',
        'row_revolving_door',
        'row_unit_criticality',
        'row_risk_reason_unit',
        'row_attrition_reason',
        'row_retention_plan',
        'row_commander_summary',
        'row_replacement_needed',
        'row_attrition_risk_company',
        'row_company_retention_plan',
        'row_cost',
        'row_salary_estimates',
        'row_salary_percentage_date',
        'row_performance_combined',
    ], []);

    const { fieldOrder, updateOrder, resetOrder, isLoading: isFieldOrderLoading } = useFormFieldOrder('employee_form', defaultFieldOrder);

    const [formData, setFormData] = useState<any>({
        full_name: '',
        job_role_id: '',
        professional_experience_years: 0,
        project_id: '',
        city: '',
        start_date: '',
        birth_date: '',
        cost: '',
        employing_company_id: '',
        branch_id: '',
        phone: '',
        emergency_phone: '',
        seniority_level_id: '',
        attrition_risk: '',
        attrition_risk_reason: '',
        unit_criticality: '',
        salary_raise_date: '',
        salary_raise_percentage: '',
        linkedin_url: '',
        real_market_salary: '',
        revolving_door: '',
        our_sourcing: '',
        leaving_reason_id: '',
        retention_plan: '',
        commander_summary_and_status: '',
        company_retention_plan: '',
        company_attrition_risk: '',
        performance_level_id: '',
        performance_update_date: '',
    });


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
        { id: 'commander_summary_and_status', label: 'סיכום מפקד יחידה וסטטוס', sortable: true },
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
            setJobRoles(mapDocs(rolesRes));
            setEmployingCompanies(mapDocs(companiesRes));
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

    const getLeavingReasonName = (reasonId: string | null | undefined) => {
        if (!reasonId) return '-';
        const reason = leavingReasons.find(r => r.id === reasonId);
        return reason?.name || '-';
    };

    const getPerformanceLevelName = (levelId: string | null | undefined) => {
        if (!levelId) return '-';
        const level = performanceLevels.find(l => l.id === levelId);
        return level?.name || '-';
    };

    const getRoleName = (roleId: string | null) => {
        if (!roleId) return '-';
        const role = jobRoles.find(r => r.id === roleId);
        return role?.name || '-';
    };

    const getProjectName = (projectId: string | null) => {
        if (!projectId) return '-';
        const project = projects.find(p => p.id === projectId);
        return project?.name || '-';
    };

    const getBranchName = (branchId: string | null | undefined) => {
        if (!branchId) return '-';
        const branch = branches.find(b => b.id === branchId);
        return branch?.name || '-';
    };

    const getEmployingCompanyName = (companyId: string | null | undefined) => {
        if (!companyId) return '-';
        const company = employingCompanies.find(c => c.id === companyId);
        return company?.name || '-';
    };

    const getSeniorityLevelName = (levelId: string | null | undefined) => {
        if (!levelId) return '-';
        const level = seniorityLevels.find(s => s.id === levelId);
        return level?.name || '-';
    };

    const getOrganizationExperienceYears = (startDate: string) => {
        if (!startDate) return 0;
        const start = new Date(startDate);
        const today = new Date();
        const diffTime = today.getTime() - start.getTime();
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
        return Math.max(0, Math.round(diffYears * 10) / 10);
    };

    const movingSouthTableData = useMemo(() => {
        let data = allEmployees
            .map((emp) => ({
                ...emp,
                roleName: jobRoles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
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
    }, [allEmployees, jobRoles, branches, projects, leavingReasons, movingSouthSearch, movingSouthSortConfig, movingSouthFilterProject, movingSouthFilterBranch, movingSouthFilterCriticality, movingSouthFilterAttritionRisk, movingSouthFilterReplacement]);

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
        setIsViewDialogOpen(true);
    };

    const handleOpenEdit = (emp: Employee) => {
        setSelectedEmployee(emp);
        setFormData({
            ...emp,
            cost: emp.cost?.toString() || '',
            attrition_risk: emp.attrition_risk?.toString() || '',
            unit_criticality: emp.unit_criticality?.toString() || '',
            company_attrition_risk: emp.company_attrition_risk?.toString() || '',
            salary_raise_percentage: emp.salary_raise_percentage?.toString() || '',
            revolving_door: emp.revolving_door?.toString() || '',
            our_sourcing: emp.our_sourcing?.toString() || '',
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdateEmployee = async () => {
        if (!formData.id) return;
        setFormLoading(true);
        try {
            const empRef = doc(db, 'employees', formData.id);
            const updateData = {
                ...formData,
                cost: formData.cost ? parseFloat(formData.cost.toString().replace(/,/g, '')) : null,
                attrition_risk: formData.attrition_risk ? parseInt(formData.attrition_risk) : null,
                unit_criticality: formData.unit_criticality ? parseInt(formData.unit_criticality) : null,
                company_attrition_risk: formData.company_attrition_risk ? parseInt(formData.company_attrition_risk) : null,
                salary_raise_percentage: formData.salary_raise_percentage ? parseFloat(formData.salary_raise_percentage) : null,
                revolving_door: formData.revolving_door === 'true',
                our_sourcing: formData.our_sourcing === 'true',
                updated_at: new Date().toISOString()
            };

            // Remove helper fields that shouldn't be in Firestore
            delete (updateData as any).roleName;
            delete (updateData as any).branchName;
            delete (updateData as any).projectName;
            delete (updateData as any).leavingReasonName;
            delete (updateData as any).attentionScore;

            await updateDoc(empRef, updateData);
            setAllEmployees(prev => prev.map(e => e.id === formData.id ? { ...e, ...updateData } : e));
            setIsEditDialogOpen(false);
            toast.success('נתוני העובד עודכנו בהצלחה');
        } catch (error) {
            console.error('Error updating employee:', error);
            toast.error('שגיאה בעדכון נתוני העובד');
        } finally {
            setFormLoading(false);
        }
    };

    const formFields = useMemo(() => [
        {
            id: 'row_fullname_jobrole',
            label: 'שם מלא ותפקיד',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="full_name">שם מלא *</Label>
                        <Input
                            id="full_name"
                            className="text-right"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="job_role">תפקיד</Label>
                        <Select
                            value={formData.job_role_id}
                            onValueChange={(value) => setFormData({ ...formData, job_role_id: value })}
                        >
                            <SelectTrigger className="text-right">
                                <SelectValue placeholder="בחר תפקיד" />
                            </SelectTrigger>
                            <SelectContent>
                                {jobRoles.map((role) => (
                                    <SelectItem key={role.id} value={role.id} className="text-right">{role.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            ),
        },
        {
            id: 'row_project_branch',
            label: 'תכנית וענף',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="project">תכנית</Label>
                        <Select
                            value={formData.project_id}
                            onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                        >
                            <SelectTrigger className="text-right">
                                <SelectValue placeholder="בחר תכנית" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id} className="text-right">{project.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="branch_id">ענף *</Label>
                        <Select
                            value={formData.branch_id}
                            onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                        >
                            <SelectTrigger className="text-right">
                                <SelectValue placeholder="בחר ענף" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id} className="text-right">{branch.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            ),
        },
        {
            id: 'row_company_experience',
            label: 'חברה מעסיקה וותק',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="employing_company_id">חברה מעסיקה</Label>
                        <Select
                            value={formData.employing_company_id}
                            onValueChange={(value) => setFormData({ ...formData, employing_company_id: value })}
                        >
                            <SelectTrigger className="text-right">
                                <SelectValue placeholder="בחר חברה מעסיקה" />
                            </SelectTrigger>
                            <SelectContent drop-shadow-lg>
                                {employingCompanies.map((company) => (
                                    <SelectItem key={company.id} value={company.id} className="text-right">{company.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="professional_exp">ותק במקצוע (שנים)</Label>
                        <Input
                            id="professional_exp"
                            className="text-right"
                            type="number"
                            min="0"
                            value={formData.professional_experience_years}
                            onChange={(e) => setFormData({ ...formData, professional_experience_years: parseInt(e.target.value) || 0 })}
                            dir="ltr"
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_city_startdate',
            label: 'עיר ותאריך התחלה',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="city">עיר מגורים</Label>
                        <Input
                            id="city"
                            className="text-right"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="start_date">תאריך תחילת עבודה ביחידה *</Label>
                        <Input
                            id="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            dir="ltr"
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_birthdate_phone',
            label: 'תאריך לידה וטלפון',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="birth_date">תאריך לידה</Label>
                        <Input
                            id="birth_date"
                            type="date"
                            value={formData.birth_date}
                            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                            dir="ltr"
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="phone">מספר טלפון</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            dir="ltr"
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_emergency_phone',
            label: 'טלפון חירום',
            component: (
                <div className="space-y-2 text-right">
                    <Label htmlFor="emergency_phone">טלפון חירום</Label>
                    <Input
                        id="emergency_phone"
                        type="tel"
                        value={formData.emergency_phone}
                        onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                        dir="ltr"
                    />
                </div>
            ),
        },
        {
            id: 'row_performance_combined',
            label: 'ביצועים ועדכון',
            isManagerOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="performance_level_id">ביצועי העובד</Label>
                        <Select
                            value={formData.performance_level_id || ''}
                            onValueChange={(value) => setFormData({
                                ...formData,
                                performance_level_id: value,
                                performance_update_date: new Date().toISOString().split('T')[0]
                            })}
                        >
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue placeholder="בחר רמת ביצועים" />
                            </SelectTrigger>
                            <SelectContent drop-shadow-lg>
                                {performanceLevels.map((level) => (
                                    <SelectItem key={level.id} value={level.id} className="text-right">{level.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="performance_update_date">תאריך עדכון ביצועים</Label>
                        <Input
                            id="performance_update_date"
                            className="text-right bg-muted"
                            value={formData.performance_update_date ? new Date(formData.performance_update_date).toLocaleDateString('he-IL') : 'טרם עודכן'}
                            disabled
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_seniority',
            label: 'סניוריטי',
            component: (
                <div className="space-y-2 text-right">
                    <Label htmlFor="seniority_level_id">סניוריטי</Label>
                    <Select
                        value={formData.seniority_level_id}
                        onValueChange={(value) => setFormData({ ...formData, seniority_level_id: value })}
                    >
                        <SelectTrigger className="text-right">
                            <SelectValue placeholder="בחר רמת ותק" />
                        </SelectTrigger>
                        <SelectContent drop-shadow-lg>
                            {seniorityLevels.map((level) => (
                                <SelectItem key={level.id} value={level.id} className="text-right">{level.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ),
        },
        {
            id: 'row_cost',
            label: 'עלות',
            isManagerOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="cost">עלות העובד בחודש (₪) - כולל מע"מ</Label>
                        <Input
                            id="cost"
                            type="text"
                            value={formData.cost ? formatToHebrewNumber(formData.cost) : ''}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^\d]/g, '');
                                setFormData({ ...formData, cost: val });
                            }}
                            className="text-right"
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_unit_criticality',
            label: 'קריטיות ליחידה',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label htmlFor="unit_criticality">קריטיות ליחידה (0-5)</Label>
                    <Select
                        value={formData.unit_criticality}
                        onValueChange={(value) => setFormData({ ...formData, unit_criticality: value })}
                    >
                        <SelectTrigger className="text-right">
                            <SelectValue placeholder="בחר רמת קריטיות" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" drop-shadow-lg>
                            <SelectItem value="0" className="text-right">0 - אינו חשוב לארגון</SelectItem>
                            <SelectItem value="1" className="text-right">1 - די חשוב לארגון</SelectItem>
                            <SelectItem value="2" className="text-right">2 - חשוב לארגון</SelectItem>
                            <SelectItem value="3" className="text-right">3 - חשוב מאוד לארגון</SelectItem>
                            <SelectItem value="4" className="text-right">4 - קריטי לארגון</SelectItem>
                            <SelectItem value="5" className="text-right">5 - קריטי מאוד לארגון</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            ),
        },
        {
            id: 'row_attrition_risk_company',
            label: 'סיכוי לעזוב - לדעת החברה',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label htmlFor="company_attrition_risk">סיכוי לעזוב - לדעת החברה (0-5)</Label>
                    <Select
                        value={formData.company_attrition_risk}
                        onValueChange={(value) => setFormData({ ...formData, company_attrition_risk: value })}
                    >
                        <SelectTrigger className="text-right" dir="rtl">
                            <SelectValue placeholder="בחר רמת סיכוי" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" drop-shadow-lg>
                            <SelectItem value="0" className="text-right">0 - בטוח נשאר</SelectItem>
                            <SelectItem value="1" className="text-right">1 - סיכוי קטן מאוד לעזיבה</SelectItem>
                            <SelectItem value="2" className="text-right">2 - סיכוי קטן לעזיבה</SelectItem>
                            <SelectItem value="3" className="text-right">3 - סיכוי סביר לעזיבה</SelectItem>
                            <SelectItem value="4" className="text-right">4 - סיכוי גבוה לעזיבה</SelectItem>
                            <SelectItem value="5" className="text-right">5 - בטוח יעזוב</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            ),
        },
        {
            id: 'row_risk_reason_unit',
            label: 'סיכוי וסיבת עזיבה - יחידה',
            isManagerOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="attrition_risk">סיכוי לעזוב - לדעת היחידה (0-5)</Label>
                        <Select
                            value={formData.attrition_risk}
                            onValueChange={(value) => setFormData({ ...formData, attrition_risk: value })}
                        >
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue placeholder="בחר רמת סיכוי" />
                            </SelectTrigger>
                            <SelectContent dir="rtl" drop-shadow-lg>
                                <SelectItem value="0" className="text-right">0 - בטוח נשאר</SelectItem>
                                <SelectItem value="1" className="text-right">1 - סיכוי קטן מאוד לעזיבה</SelectItem>
                                <SelectItem value="2" className="text-right">2 - סיכוי קטן לעזיבה</SelectItem>
                                <SelectItem value="3" className="text-right">3 - סיכוי סביר לעזיבה</SelectItem>
                                <SelectItem value="4" className="text-right">4 - סיכוי גבוה לעזיבה</SelectItem>
                                <SelectItem value="5" className="text-right">5 - בטוח יעזוב</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="leaving_reason_id">סיבת רצון לעזוב - קטגוריות</Label>
                        <Select
                            value={formData.leaving_reason_id}
                            onValueChange={(value) => setFormData({ ...formData, leaving_reason_id: value })}
                        >
                            <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue placeholder="בחר סיבה" />
                            </SelectTrigger>
                            <SelectContent drop-shadow-lg>
                                {leavingReasons.map((reason) => (
                                    <SelectItem key={reason.id} value={reason.id} className="text-right">{reason.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            ),
        },
        {
            id: 'row_attrition_reason',
            label: 'סיבת רצון לעזוב - מלל חופשי',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label htmlFor="attrition_risk_reason">סיבת רצון לעזוב - מלל חופשי</Label>
                    <Input
                        id="attrition_risk_reason"
                        className="text-right"
                        value={formData.attrition_risk_reason}
                        onChange={(e) => setFormData({ ...formData, attrition_risk_reason: e.target.value })}
                        placeholder="הזן סיבה..."
                    />
                </div>
            ),
        },
        {
            id: 'row_retention_plan',
            label: 'תכנית שימור - מבחינת היחידה',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label htmlFor="retention_plan">תכנית שימור - מבחינת היחידה</Label>
                    <Input
                        id="retention_plan"
                        className="text-right"
                        value={formData.retention_plan}
                        onChange={(e) => setFormData({ ...formData, retention_plan: e.target.value })}
                        placeholder="הזן תכנית שימור..."
                    />
                </div>
            ),
        },
        {
            id: 'row_commander_summary',
            label: 'סיכום מפקד יחידה וסטטוס',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label htmlFor="commander_summary_and_status">סיכום מפקד יחידה וסטטוס</Label>
                    <Input
                        id="commander_summary_and_status"
                        className="text-right"
                        value={formData.commander_summary_and_status || ''}
                        onChange={(e) => setFormData({ ...formData, commander_summary_and_status: e.target.value })}
                        placeholder="הזן סיכום מפקד..."
                    />
                </div>
            ),
        },
        {
            id: 'row_replacement_needed',
            label: 'לגייס במקומו?',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label htmlFor="replacement_needed">לגייס במקומו?</Label>
                    <Select
                        value={formData.replacement_needed}
                        onValueChange={(value) => setFormData({ ...formData, replacement_needed: value })}
                    >
                        <SelectTrigger className="text-right" dir="rtl">
                            <SelectValue placeholder="בחר אפשרות" />
                        </SelectTrigger>
                        <SelectContent dir="rtl" drop-shadow-lg>
                            <SelectItem value="כן" className="text-right">כן</SelectItem>
                            <SelectItem value="לא" className="text-right">לא</SelectItem>
                            <SelectItem value="טרם הוחלט" className="text-right">טרם הוחלט</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            ),
        },
        {
            id: 'row_company_retention_plan',
            label: 'התיחסות חברה למעבר דרומה',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label htmlFor="company_retention_plan">התיחסות חברה למעבר דרומה</Label>
                    <Input
                        id="company_retention_plan"
                        className="text-right"
                        value={formData.company_retention_plan}
                        onChange={(e) => setFormData({ ...formData, company_retention_plan: e.target.value })}
                        placeholder="הזן התיחסות..."
                    />
                </div>
            ),
        },
        {
            id: 'row_salary_percentage_date',
            label: 'תאריך ואחוז העלאת שכר',
            isManagerOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="salary_raise_date">תאריך העלאת שכר</Label>
                        <Input
                            id="salary_raise_date"
                            type="date"
                            value={formData.salary_raise_date}
                            onChange={(e) => setFormData({ ...formData, salary_raise_date: e.target.value })}
                            className="text-right"
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="salary_raise_percentage">אחוז העלאת שכר (%)</Label>
                        <Input
                            id="salary_raise_percentage"
                            type="text"
                            value={formData.salary_raise_percentage ? formatToHebrewNumber(formData.salary_raise_percentage) : ''}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^\d]/g, '');
                                setFormData({ ...formData, salary_raise_percentage: val });
                            }}
                            className="text-right"
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_linkedin',
            label: 'קישור ללינקדאין',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right col-span-2">
                        <Label htmlFor="linkedin_url">קישור ללינקדאין</Label>
                        <Input
                            id="linkedin_url"
                            type="url"
                            maxLength={200}
                            className="text-right"
                            placeholder="https://linkedin.com/in/..."
                            value={formData.linkedin_url}
                            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_revolving_door',
            label: 'דלת מסתובבת ואיתור',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="our_sourcing">איתור שלנו?</Label>
                        <Select
                            value={formData.our_sourcing}
                            onValueChange={(value) => setFormData({ ...formData, our_sourcing: value })}
                        >
                            <SelectTrigger className="text-right">
                                <SelectValue placeholder="בחר" />
                            </SelectTrigger>
                            <SelectContent drop-shadow-lg>
                                <SelectItem value="true" className="text-right">כן</SelectItem>
                                <SelectItem value="false" className="text-right">לא</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="revolving_door">דלת מסתובבת</Label>
                        <Select
                            value={formData.revolving_door}
                            onValueChange={(value) => setFormData({ ...formData, revolving_door: value })}
                        >
                            <SelectTrigger className="text-right">
                                <SelectValue placeholder="בחר" />
                            </SelectTrigger>
                            <SelectContent drop-shadow-lg>
                                <SelectItem value="true" className="text-right">כן</SelectItem>
                                <SelectItem value="false" className="text-right">לא</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            ),
        },

        {
            id: 'row_salary_estimates',
            label: 'הערכות שכר',
            isSuperAdminOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>שכר חודשי משוער (₪)</Label>
                        <Input
                            className="text-right bg-muted"
                            value={formData.cost ? `₪${formatToHebrewNumber(Math.round(parseFloat(formData.cost) / 1.4 / 1.1 / 1.18))}` : '-'}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="real_market_salary">שכר חודשי ריאלי בשוק (₪)</Label>
                        <Input
                            id="real_market_salary"
                            type="text"
                            value={formData.real_market_salary ? formatToHebrewNumber(formData.real_market_salary) : ''}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^\d]/g, '');
                                setFormData({ ...formData, real_market_salary: val });
                            }}
                            className="text-right"
                        />
                    </div>
                </div>
            ),
        },
    ], [formData, jobRoles, projects, branches, employingCompanies, seniorityLevels, leavingReasons, performanceLevels]);

    const viewFormFields = useMemo(() => [
        {
            id: 'row_fullname_jobrole',
            label: 'שם מלא ותפקיד',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>שם מלא</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.full_name || ''}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>תפקיד</Label>
                        <Input
                            className="text-right bg-muted"
                            value={getRoleName(selectedEmployee?.job_role_id || null)}
                            disabled
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_project_branch',
            label: 'תכנית וענף',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>תכנית</Label>
                        <Input
                            className="text-right bg-muted"
                            value={getProjectName(selectedEmployee?.project_id || null)}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>ענף</Label>
                        <Input
                            className="text-right bg-muted"
                            value={getBranchName(selectedEmployee?.branch_id)}
                            disabled
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_company_experience',
            label: 'חברה מעסיקה וותק',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>חברה מעסיקה</Label>
                        <Input
                            className="text-right bg-muted"
                            value={getEmployingCompanyName(selectedEmployee?.employing_company_id)}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>ותק במקצוע (שנים)</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.professional_experience_years?.toString() || '0'}
                            disabled
                            dir="ltr"
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_city_startdate',
            label: 'עיר ותאריך התחלה',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>עיר מגורים</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.city || '-'}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>תאריך תחילת עבודה ביחידה</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.start_date ? new Date(selectedEmployee.start_date).toLocaleDateString('he-IL') : '-'}
                            disabled
                            dir="ltr"
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_birthdate_phone',
            label: 'תאריך לידה וטלפון',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>תאריך לידה</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.birth_date ? new Date(selectedEmployee.birth_date).toLocaleDateString('he-IL') : '-'}
                            disabled
                            dir="ltr"
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>מספר טלפון</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.phone || '-'}
                            disabled
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_emergency_phone',
            label: 'טלפון חירום',
            component: (
                <div className="space-y-2 text-right">
                    <Label>טלפון חירום</Label>
                    <Input
                        className="text-right bg-muted"
                        value={selectedEmployee?.emergency_phone || '-'}
                        disabled
                    />
                </div>
            ),
        },
        {
            id: 'row_performance_combined',
            label: 'ביצועים ועדכון',
            isManagerOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>ביצועי העובד</Label>
                        <Input
                            className="text-right bg-muted"
                            value={getPerformanceLevelName(selectedEmployee?.performance_level_id)}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>תאריך עדכון ביצועים</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.performance_update_date ? new Date(selectedEmployee.performance_update_date).toLocaleDateString('he-IL') : '-'}
                            disabled
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_seniority',
            label: 'סניוריטי',
            component: (
                <div className="space-y-2 text-right">
                    <Label>סניוריטי</Label>
                    <Input
                        className="text-right bg-muted"
                        value={getSeniorityLevelName(selectedEmployee?.seniority_level_id)}
                        disabled
                    />
                </div>
            ),
        },
        {
            id: 'row_cost',
            label: 'עלות',
            isManagerOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>עלות העובד בחודש (₪) - כולל מע"מ</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.cost ? `₪${formatToHebrewNumber(selectedEmployee.cost)}` : '-'}
                            disabled
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_unit_criticality',
            label: 'קריטיות ליחידה',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label>קריטיות ליחידה (0-5)</Label>
                    <Input
                        className="text-right bg-muted"
                        value={selectedEmployee?.unit_criticality != null ? `${selectedEmployee.unit_criticality}${selectedEmployee.unit_criticality === 1 ? ' - די חשוב לארגון' : selectedEmployee.unit_criticality === 2 ? ' - חשוב לארגון' : selectedEmployee.unit_criticality === 3 ? ' - חשוב מאוד לארגון' : selectedEmployee.unit_criticality === 4 ? ' - קריטי לארגון' : selectedEmployee.unit_criticality === 5 ? ' - קריטי מאוד לארגון' : ''}` : '-'}
                        disabled
                    />
                </div>
            ),
        },
        {
            id: 'row_attrition_risk_company',
            label: 'סיכוי לעזוב - לדעת החברה',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label>סיכוי לעזוב - לדעת החברה (0-5)</Label>
                    <Input
                        className="text-right bg-muted"
                        value={selectedEmployee?.company_attrition_risk?.toString() ?? '-'}
                        disabled
                    />
                </div>
            ),
        },
        {
            id: 'row_risk_reason_unit',
            label: 'סיכוי וסיבת עזיבה - יחידה',
            isManagerOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>סיכוי לעזוב - לדעת היחידה (0-5)</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.attrition_risk?.toString() ?? '-'}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>סיבת רצון לעזוב - קטגוריות</Label>
                        <Input
                            className="text-right bg-muted"
                            value={getLeavingReasonName(selectedEmployee?.leaving_reason_id)}
                            disabled
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_attrition_reason',
            label: 'סיבת רצון לעזוב - מלל חופשי',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label>סיבת רצון לעזוב - מלל חופשי</Label>
                    <Input
                        className="text-right bg-muted"
                        value={selectedEmployee?.attrition_risk_reason || '-'}
                        disabled
                    />
                </div>
            ),
        },
        {
            id: 'row_retention_plan',
            label: 'תכנית שימור - מבחינת היחידה',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label>תכנית שימור - מבחינת היחידה</Label>
                    <Input
                        className="text-right bg-muted"
                        value={selectedEmployee?.retention_plan || '-'}
                        disabled
                    />
                </div>
            ),
        },
        {
            id: 'row_commander_summary',
            label: 'סיכום מפקד יחידה וסטטוס',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label>סיכום מפקד יחידה וסטטוס</Label>
                    <Input
                        className="text-right bg-muted"
                        value={(selectedEmployee as any)?.commander_summary_and_status || '-'}
                        disabled
                    />
                </div>
            ),
        },
        {
            id: 'row_replacement_needed',
            label: 'לגייס במקומו?',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label>לגייס במקומו?</Label>
                    <Input
                        className="text-right bg-muted"
                        value={(selectedEmployee as any)?.replacement_needed || '-'}
                        disabled
                    />
                </div>
            ),
        },
        {
            id: 'row_company_retention_plan',
            label: 'התיחסות חברה למעבר דרומה',
            isManagerOnly: true,
            component: (
                <div className="space-y-2 text-right">
                    <Label>התיחסות חברה למעבר דרומה</Label>
                    <Input
                        className="text-right bg-muted"
                        value={(selectedEmployee as any)?.company_retention_plan || '-'}
                        disabled
                    />
                </div>
            ),
        },
        {
            id: 'row_salary_percentage_date',
            label: 'תאריך ואחוז העלאת שכר',
            isManagerOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>תאריך העלאת שכר</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.salary_raise_date ? new Date(selectedEmployee.salary_raise_date).toLocaleDateString('he-IL') : '-'}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>אחוז העלאת שכר (%)</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.salary_raise_percentage ? `${formatToHebrewNumber(selectedEmployee.salary_raise_percentage)}%` : '-'}
                            disabled
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'row_linkedin',
            label: 'קישור ללינקדאין',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right col-span-2">
                        <Label>קישור ללינקדאין</Label>
                        {selectedEmployee?.linkedin_url ? (
                            <a
                                href={selectedEmployee.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 bg-muted rounded-md text-right text-primary hover:underline"
                            >
                                {selectedEmployee.linkedin_url}
                            </a>
                        ) : (
                            <Input
                                className="text-right bg-muted"
                                value="-"
                                disabled
                            />
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'row_revolving_door',
            label: 'דלת מסתובבת ואיתור',
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>איתור שלנו?</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.our_sourcing === true ? 'כן' : selectedEmployee?.our_sourcing === false ? 'לא' : '-'}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>דלת מסתובבת</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.revolving_door === true ? 'כן' : selectedEmployee?.revolving_door === false ? 'לא' : '-'}
                            disabled
                        />
                    </div>
                </div>
            ),
        },

        {
            id: 'row_salary_estimates',
            label: 'הערכות שכר',
            isSuperAdminOnly: true,
            component: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                        <Label>שכר חודשי משוער (₪)</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.cost ? `₪${formatToHebrewNumber(selectedEmployee.cost / 1.4 / 1.1 / 1.18)}` : '-'}
                            disabled
                        />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label>שכר חודשי ריאלי בשוק (₪)</Label>
                        <Input
                            className="text-right bg-muted"
                            value={selectedEmployee?.real_market_salary ? `₪${formatToHebrewNumber(selectedEmployee.real_market_salary)}` : '-'}
                            disabled
                        />
                    </div>
                </div>
            ),
        },
    ], [selectedEmployee, jobRoles, projects, branches, employingCompanies, seniorityLevels, leavingReasons, performanceLevels, isManager]);

    const renderFormFields = (disabled = false) => {
        const fields = disabled ? viewFormFields : formFields;

        const generalRows = [
            'row_fullname_jobrole',
            'row_project_branch',
            'row_company_experience',
            'row_city_startdate',
            'row_birthdate_phone',
            'row_emergency_phone'
        ];

        const performanceRows = [
            'row_seniority',
            'row_linkedin',
            'row_revolving_door',
            'row_cost',
            'row_salary_estimates',
            'row_salary_percentage_date',
            'row_performance_combined'
        ];

        const retentionCommandersRows = [
            'row_unit_criticality',
            'row_risk_reason_unit',
            'row_attrition_reason',
            'row_retention_plan',
            'row_commander_summary',
            'row_replacement_needed'
        ];

        const retentionCompanyRows = [
            'row_attrition_risk_company',
            'row_company_retention_plan'
        ];

        const retentionRows = [...retentionCommandersRows, ...retentionCompanyRows];

        // Any fields not explicitly in these groups go to General
        const allAssignedRows = [...generalRows, ...performanceRows, ...retentionRows];
        const remainingRows = fieldOrder.filter(id => !allAssignedRows.includes(id));
        const effectiveGeneralRows = [...generalRows, ...remainingRows];

        const handleSubOrderChange = (newSubOrder: string[]) => {
            const subOrderSet = new Set(newSubOrder);
            const newFullOrder = [...fieldOrder];
            const indices: number[] = [];
            newFullOrder.forEach((id, index) => {
                if (subOrderSet.has(id)) {
                    indices.push(index);
                }
            });
            indices.forEach((index, i) => {
                newFullOrder[index] = newSubOrder[i];
            });
            updateOrder(newFullOrder);
        };

        return (
            <div className="space-y-4">
                {!disabled && (
                    <div className="flex items-center justify-between border-b pb-2 mb-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={resetOrder}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <RotateCcw className="h-4 w-4 ml-1" />
                            איפוס סדר שדות
                        </Button>
                        <Button
                            type="button"
                            variant={isDragMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsDragMode(!isDragMode)}
                        >
                            <Move className="h-4 w-4 ml-1" />
                            {isDragMode ? 'סיום עריכה' : 'שינוי סדר שדות'}
                        </Button>
                    </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 gap-2 mb-6 bg-transparent h-auto p-0">
                        <TabsTrigger
                            value="general"
                            className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all text-right justify-start"
                        >
                            כללי
                        </TabsTrigger>
                        <TabsTrigger
                            value="performance"
                            className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all text-right justify-start"
                        >
                            ביצועים ושכר
                        </TabsTrigger>
                        <TabsTrigger
                            value="retention"
                            className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all text-right justify-start"
                        >
                            שימור
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="mt-0">
                        {activeTab === 'general' && (
                            <DraggableFormContainer
                                fields={fields.filter(f => effectiveGeneralRows.includes(f.id))}
                                fieldOrder={fieldOrder}
                                onOrderChange={handleSubOrderChange}
                                onReset={resetOrder}
                                isDragMode={isDragMode && !disabled}
                                onToggleDragMode={() => setIsDragMode(!isDragMode)}
                                isManager={isManager}
                                isSuperAdmin={isSuperAdmin}
                                disabled={disabled}
                                hideControls={true}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="performance" className="mt-0">
                        {activeTab === 'performance' && (
                            <DraggableFormContainer
                                fields={fields.filter(f => performanceRows.includes(f.id))}
                                fieldOrder={fieldOrder}
                                onOrderChange={handleSubOrderChange}
                                onReset={resetOrder}
                                isDragMode={isDragMode && !disabled}
                                onToggleDragMode={() => setIsDragMode(!isDragMode)}
                                isManager={isManager}
                                isSuperAdmin={isSuperAdmin}
                                disabled={disabled}
                                hideControls={true}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="retention" className="mt-0">
                        {activeTab === 'retention' && (
                            <div className="space-y-10 py-2">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b-2 border-primary/20 pb-2 text-primary">
                                        <Users className="w-5 h-5 flex-shrink-0" />
                                        <h3 className="text-lg font-bold text-right">נתונים ממפקדים</h3>
                                    </div>
                                    <DraggableFormContainer
                                        fields={fields.filter(f => retentionCommandersRows.includes(f.id))}
                                        fieldOrder={fieldOrder}
                                        onOrderChange={handleSubOrderChange}
                                        onReset={resetOrder}
                                        isDragMode={isDragMode && !disabled}
                                        onToggleDragMode={() => setIsDragMode(!isDragMode)}
                                        isManager={isManager}
                                        isSuperAdmin={isSuperAdmin}
                                        disabled={disabled}
                                        hideControls={true}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b-2 border-primary/20 pb-2 text-primary">
                                        <Building2 className="w-5 h-5 flex-shrink-0" />
                                        <h3 className="text-lg font-bold text-right">נתונים מהחברה</h3>
                                    </div>
                                    <DraggableFormContainer
                                        fields={fields.filter(f => retentionCompanyRows.includes(f.id))}
                                        fieldOrder={fieldOrder}
                                        onOrderChange={handleSubOrderChange}
                                        onReset={resetOrder}
                                        isDragMode={isDragMode && !disabled}
                                        onToggleDragMode={() => setIsDragMode(!isDragMode)}
                                        isManager={isManager}
                                        isSuperAdmin={isSuperAdmin}
                                        disabled={disabled}
                                        hideControls={true}
                                    />
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        );
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
                    <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                        <DialogContent className="w-full h-[100dvh] max-h-[100dvh] rounded-none p-4 sm:p-6 sm:rounded-lg sm:h-auto sm:max-h-[85vh] max-w-4xl sm:w-[90vw] flex flex-col overflow-hidden">
                            <DialogHeader className="text-right">
                                <DialogTitle>פרטי עובד: {selectedEmployee?.full_name}</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="flex-1 overflow-y-auto pr-4">
                                <div className="grid gap-4 py-4">
                                    {renderFormFields(true)}
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-4 border-t">
                                <Button onClick={() => setIsViewDialogOpen(false)}>סגור</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Employee Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="w-full h-[100dvh] max-h-[100dvh] rounded-none p-4 sm:p-6 sm:rounded-lg sm:h-auto sm:max-h-[85vh] max-w-4xl sm:w-[90vw] flex flex-col overflow-hidden">
                            <DialogHeader className="text-right">
                                <DialogTitle>עריכת נתוני עובד: {formData.full_name}</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="flex-1 overflow-y-auto pr-4 overflow-x-hidden">
                                <div className="grid gap-4 py-4">
                                    {renderFormFields()}
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-4 border-t gap-2">
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>ביטול</Button>
                                <Button onClick={handleUpdateEmployee} disabled={formLoading}>
                                    {formLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                    שמור שינויים
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </div>
            )}
        </MainLayout>
    );
}
