// Employee Management Page
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuCheckboxItem,
  ContextMenuTrigger,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Search, Plus, Pencil, Trash2, Filter, X, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Eye, Download, GripVertical, RotateCcw, Move, Users, Building2, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { MultiSelect } from '@/components/ui/multi-select';
import { useFormFieldOrder } from '@/hooks/useFormFieldOrder';
import { DraggableFormContainer } from '@/components/employees/DraggableFormContainer';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableTableHeader } from '@/components/employees/DraggableTableHeader';
import * as XLSX from 'xlsx';

type SortField = 'full_name' | 'birth_date' | 'job_role_id' | 'project_id' | 'professional_experience_years' | 'organization_experience_years' | 'city' | 'start_date' | 'cost';
type SortDirection = 'asc' | 'desc';

interface Employee {
  id: string;
  full_name: string;
  id_number: string;
  job_role_id: string | null;
  performance_level_id?: string | null;
  performance_update_date?: string | null;
  professional_experience_years: number;
  organization_experience_years: number;
  project_id: string | null;
  city: string | null;
  start_date: string;
  birth_date: string | null;
  cost: number | null;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  employing_company_id?: string;
  branch_id?: string;
  seniority_level_id?: string;
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
  our_sourcing?: boolean | null;
  leaving_reason_id?: string | null;
  retention_plan?: string | null;
  company_retention_plan?: string | null;
  company_attrition_risk?: number | null;
}

interface JobRole {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface EmployingCompany {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface SeniorityLevel {
  id: string;
  name: string;
}

interface LeavingReason {
  id: string;
  name: string;
}

interface PerformanceLevel {
  id: string;
  name: string;
}

export default function Employees() {
  const { isManager, isSuperAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employingCompanies, setEmployingCompanies] = useState<EmployingCompany[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [seniorityLevels, setSeniorityLevels] = useState<SeniorityLevel[]>([]);
  const [leavingReasons, setLeavingReasons] = useState<LeavingReason[]>([]);
  const [performanceLevels, setPerformanceLevels] = useState<PerformanceLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string[]>([]);
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string[]>([]);
  const [filterEmployingCompany, setFilterEmployingCompany] = useState<string[]>([]);
  const [filterSeniority, setFilterSeniority] = useState<string[]>([]);
  const [filterAttritionRisk, setFilterAttritionRisk] = useState<string[]>([]);
  const [filterUnitCriticality, setFilterUnitCriticality] = useState<string[]>([]);
  const [filterOurSourcing, setFilterOurSourcing] = useState<string[]>([]);
  const [filterRevolvingDoor, setFilterRevolvingDoor] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Column visibility - all employee table fields
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    id: false,
    full_name: true,
    id_number: false,
    birth_date: true,
    job_role_id: true,
    project_id: true,
    branch_id: false,
    employing_company_id: false,
    seniority_level_id: false,
    professional_experience_years: true,
    organization_experience_years: true,
    city: true,
    start_date: true,
    cost: true,
    attrition_risk: false,
    attrition_risk_reason: false,
    unit_criticality: false,
    salary_raise_date: false,
    salary_raise_percentage: false,
    our_sourcing: false,
    leaving_reason_id: false,
    performance_level_id: false,
    performance_update_date: false,
    replacement_needed: false,
    created_at: false,
    updated_at: false,
    created_by: false,
  });

  const columnLabels: Record<string, string> = {
    id: 'מזהה מערכת',
    full_name: 'שם מלא',
    id_number: 'מספר זהות',
    birth_date: 'תאריך לידה',
    job_role_id: 'תפקיד',
    project_id: 'תכנית',
    branch_id: 'ענף',
    employing_company_id: 'חברה מעסיקה',
    seniority_level_id: 'סניוריטי',
    professional_experience_years: 'ותק במקצוע',
    organization_experience_years: 'ותק בארגון',
    city: 'עיר',
    start_date: 'תאריך התחלה',
    cost: 'עלות',
    attrition_risk: 'סיכוי לעזוב - לדעת היחידה',
    attrition_risk_reason: 'סיבת רצון לעזוב - מלל חופשי',
    unit_criticality: 'קריטיות ליחידה',
    salary_raise_date: 'תאריך העלאת שכר',
    salary_raise_percentage: 'אחוז העלאת שכר',
    created_at: 'נוצר בתאריך',
    updated_at: 'עודכן בתאריך',
    created_by: 'נוצר ע"י',
    our_sourcing: 'איתור שלנו?',
    leaving_reason_id: 'סיבת רצון לעזוב - קטגוריות',
    performance_level_id: 'ביצועי העובד',
    performance_update_date: 'תאריך עדכון ביצועים',
    replacement_needed: 'לגייס במקומו?',
  };

  // Manager-only columns
  const managerOnlyColumns = ['cost', 'attrition_risk', 'attrition_risk_reason', 'unit_criticality', 'salary_raise_date', 'salary_raise_percentage', 'leaving_reason_id', 'performance_level_id', 'performance_update_date'];

  const visibleColumnsCount = Object.keys(visibleColumns).filter((key) => {
    if (!visibleColumns[key]) return false;
    if (managerOnlyColumns.includes(key) && !isManager) return false;
    return true;
  }).length;

  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  // Default column order
  const defaultColumnOrder = useMemo(() => [
    'full_name', 'id', 'id_number', 'birth_date', 'job_role_id', 'project_id',
    'branch_id', 'employing_company_id', 'seniority_level_id',
    'professional_experience_years', 'organization_experience_years', 'city',
    'start_date', 'cost', 'attrition_risk', 'attrition_risk_reason',
    'unit_criticality', 'salary_raise_date', 'salary_raise_percentage',
    'created_at', 'updated_at', 'created_by', 'our_sourcing', 'leaving_reason_id', 'performance_level_id', 'performance_update_date', 'replacement_needed'
  ], []);

  const { columnOrder, updateOrder: updateColumnOrder, resetOrder: resetColumnOrder } = useColumnOrder('employees', defaultColumnOrder);
  const [isColumnDragMode, setIsColumnDragMode] = useState(false);

  // Sensors for drag and drop
  const columnSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get visible and ordered columns
  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter(col => {
      if (!visibleColumns[col]) return false;
      if (managerOnlyColumns.includes(col) && !isManager) return false;
      return true;
    });
  }, [columnOrder, visibleColumns, managerOnlyColumns, isManager]);

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.findIndex(col => col === active.id);
      const newIndex = columnOrder.findIndex(col => col === over.id);

      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      updateColumnOrder(newOrder);
    }
  };

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Default field order for the form
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

  // Form fields
  const [formData, setFormData] = useState({
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
    replacement_needed: '',
  });

  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [selectedLeaveEmployee, setSelectedLeaveEmployee] = useState<Employee | null>(null);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const openLeaveDialog = (employee: Employee) => {
    setSelectedLeaveEmployee(employee);
    setLeaveDate(new Date().toISOString().split('T')[0]);
    setLeaveReason('');
    setIsLeaveDialogOpen(true);
  };

  const handleLeaveConfirm = async () => {
    if (!selectedLeaveEmployee || !leaveDate) {
      toast.error('יש להזין תאריך עזיבה');
      return;
    }
    setFormLoading(true);
    try {
      await updateDoc(doc(db, 'employees', selectedLeaveEmployee.id), {
        is_left: true,
        left_date: leaveDate,
        left_reason: leaveReason
      });
      toast.success('העובד סומן כעזב בהצלחה');
      setIsLeaveDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error('שגיאה בעדכון סטאטוס עובד');
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        employeesSnap, rolesSnap, projectsSnap,
        companiesSnap, branchesSnap, senioritySnap, leavingSnap, performanceSnap
      ] = await Promise.all([
        getDocs(collection(db, 'employees')),
        getDocs(collection(db, 'job_roles')),
        getDocs(collection(db, 'projects')),
        getDocs(collection(db, 'employing_companies')),
        getDocs(collection(db, 'branches')),
        getDocs(collection(db, 'seniority_levels')),
        getDocs(collection(db, 'leaving_reasons')),
        getDocs(collection(db, 'performance_levels'))
      ]);

      const mapDocs = (snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      setEmployees(mapDocs(employeesSnap).filter((emp: any) => !emp.is_left));
      setJobRoles(mapDocs(rolesSnap));
      setProjects(mapDocs(projectsSnap));
      setEmployingCompanies(mapDocs(companiesSnap));
      setBranches(mapDocs(branchesSnap));
      setSeniorityLevels(mapDocs(senioritySnap));
      setLeavingReasons(mapDocs(leavingSnap));
      setPerformanceLevels(mapDocs(performanceSnap).sort((a: any, b: any) => a.name.localeCompare(b.name, 'he', { numeric: true })));
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בטעינת הנתונים');
    }
    setLoading(false);
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

  const getLeavingReasonName = (reasonId: string | null | undefined) => {
    if (!reasonId) return '-';
    const reason = leavingReasons.find(r => r.id === reasonId);
    return reason?.name || '-';
  };

  const formatToHebrewNumber = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(num)) return '';
    return Math.round(num).toLocaleString('he-IL');
  };

  const getPerformanceLevelName = (levelId: string | null | undefined) => {
    if (!levelId) return '-';
    const level = performanceLevels.find(l => l.id === levelId);
    return level?.name || '-';
  };

  // Calculate organization experience years dynamically from start_date
  const getOrganizationExperienceYears = (startDate: string) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.round(diffYears * 10) / 10); // Round to 1 decimal place
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id_number.includes(searchTerm) ||
      (emp.city?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesProject = filterProject.length === 0 || (emp.project_id && filterProject.includes(emp.project_id));
    const matchesRole = filterRole.length === 0 || (emp.job_role_id && filterRole.includes(emp.job_role_id));
    const matchesCity = !filterCity || emp.city?.toLowerCase().includes(filterCity.toLowerCase());
    const matchesBranch = filterBranch.length === 0 || (emp.branch_id && filterBranch.includes(emp.branch_id));
    const matchesEmployingCompany = filterEmployingCompany.length === 0 || (emp.employing_company_id && filterEmployingCompany.includes(emp.employing_company_id));
    const matchesSeniority = filterSeniority.length === 0 || (emp.seniority_level_id && filterSeniority.includes(emp.seniority_level_id));
    const matchesAttritionRisk = filterAttritionRisk.length === 0 || (emp.attrition_risk !== null && emp.attrition_risk !== undefined && filterAttritionRisk.includes(emp.attrition_risk.toString()));
    const matchesUnitCriticality = filterUnitCriticality.length === 0 || (emp.unit_criticality !== null && emp.unit_criticality !== undefined && filterUnitCriticality.includes(emp.unit_criticality.toString()));
    const matchesOurSourcing = filterOurSourcing.length === 0 || filterOurSourcing.includes(emp.our_sourcing === true ? 'true' : 'false');
    const matchesRevolvingDoor = filterRevolvingDoor.length === 0 || filterRevolvingDoor.includes(emp.revolving_door === true ? 'true' : 'false');

    return matchesSearch && matchesProject && matchesRole && matchesCity &&
      matchesBranch && matchesEmployingCompany && matchesSeniority &&
      matchesAttritionRisk && matchesUnitCriticality && matchesOurSourcing && matchesRevolvingDoor;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: string | number | null = null;
    let bValue: string | number | null = null;

    switch (sortField) {
      case 'full_name':
        aValue = a.full_name.toLowerCase();
        bValue = b.full_name.toLowerCase();
        break;
      case 'birth_date':
        aValue = a.birth_date || '';
        bValue = b.birth_date || '';
        break;
      case 'job_role_id':
        aValue = getRoleName(a.job_role_id).toLowerCase();
        bValue = getRoleName(b.job_role_id).toLowerCase();
        break;
      case 'project_id':
        aValue = getProjectName(a.project_id).toLowerCase();
        bValue = getProjectName(b.project_id).toLowerCase();
        break;
      case 'professional_experience_years':
        aValue = a.professional_experience_years;
        bValue = b.professional_experience_years;
        break;
      case 'organization_experience_years':
        aValue = getOrganizationExperienceYears(a.start_date);
        bValue = getOrganizationExperienceYears(b.start_date);
        break;
      case 'city':
        aValue = (a.city || '').toLowerCase();
        bValue = (b.city || '').toLowerCase();
        break;
      case 'start_date':
        aValue = a.start_date;
        bValue = b.start_date;
        break;
      case 'cost':
        aValue = a.cost ?? 0;
        bValue = b.cost ?? 0;
        break;
    }

    if (aValue === null || bValue === null) return 0;
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 text-primary" />
      : <ArrowDown className="w-4 h-4 text-primary" />;
  };

  const resetForm = () => {
    setFormData({
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
      replacement_needed: '',
    });
    setActiveTab('general');
  };

  const handleAdd = async () => {
    if (!formData.full_name || !formData.start_date || !formData.branch_id) {
      toast.error('נא למלא את כל השדות החובה (שם, תאריך התחלה, ענף)');
      return;
    }

    setFormLoading(true);
    // Generate unique id_number using timestamp + random string
    const uniqueIdNumber = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const insertData: Record<string, unknown> = {
      full_name: formData.full_name,
      id_number: uniqueIdNumber,
      job_role_id: formData.job_role_id || null,
      professional_experience_years: formData.professional_experience_years,
      project_id: formData.project_id || null,
      city: formData.city || null,
      start_date: formData.start_date,
      birth_date: formData.birth_date || null,
      cost: isManager && formData.cost ? parseFloat(formData.cost) : null,
      employing_company_id: formData.employing_company_id || null,
      branch_id: formData.branch_id,
      seniority_level_id: formData.seniority_level_id || null,
      phone: formData.phone || null,
      emergency_phone: formData.emergency_phone || null,
      linkedin_url: formData.linkedin_url?.substring(0, 200) || null,
      revolving_door: formData.revolving_door === 'true' ? true : formData.revolving_door === 'false' ? false : null,
      our_sourcing: formData.our_sourcing === 'true' ? true : formData.our_sourcing === 'false' ? false : null,
      leaving_reason_id: formData.leaving_reason_id || null,
      performance_level_id: formData.performance_level_id || null,
      performance_update_date: formData.performance_update_date || null,
    };

    // Manager-only fields
    if (isManager) {
      insertData.attrition_risk = formData.attrition_risk ? parseInt(formData.attrition_risk) : null;
      insertData.attrition_risk_reason = formData.attrition_risk_reason || null;
      insertData.unit_criticality = formData.unit_criticality ? parseInt(formData.unit_criticality) : null;
      insertData.salary_raise_date = formData.salary_raise_date || null;
      insertData.salary_raise_percentage = formData.salary_raise_percentage ? parseFloat(formData.salary_raise_percentage) : null;
      insertData.retention_plan = formData.retention_plan || null;
      insertData.company_retention_plan = formData.company_retention_plan || null;
      insertData.company_attrition_risk = formData.company_attrition_risk ? parseInt(formData.company_attrition_risk) : null;
      insertData.replacement_needed = formData.replacement_needed || null;
    }

    try {
      await addDoc(collection(db, 'employees'), insertData);
      setFormLoading(false);
      toast.success('העובד נוסף בהצלחה');
      setIsAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      setFormLoading(false);
      toast.error('שגיאה בהוספת העובד');
    }
  };

  const handleEdit = async () => {
    if (!selectedEmployee) return;
    if (!formData.full_name || !formData.start_date || !formData.branch_id) {
      toast.error('נא למלא את כל השדות החובה (שם, תאריך התחלה, ענף)');
      return;
    }

    setFormLoading(true);
    const updateData: Record<string, unknown> = {
      full_name: formData.full_name,
      job_role_id: formData.job_role_id || null,
      professional_experience_years: formData.professional_experience_years,
      project_id: formData.project_id || null,
      city: formData.city || null,
      start_date: formData.start_date,
      birth_date: formData.birth_date || null,
      employing_company_id: formData.employing_company_id || null,
      branch_id: formData.branch_id,
      seniority_level_id: formData.seniority_level_id || null,
      phone: formData.phone || null,
      emergency_phone: formData.emergency_phone || null,
      linkedin_url: formData.linkedin_url?.substring(0, 200) || null,
      revolving_door: formData.revolving_door === 'true' ? true : formData.revolving_door === 'false' ? false : null,
      our_sourcing: formData.our_sourcing === 'true' ? true : formData.our_sourcing === 'false' ? false : null,
      leaving_reason_id: formData.leaving_reason_id || null,
      performance_level_id: formData.performance_level_id || null,
      performance_update_date: formData.performance_update_date || null,
    };

    if (isManager) {
      updateData.cost = formData.cost ? parseFloat(formData.cost) : null;
      updateData.attrition_risk = formData.attrition_risk ? parseInt(formData.attrition_risk) : null;
      updateData.attrition_risk_reason = formData.attrition_risk_reason || null;
      updateData.unit_criticality = formData.unit_criticality ? parseInt(formData.unit_criticality) : null;
      updateData.salary_raise_date = formData.salary_raise_date || null;
      updateData.salary_raise_percentage = formData.salary_raise_percentage ? parseFloat(formData.salary_raise_percentage) : null;
      updateData.retention_plan = formData.retention_plan || null;
      updateData.company_retention_plan = formData.company_retention_plan || null;
      updateData.company_attrition_risk = formData.company_attrition_risk ? parseInt(formData.company_attrition_risk) : null;
      updateData.replacement_needed = formData.replacement_needed || null;
    }

    // Super admin only field
    if (isSuperAdmin) {
      updateData.real_market_salary = formData.real_market_salary ? parseFloat(formData.real_market_salary) : null;
    }

    try {
      await updateDoc(doc(db, 'employees', selectedEmployee.id), updateData);
      setFormLoading(false);
      toast.success('העובד עודכן בהצלחה');
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      setFormLoading(false);
      toast.error('שגיאה בעדכון העובד');
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`האם למחוק את ${employee.full_name}?`)) return;

    try {
      await deleteDoc(doc(db, 'employees', employee.id));
      toast.success('העובד נמחק בהצלחה');
      fetchData();
    } catch (error: any) {
      toast.error('שגיאה במחיקת העובד');
    }
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      job_role_id: employee.job_role_id || '',
      professional_experience_years: employee.professional_experience_years,
      project_id: employee.project_id || '',
      city: employee.city || '',
      start_date: employee.start_date,
      birth_date: employee.birth_date || '',
      cost: employee.cost?.toString() || '',
      employing_company_id: employee.employing_company_id || '',
      branch_id: employee.branch_id || '',
      phone: employee.phone || '',
      emergency_phone: employee.emergency_phone || '',
      seniority_level_id: employee.seniority_level_id || '',
      attrition_risk: employee.attrition_risk?.toString() || '',
      attrition_risk_reason: employee.attrition_risk_reason || '',
      unit_criticality: employee.unit_criticality?.toString() || '',
      salary_raise_date: employee.salary_raise_date || '',
      salary_raise_percentage: employee.salary_raise_percentage?.toString() || '',
      linkedin_url: employee.linkedin_url || '',
      real_market_salary: employee.real_market_salary?.toString() || '',
      revolving_door: employee.revolving_door === true ? 'true' : employee.revolving_door === false ? 'false' : '',
      our_sourcing: employee.our_sourcing === true ? 'true' : employee.our_sourcing === false ? 'false' : '',
      leaving_reason_id: employee.leaving_reason_id || '',
      retention_plan: employee.retention_plan || '',
      commander_summary_and_status: (employee as any).commander_summary_and_status || '',
      company_retention_plan: (employee as any).company_retention_plan || '',
      company_attrition_risk: employee.company_attrition_risk?.toString() || '',
      performance_level_id: employee.performance_level_id || '',
      performance_update_date: employee.performance_update_date || '',
      replacement_needed: (employee as any).replacement_needed || '',
    });
    setIsEditDialogOpen(true);
    setActiveTab('general');
  };

  const openViewDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewDialogOpen(true);
    setActiveTab('general');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterProject([]);
    setFilterRole([]);
    setFilterCity('');
    setFilterBranch([]);
    setFilterEmployingCompany([]);
    setFilterSeniority([]);
    setFilterAttritionRisk([]);
    setFilterUnitCriticality([]);
    setFilterOurSourcing([]);
    setFilterRevolvingDoor([]);
  };

  const activeFiltersCount = [
    filterProject.length > 0,
    filterRole.length > 0,
    filterCity !== '',
    filterBranch.length > 0,
    filterEmployingCompany.length > 0,
    filterSeniority.length > 0,
    filterAttritionRisk.length > 0,
    filterUnitCriticality.length > 0,
    filterOurSourcing.length > 0,
    filterRevolvingDoor.length > 0,
  ].filter(Boolean).length;

  // Export to Excel function
  const exportToExcel = () => {
    // Get visible columns for export
    const exportColumns = Object.keys(visibleColumns).filter(col => {
      if (!visibleColumns[col]) return false;
      if (managerOnlyColumns.includes(col) && !isManager) return false;
      return true;
    });

    // Create export data with Hebrew headers
    const exportData = filteredEmployees.map(employee => {
      const row: Record<string, string | number | null> = {};

      exportColumns.forEach(col => {
        const label = columnLabels[col] || col;

        switch (col) {
          case 'job_role_id':
            row[label] = getRoleName(employee.job_role_id);
            break;
          case 'project_id':
            row[label] = getProjectName(employee.project_id);
            break;
          case 'branch_id':
            row[label] = getBranchName(employee.branch_id);
            break;
          case 'employing_company_id':
            row[label] = getEmployingCompanyName(employee.employing_company_id);
            break;
          case 'seniority_level_id':
            row[label] = getSeniorityLevelName(employee.seniority_level_id);
            break;
          case 'birth_date':
          case 'start_date':
          case 'salary_raise_date':
          case 'created_at':
          case 'updated_at':
            row[label] = employee[col] ? new Date(employee[col] as string).toLocaleDateString('he-IL') : '-';
            break;
          case 'cost':
            row[label] = employee.cost ?? '-';
            break;
          case 'salary_raise_percentage':
            row[label] = employee.salary_raise_percentage ? `${employee.salary_raise_percentage}%` : '-';
            break;
          case 'organization_experience_years':
            row[label] = getOrganizationExperienceYears(employee.start_date);
            break;
          case 'attrition_risk':
            row[label] = employee.attrition_risk ?? '-';
            break;
          case 'unit_criticality':
            row[label] = employee.unit_criticality ?? '-';
            break;
          case 'leaving_reason_id':
            row[label] = getLeavingReasonName(employee.leaving_reason_id);
            break;
          default:
            row[label] = (employee as unknown as Record<string, string | number | null>)[col] ?? '-';
        }
      });

      return row;
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'עובדים');

    // Set RTL direction for the worksheet
    worksheet['!cols'] = exportColumns.map(() => ({ wch: 15 }));

    // Generate filename with current date
    const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
    const filename = `עובדים_${date}.xlsx`;

    // Download the file
    XLSX.writeFile(workbook, filename);
    toast.success('הקובץ יוצא בהצלחה');
  };

  // Form field configurations for drag and drop
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
              <SelectContent>
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
              <SelectContent>
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
            <SelectContent>
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
            <SelectContent dir="rtl">
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
            <SelectContent dir="rtl">
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
              <SelectContent dir="rtl">
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
              <SelectContent>
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
            <SelectContent dir="rtl">
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
              <SelectContent>
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
              <SelectContent>
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

  // View-only form fields (same layout as edit, but displays values without editing)
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">עובדים</h1>
            <p className="text-muted-foreground mt-1">ניהול כל העובדים בארגון</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף עובד
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full h-[100dvh] max-h-[100dvh] rounded-none p-4 sm:p-6 sm:rounded-lg sm:h-auto sm:max-h-[85vh] max-w-4xl sm:w-[90vw] flex flex-col overflow-hidden">
              <DialogHeader className="text-right flex-shrink-0">
                <DialogTitle className="text-right">הוספת עובד חדש</DialogTitle>
                <DialogDescription className="text-right">מלא את פרטי העובד החדש</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 overflow-y-auto pr-4">
                <div className="grid gap-4 py-4">
                  {renderFormFields()}
                </div>
              </ScrollArea>
              <DialogFooter className="mt-4 pt-4 border-t">
                <Button type="button" onClick={handleAdd} disabled={formLoading}>
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  הוסף
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="חפש לפי שם, ת.ז או עיר..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4 ml-2" />
              סננים
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="w-4 h-4 ml-2" />
                נקה סננים
              </Button>
            )}
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="w-4 h-4 ml-2" />
              ייצוא לאקסל
            </Button>
            <Button
              variant={isColumnDragMode ? "default" : "outline"}
              onClick={() => setIsColumnDragMode(!isColumnDragMode)}
            >
              <Move className="w-4 h-4 ml-2" />
              {isColumnDragMode ? 'סיום סידור עמודות' : 'סדר עמודות'}
            </Button>
            {isColumnDragMode && (
              <Button variant="ghost" onClick={resetColumnOrder}>
                <RotateCcw className="w-4 h-4 ml-2" />
                איפוס סדר
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-secondary/50 rounded-lg animate-slide-in-up">
              <div className="space-y-2">
                <Label>תכנית</Label>
                <MultiSelect
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  selected={filterProject}
                  onChange={setFilterProject}
                  placeholder="בחר תכניות"
                />
              </div>
              <div className="space-y-2">
                <Label>תפקיד</Label>
                <MultiSelect
                  options={jobRoles.map((r) => ({ value: r.id, label: r.name }))}
                  selected={filterRole}
                  onChange={setFilterRole}
                  placeholder="בחר תפקידים"
                />
              </div>
              <div className="space-y-2">
                <Label>ענף</Label>
                <MultiSelect
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  selected={filterBranch}
                  onChange={setFilterBranch}
                  placeholder="בחר ענפים"
                />
              </div>
              <div className="space-y-2">
                <Label>חברה מעסיקה</Label>
                <MultiSelect
                  options={employingCompanies.map((c) => ({ value: c.id, label: c.name }))}
                  selected={filterEmployingCompany}
                  onChange={setFilterEmployingCompany}
                  placeholder="בחר חברות"
                />
              </div>
              <div className="space-y-2">
                <Label>סניוריטי</Label>
                <MultiSelect
                  options={seniorityLevels.map((s) => ({ value: s.id, label: s.name }))}
                  selected={filterSeniority}
                  onChange={setFilterSeniority}
                  placeholder="בחר רמות ותק"
                />
              </div>
              {isManager && (
                <>
                  <div className="space-y-2">
                    <Label>רמת סיכוי לעזוב - לדעת היחידה</Label>
                    <MultiSelect
                      options={[0, 1, 2, 3, 4, 5].map((val) => ({ value: val.toString(), label: val.toString() }))}
                      selected={filterAttritionRisk}
                      onChange={setFilterAttritionRisk}
                      placeholder="בחר רמות סיכוי"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>קריטיות ליחידה</Label>
                    <MultiSelect
                      options={[0, 1, 2, 3, 4, 5].map((val) => ({ value: val.toString(), label: val.toString() }))}
                      selected={filterUnitCriticality}
                      onChange={setFilterUnitCriticality}
                      placeholder="בחר רמות קריטיות"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>איתור שלנו?</Label>
                    <MultiSelect
                      options={[{ value: 'true', label: 'כן' }, { value: 'false', label: 'לא' }]}
                      selected={filterOurSourcing}
                      onChange={setFilterOurSourcing}
                      placeholder="בחר ערך"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>דלת מסתובבת</Label>
                    <MultiSelect
                      options={[{ value: 'true', label: 'כן' }, { value: 'false', label: 'לא' }]}
                      selected={filterRevolvingDoor}
                      onChange={setFilterRevolvingDoor}
                      placeholder="בחר ערך"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>עיר</Label>
                <Input
                  placeholder="סנן לפי עיר"
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="text-right"
                />
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="table-container overflow-x-auto w-full pb-4">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div>
                <DndContext
                  sensors={columnSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleColumnDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableContext
                          items={orderedVisibleColumns}
                          strategy={horizontalListSortingStrategy}
                        >
                          {orderedVisibleColumns.map((col) => {
                            const sortableFields = ['full_name', 'birth_date', 'job_role_id', 'project_id', 'professional_experience_years', 'organization_experience_years', 'city', 'start_date', 'cost'];
                            const isSortable = sortableFields.includes(col);

                            return (
                              <DraggableTableHeader
                                key={col}
                                id={col}
                                isDragEnabled={isColumnDragMode}
                                className={isSortable && !isColumnDragMode ? 'cursor-pointer select-none hover:bg-secondary/50 transition-colors' : ''}
                                onClick={isSortable ? () => handleSort(col as SortField) : undefined}
                              >
                                {isSortable ? (
                                  <div className="flex items-center gap-2">
                                    {columnLabels[col]}
                                    {!isColumnDragMode && <SortIcon field={col} />}
                                  </div>
                                ) : (
                                  columnLabels[col]
                                )}
                              </DraggableTableHeader>
                            );
                          })}
                        </SortableContext>
                        <TableHead className="w-24">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={visibleColumnsCount + 1} className="text-center py-8 text-muted-foreground">
                            לא נמצאו עובדים
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedEmployees.map((employee) => (
                          <TableRow key={employee.id} className="hover:bg-secondary/30 transition-colors">
                            {orderedVisibleColumns.map((col) => {
                              const renderCell = () => {
                                switch (col) {
                                  case 'full_name':
                                    return <TableCell key={col} className="font-medium">{employee.full_name}</TableCell>;
                                  case 'id':
                                    return <TableCell key={col} dir="ltr" className="text-left font-mono text-xs">{employee.id}</TableCell>;
                                  case 'id_number':
                                    return <TableCell key={col}>{employee.id_number}</TableCell>;
                                  case 'birth_date':
                                    return <TableCell key={col} dir="ltr" className="text-left">{employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('he-IL') : '-'}</TableCell>;
                                  case 'job_role_id':
                                    return <TableCell key={col}><Badge variant="secondary">{getRoleName(employee.job_role_id)}</Badge></TableCell>;
                                  case 'project_id':
                                    return <TableCell key={col}>{getProjectName(employee.project_id)}</TableCell>;
                                  case 'branch_id':
                                    return <TableCell key={col}>{getBranchName(employee.branch_id)}</TableCell>;
                                  case 'employing_company_id':
                                    return <TableCell key={col}>{getEmployingCompanyName(employee.employing_company_id)}</TableCell>;
                                  case 'seniority_level_id':
                                    return <TableCell key={col}>{getSeniorityLevelName(employee.seniority_level_id)}</TableCell>;
                                  case 'professional_experience_years':
                                    return <TableCell key={col}>{employee.professional_experience_years} שנים</TableCell>;
                                  case 'organization_experience_years':
                                    return <TableCell key={col}>{getOrganizationExperienceYears(employee.start_date)} שנים</TableCell>;
                                  case 'city':
                                    return <TableCell key={col}>{employee.city || '-'}</TableCell>;
                                  case 'start_date':
                                    return <TableCell key={col} dir="ltr" className="text-left">{new Date(employee.start_date).toLocaleDateString('he-IL')}</TableCell>;
                                  case 'cost':
                                    return <TableCell key={col} dir="ltr" className="text-left">{employee.cost ? `₪${employee.cost.toLocaleString()}` : '-'}</TableCell>;
                                  case 'attrition_risk':
                                    return <TableCell key={col}>{employee.attrition_risk ?? '-'}</TableCell>;
                                  case 'attrition_risk_reason':
                                    return <TableCell key={col} className="max-w-32 truncate" title={employee.attrition_risk_reason || ''}>{employee.attrition_risk_reason || '-'}</TableCell>;
                                  case 'unit_criticality':
                                    return <TableCell key={col}>{employee.unit_criticality ?? '-'}</TableCell>;
                                  case 'salary_raise_date':
                                    return <TableCell key={col} dir="ltr" className="text-left">{employee.salary_raise_date ? new Date(employee.salary_raise_date).toLocaleDateString('he-IL') : '-'}</TableCell>;
                                  case 'salary_raise_percentage':
                                    return <TableCell key={col} dir="ltr" className="text-left">{employee.salary_raise_percentage ? `${employee.salary_raise_percentage}%` : '-'}</TableCell>;
                                  case 'created_at':
                                    return <TableCell key={col} dir="ltr" className="text-left">{employee.created_at ? new Date(employee.created_at).toLocaleDateString('he-IL') : '-'}</TableCell>;
                                  case 'updated_at':
                                    return <TableCell key={col} dir="ltr" className="text-left">{employee.updated_at ? new Date(employee.updated_at).toLocaleDateString('he-IL') : '-'}</TableCell>;
                                  case 'created_by':
                                    return <TableCell key={col} dir="ltr" className="text-left font-mono text-xs">{employee.created_by ? employee.created_by.slice(0, 8) : '-'}</TableCell>;
                                  case 'our_sourcing':
                                    return <TableCell key={col}>{employee.our_sourcing === true ? 'כן' : employee.our_sourcing === false ? 'לא' : '-'}</TableCell>;
                                  case 'leaving_reason_id':
                                    return <TableCell key={col}>{getLeavingReasonName(employee.leaving_reason_id)}</TableCell>;
                                  default:
                                    return null;
                                }
                              };
                              return renderCell();
                            })}
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openViewDialog(employee)}
                                  title="צפייה"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openLeaveDialog(employee)}
                                  title="סמן כעזב"
                                >
                                  <UserMinus className="w-4 h-4 text-orange-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(employee)}
                                  title="עריכה"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(employee)}
                                  className="text-destructive hover:text-destructive"
                                  title="מחיקה"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 bg-popover">
              <ContextMenuLabel>עמודות נראות</ContextMenuLabel>
              <ContextMenuSeparator />
              <ScrollArea className="max-h-64">
                {Object.entries(columnLabels).map(([key, label]) => {
                  // Hide the id column from the menu
                  if (key === 'id') return null;
                  // Hide manager-only columns for non-managers
                  if (managerOnlyColumns.includes(key) && !isManager) return null;
                  return (
                    <ContextMenuCheckboxItem
                      key={key}
                      checked={visibleColumns[key]}
                      onCheckedChange={() => toggleColumnVisibility(key)}
                    >
                      {label}
                    </ContextMenuCheckboxItem>
                  );
                })}
              </ScrollArea>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          מציג {sortedEmployees.length} מתוך {employees.length} עובדים
        </p>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-full h-[100dvh] max-h-[100dvh] rounded-none p-4 sm:p-6 sm:rounded-lg sm:h-auto sm:max-h-[85vh] max-w-4xl sm:w-[90vw] flex flex-col overflow-hidden">
            <DialogHeader className="text-right flex-shrink-0">
              <DialogTitle className="text-right">עריכת עובדים - {selectedEmployee?.full_name}</DialogTitle>
              <DialogDescription className="text-right">עדכן את פרטי העובד</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 overflow-y-auto pr-4">
              <div className="grid gap-4 py-4">
                {renderFormFields()}
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <Button type="button" onClick={handleEdit} disabled={formLoading}>
                {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                עדכן
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="w-full h-[100dvh] max-h-[100dvh] rounded-none p-4 sm:p-6 sm:rounded-lg sm:h-auto sm:max-h-[85vh] max-w-4xl sm:w-[90vw] flex flex-col overflow-hidden">
            <DialogHeader className="text-right flex-shrink-0">
              <DialogTitle className="text-right">פרטי עובד</DialogTitle>
              <DialogDescription className="text-right">צפייה בפרטי העובד</DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <>
                <ScrollArea className="flex-1 overflow-y-auto pr-4">
                  <div className="grid gap-4 py-4">
                    {renderFormFields(true)}
                  </div>
                </ScrollArea>
                <DialogFooter className="mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    סגור
                  </Button>
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    openEditDialog(selectedEmployee);
                  }}>
                    עבור לעריכה
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Leave Confirmation Dialog */}
        <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
          <DialogContent className="sm:max-w-md text-right flex flex-col items-end">
            <DialogHeader className="w-full">
              <DialogTitle className="text-right">סימון עובד שעזב</DialogTitle>
              <DialogDescription className="text-right">
                האם אתה בטוח שברצונך לסמן את {selectedLeaveEmployee?.full_name} כעובד שעזב?
                לאחר סימון זה, העובד לא יופיע בטבלאות ובדשבורדים הפעילים (אך יישמר במערכת ותוכל לצפות בו בעמוד "עובדים שעזבו").
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 w-full">
              <div className="space-y-2 text-right">
                <Label htmlFor="leave_date">תאריך עזיבה *</Label>
                <Input
                  id="leave_date"
                  type="date"
                  dir="ltr"
                  className="text-right"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 text-right">
                <Label htmlFor="leave_reason">סיבת עזיבה</Label>
                <Input
                  id="leave_reason"
                  className="text-right"
                  placeholder="הזן פירט על סיבת העזיבה (אופציונלי)"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="w-full flex justify-start space-x-2 space-x-reverse mt-4">
              <Button type="button" variant="outline" onClick={() => setIsLeaveDialogOpen(false)}>
                ביטול
              </Button>
              <Button type="button" variant="destructive" onClick={handleLeaveConfirm} disabled={formLoading}>
                {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                אשר עזיבה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
