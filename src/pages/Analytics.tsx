import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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
  DialogDescription,
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
import { Loader2, Users, Eye, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

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

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(200, 80%, 50%)',
  'hsl(330, 70%, 50%)',
];

export default function Analytics() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isManager, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<NamedEntity[]>([]);
  const [roles, setRoles] = useState<NamedEntity[]>([]);
  const [companies, setCompanies] = useState<NamedEntity[]>([]);
  const [branches, setBranches] = useState<NamedEntity[]>([]);
  const [seniorityLevels, setSeniorityLevels] = useState<NamedEntity[]>([]);
  const [leavingReasons, setLeavingReasons] = useState<NamedEntity[]>([]);
  const [performanceLevels, setPerformanceLevels] = useState<NamedEntity[]>([]);

  // Filter states
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Dialog state for employee list by program
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);

  // Dialog state for employee list by branch
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);

  // Dialog state for employee list by seniority
  const [selectedSeniority, setSelectedSeniority] = useState<string | null>(null);
  const [isSeniorityDialogOpen, setIsSeniorityDialogOpen] = useState(false);

  // Dialog state for employee list by city
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isCityDialogOpen, setIsCityDialogOpen] = useState(false);

  // Dialog state for employee list by company
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);

  // Dialog state for employee list by criticality
  const [selectedCriticality, setSelectedCriticality] = useState<string | null>(null);
  const [isCriticalityDialogOpen, setIsCriticalityDialogOpen] = useState(false);

  // Dialog state for employee list by attrition risk
  const [selectedAttritionRisk, setSelectedAttritionRisk] = useState<string | null>(null);
  const [isAttritionRiskDialogOpen, setIsAttritionRiskDialogOpen] = useState(false);

  // Dialog state for employee list by salary gap
  const [selectedSalaryGap, setSelectedSalaryGap] = useState<string | null>(null);
  const [isSalaryGapDialogOpen, setIsSalaryGapDialogOpen] = useState(false);

  // Dialog state for employee list by salary distribution range
  const [selectedSalaryRange, setSelectedSalaryRange] = useState<string | null>(null);
  const [isSalaryRangeDialogOpen, setIsSalaryRangeDialogOpen] = useState(false);

  // Dialog state for employee list by attention score
  const [selectedAttentionScore, setSelectedAttentionScore] = useState<string | null>(null);
  const [isAttentionScoreDialogOpen, setIsAttentionScoreDialogOpen] = useState(false);

  // Dialog state for employee list by leaving reason
  const [selectedLeavingReason, setSelectedLeavingReason] = useState<string | null>(null);
  const [isLeavingReasonDialogOpen, setIsLeavingReasonDialogOpen] = useState(false);

  // Dialog state for viewing single employee details
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEmployeeDetailDialogOpen, setIsEmployeeDetailDialogOpen] = useState(false);

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

  const formatToHebrewNumber = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(num)) return '';
    return Math.round(num).toLocaleString('he-IL');
  };

  const getOrganizationExperienceYears = (startDate: string) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.round(diffYears * 10) / 10);
  };

  const fetchData = async () => {
    setLoading(true);

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
    setLoading(false);
  };

  // Filter employees based on selected filters
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      // Filter by project
      if (filterProject !== 'all' && emp.project_id !== filterProject) {
        return false;
      }
      // Filter by start date range
      if (filterStartDate && emp.start_date < filterStartDate) {
        return false;
      }
      if (filterEndDate && emp.start_date > filterEndDate) {
        return false;
      }
      return true;
    });
  }, [allEmployees, filterProject, filterStartDate, filterEndDate]);

  // Calculate chart data based on filtered employees
  const employeesByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const projectName = projects.find((p) => p.id === emp.project_id)?.name || 'לא משויך';
      counts[projectName] = (counts[projectName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredEmployees, projects]);

  const employeesByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const roleName = roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר';
      counts[roleName] = (counts[roleName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredEmployees, roles]);

  const employeesByCity = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const city = emp.city || 'לא מוגדר';
      counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredEmployees]);

  const employeesByCompany = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const companyName = companies.find((c) => c.id === emp.employing_company_id)?.name || 'לא מוגדר';
      counts[companyName] = (counts[companyName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredEmployees, companies]);

  const employeesByBranch = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const branchName = branches.find((b) => b.id === emp.branch_id)?.name || 'לא מוגדר';
      counts[branchName] = (counts[branchName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredEmployees, branches]);

  const employeesBySeniority = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const seniorityName = seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר';
      counts[seniorityName] = (counts[seniorityName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredEmployees, seniorityLevels]);

  const costByProject = useMemo(() => {
    const costs: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const projectName = projects.find((p) => p.id === emp.project_id)?.name || 'לא משויך';
      costs[projectName] = (costs[projectName] || 0) + (emp.cost || 0);
    });
    return Object.entries(costs)
      .map(([name, cost]) => ({ name, cost }))
      .filter((item) => item.cost > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [filteredEmployees, projects]);

  const costByBranch = useMemo(() => {
    const costs: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const branchName = branches.find((b) => b.id === emp.branch_id)?.name || 'לא מוגדר';
      costs[branchName] = (costs[branchName] || 0) + (emp.cost || 0);
    });
    return Object.entries(costs)
      .map(([name, cost]) => ({ name, cost }))
      .filter((item) => item.cost > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [filteredEmployees, branches]);

  const costByCompany = useMemo(() => {
    const costs: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const companyName = companies.find((c) => c.id === emp.employing_company_id)?.name || 'לא מוגדר';
      costs[companyName] = (costs[companyName] || 0) + (emp.cost || 0);
    });
    return Object.entries(costs)
      .map(([name, cost]) => ({ name, cost }))
      .filter((item) => item.cost > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [filteredEmployees, companies]);

  const employeesByCriticality = useMemo(() => {
    const counts: Record<string, number> = {};
    // Initialize all criticality levels (0-5) plus "לא מוגדר"
    for (let i = 0; i <= 5; i++) {
      counts[i.toString()] = 0;
    }
    counts['לא מוגדר'] = 0;

    filteredEmployees.forEach((emp) => {
      if (emp.unit_criticality !== null && emp.unit_criticality !== undefined) {
        counts[emp.unit_criticality.toString()] = (counts[emp.unit_criticality.toString()] || 0) + 1;
      } else {
        counts['לא מוגדר']++;
      }
    });

    // Return sorted by criticality level, with "לא מוגדר" at the end
    return [
      ...Array.from({ length: 6 }, (_, i) => ({ name: criticalityLabels[i.toString()] || i.toString(), value: counts[i.toString()] })),
      { name: 'לא מוגדר', value: counts['לא מוגדר'] },
    ].filter((item) => item.value > 0);
  }, [filteredEmployees]);

  const employeesByAttritionRisk = useMemo(() => {
    const counts: Record<string, number> = {};
    // Initialize all risk levels (0-5) plus "לא מוגדר"
    for (let i = 0; i <= 5; i++) {
      counts[i.toString()] = 0;
    }
    counts['לא מוגדר'] = 0;

    filteredEmployees.forEach((emp) => {
      if (emp.attrition_risk !== null && emp.attrition_risk !== undefined) {
        counts[emp.attrition_risk.toString()] = (counts[emp.attrition_risk.toString()] || 0) + 1;
      } else {
        counts['לא מוגדר']++;
      }
    });

    // Return sorted by risk level, with "לא מוגדר" at the end
    return [
      ...Array.from({ length: 6 }, (_, i) => ({ name: attritionRiskLabels[i.toString()] || i.toString(), value: counts[i.toString()] })),
      { name: 'לא מוגדר', value: counts['לא מוגדר'] },
    ].filter((item) => item.value > 0);
  }, [filteredEmployees]);

  const employeesByAttentionScore = useMemo(() => {
    const counts: Record<number, number> = {};
    // Attention score can range from 0 (0*0) to 25 (5*5)
    for (let i = 0; i <= 25; i++) {
      counts[i] = 0;
    }

    filteredEmployees.forEach((emp) => {
      const criticality = emp.unit_criticality ?? 0;
      const attritionRisk = emp.attrition_risk ?? 0;
      const score = criticality * attritionRisk;
      counts[score] = (counts[score] || 0) + 1;
    });

    // Return only scores that have employees, sorted by score
    return Object.entries(counts)
      .map(([score, value]) => ({ name: score, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => parseInt(b.name) - parseInt(a.name));
  }, [filteredEmployees]);

  const hiringTrend = useMemo(() => {
    const today = new Date();
    const monthCounts: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[key] = 0;
    }
    filteredEmployees.forEach((emp) => {
      if (emp.start_date) {
        const startDate = new Date(emp.start_date);
        const key = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        if (key in monthCounts) {
          monthCounts[key]++;
        }
      }
    });
    const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
    return Object.entries(monthCounts).map(([key, count]) => {
      const [year, month] = key.split('-');
      return {
        month: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
        count,
      };
    });
  }, [filteredEmployees]);

  const seniorityTrend = useMemo(() => {
    // Generate months from Jan 2025 to current month
    const startYear = 2025;
    const startMonth = 0; // January
    const today = new Date();
    const months: { key: string; label: string }[] = [];

    let currentDate = new Date(startYear, startMonth, 1);
    while (currentDate <= today) {
      const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
      const label = `${monthNames[currentDate.getMonth()]} ${String(currentDate.getFullYear()).slice(2)}`;
      months.push({ key, label });
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    // For each month, count employees by seniority who started on or before that month
    return months.map(({ key, label }) => {
      const [year, month] = key.split('-').map(Number);
      const endOfMonth = new Date(year, month, 0); // Last day of the month

      const counts: Record<string, number> = {};
      seniorityLevels.forEach(level => {
        counts[level.name] = 0;
      });
      counts['לא מוגדר'] = 0;

      filteredEmployees.forEach((emp) => {
        if (emp.start_date) {
          const startDate = new Date(emp.start_date);
          if (startDate <= endOfMonth) {
            const seniorityName = seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר';
            counts[seniorityName] = (counts[seniorityName] || 0) + 1;
          }
        }
      });

      return {
        month: label,
        ...counts,
      };
    });
  }, [filteredEmployees, seniorityLevels]);

  const avgExperienceByRole = useMemo(() => {
    const roleData: Record<string, { total: number; count: number }> = {};
    filteredEmployees.forEach((emp) => {
      const roleName = roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר';
      if (!roleData[roleName]) {
        roleData[roleName] = { total: 0, count: 0 };
      }
      roleData[roleName].total += emp.professional_experience_years || 0;
      roleData[roleName].count += 1;
    });
    return Object.entries(roleData)
      .map(([name, data]) => ({
        name,
        average: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.average - a.average);
  }, [filteredEmployees, roles]);

  // Super Admin exclusive metrics
  const superAdminMetrics = useMemo(() => {
    if (!isSuperAdmin) return null;

    const totalCost = filteredEmployees.reduce((sum, emp) => sum + (emp.cost || 0), 0);
    const totalEstimatedSalary = filteredEmployees.reduce((sum, emp) => {
      // Estimated salary = cost / 1.4 / 1.1 / 1.18
      const salary = emp.cost ? emp.cost / 1.4 / 1.1 / 1.18 : 0;
      return sum + salary;
    }, 0);
    const totalRealMarketSalary = filteredEmployees.reduce((sum, emp) => sum + (emp.real_market_salary || 0), 0);

    // Employees with revolving door flag
    const revolvingDoorCount = filteredEmployees.filter(emp => emp.revolving_door === true).length;

    // Salary gap analysis
    const employeesWithBothSalaries = filteredEmployees.filter(
      emp => emp.cost && emp.real_market_salary
    );
    const avgSalaryGap = employeesWithBothSalaries.length > 0
      ? employeesWithBothSalaries.reduce((sum, emp) => {
        const estimatedSalary = emp.cost! / 1.4 / 1.1 / 1.18;
        const gap = emp.real_market_salary! - estimatedSalary;
        return sum + gap;
      }, 0) / employeesWithBothSalaries.length
      : 0;

    return {
      totalCost,
      totalEstimatedSalary,
      totalRealMarketSalary,
      revolvingDoorCount,
      avgSalaryGap,
      employeeCount: filteredEmployees.length,
    };
  }, [filteredEmployees, isSuperAdmin]);

  // Salary distribution for super admin
  const salaryDistribution = useMemo(() => {
    if (!isSuperAdmin) return [];

    const ranges = [
      { min: 0, max: 10000, label: 'עד 10K' },
      { min: 10000, max: 15000, label: '10K-15K' },
      { min: 15000, max: 20000, label: '15K-20K' },
      { min: 20000, max: 25000, label: '20K-25K' },
      { min: 25000, max: 30000, label: '25K-30K' },
      { min: 30000, max: Infinity, label: '30K+' },
    ];

    return ranges.map(range => {
      const count = filteredEmployees.filter(emp => {
        const salary = emp.cost ? emp.cost / 1.4 / 1.1 / 1.18 : 0;
        return salary >= range.min && salary < range.max;
      }).length;
      return { name: range.label, value: count };
    }).filter(item => item.value > 0);
  }, [filteredEmployees, isSuperAdmin]);

  // Get employees for selected salary distribution range
  const employeesInSelectedSalaryRange = useMemo(() => {
    if (!selectedSalaryRange) return [];

    const ranges = [
      { min: 0, max: 10000, label: 'עד 10K' },
      { min: 10000, max: 15000, label: '10K-15K' },
      { min: 15000, max: 20000, label: '15K-20K' },
      { min: 20000, max: 25000, label: '20K-25K' },
      { min: 25000, max: 30000, label: '25K-30K' },
      { min: 30000, max: Infinity, label: '30K+' },
    ];

    const range = ranges.find(r => r.label === selectedSalaryRange);
    if (!range) return [];

    return filteredEmployees
      .filter(emp => {
        const salary = emp.cost ? emp.cost / 1.4 / 1.1 / 1.18 : 0;
        return salary >= range.min && salary < range.max;
      })
      .map(emp => ({
        ...emp,
        roleName: roles.find(r => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find(s => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
        branchName: branches.find(b => b.id === emp.branch_id)?.name || 'לא מוגדר',
        projectName: projects.find(p => p.id === emp.project_id)?.name || 'לא משויך',
        estimatedSalary: emp.cost ? Math.round(emp.cost / 1.4 / 1.1 / 1.18) : null,
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedSalaryRange, roles, seniorityLevels, branches, projects]);

  // Salary gap distribution for super admin
  const salaryGapDistribution = useMemo(() => {
    if (!isSuperAdmin) return [];

    const employeesWithBothSalaries = filteredEmployees.filter(
      emp => emp.cost && emp.real_market_salary
    );

    if (employeesWithBothSalaries.length === 0) return [];

    const ranges = [
      { min: -Infinity, max: -5000, label: 'משלמים יותר מ-5K', minVal: -Infinity, maxVal: -5000 },
      { min: -5000, max: -2000, label: 'משלמים 2K-5K יותר', minVal: -5000, maxVal: -2000 },
      { min: -2000, max: 0, label: 'משלמים עד 2K יותר', minVal: -2000, maxVal: 0 },
      { min: 0, max: 2000, label: 'שוק גבוה עד 2K', minVal: 0, maxVal: 2000 },
      { min: 2000, max: 5000, label: 'שוק גבוה 2K-5K', minVal: 2000, maxVal: 5000 },
      { min: 5000, max: Infinity, label: 'שוק גבוה מעל 5K', minVal: 5000, maxVal: Infinity },
    ];

    return ranges.map(range => {
      const count = employeesWithBothSalaries.filter(emp => {
        const estimatedSalary = emp.cost! / 1.4 / 1.1 / 1.18;
        const gap = emp.real_market_salary! - estimatedSalary;
        return gap >= range.min && gap < range.max;
      }).length;
      return {
        name: range.label,
        value: count,
        isNegative: range.max <= 0,
        minVal: range.minVal,
        maxVal: range.maxVal,
      };
    }).filter(item => item.value > 0);
  }, [filteredEmployees, isSuperAdmin]);

  // Get employees for selected salary gap range
  const employeesInSelectedSalaryGap = useMemo(() => {
    if (!selectedSalaryGap) return [];

    const rangeData = salaryGapDistribution.find(d => d.name === selectedSalaryGap);
    if (!rangeData) return [];

    return filteredEmployees
      .filter(emp => {
        if (!emp.cost || !emp.real_market_salary) return false;
        const estimatedSalary = emp.cost / 1.4 / 1.1 / 1.18;
        const gap = emp.real_market_salary - estimatedSalary;
        return gap >= rangeData.minVal && gap < rangeData.maxVal;
      })
      .map(emp => ({
        ...emp,
        roleName: roles.find(r => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find(s => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
        branchName: branches.find(b => b.id === emp.branch_id)?.name || 'לא מוגדר',
        projectName: projects.find(p => p.id === emp.project_id)?.name || 'לא משויך',
        estimatedSalary: emp.cost ? Math.round(emp.cost / 1.4 / 1.1 / 1.18) : null,
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedSalaryGap, salaryGapDistribution, roles, seniorityLevels, branches, projects]);

  const employeesByLeavingReason = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      if (emp.leaving_reason_id) {
        const reasonName = leavingReasons.find((r) => r.id === emp.leaving_reason_id)?.name || 'לא מוגדר';
        counts[reasonName] = (counts[reasonName] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEmployees, leavingReasons]);



  const employeesInSelectedProgram = useMemo(() => {
    if (!selectedProgram) return [];

    return filteredEmployees
      .filter((emp) => {
        const projectName = projects.find((p) => p.id === emp.project_id)?.name || 'לא משויך';
        return projectName === selectedProgram;
      })
      .map((emp) => ({
        ...emp,
        roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedProgram, projects, roles, seniorityLevels]);

  const handleProgramClick = (programName: string) => {
    setSelectedProgram(programName);
    setIsProgramDialogOpen(true);
  };

  // Get employees for selected branch
  const employeesInSelectedBranch = useMemo(() => {
    if (!selectedBranch) return [];

    return filteredEmployees
      .filter((emp) => {
        const branchName = branches.find((b) => b.id === emp.branch_id)?.name || 'לא מוגדר';
        return branchName === selectedBranch;
      })
      .map((emp) => ({
        ...emp,
        roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedBranch, branches, roles, seniorityLevels]);

  const handleBranchClick = (branchName: string) => {
    setSelectedBranch(branchName);
    setIsBranchDialogOpen(true);
  };

  // Get employees for selected seniority
  const employeesInSelectedSeniority = useMemo(() => {
    if (!selectedSeniority) return [];

    return filteredEmployees
      .filter((emp) => {
        const seniorityName = seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר';
        return seniorityName === selectedSeniority;
      })
      .map((emp) => ({
        ...emp,
        roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedSeniority, seniorityLevels, roles]);

  const handleSeniorityClick = (seniorityName: string) => {
    setSelectedSeniority(seniorityName);
    setIsSeniorityDialogOpen(true);
  };

  // Get employees for selected city
  const employeesInSelectedCity = useMemo(() => {
    if (!selectedCity) return [];

    return filteredEmployees
      .filter((emp) => {
        const cityName = emp.city || 'לא מוגדר';
        return cityName === selectedCity;
      })
      .map((emp) => ({
        ...emp,
        roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedCity, roles, seniorityLevels]);

  const handleCityClick = (cityName: string) => {
    setSelectedCity(cityName);
    setIsCityDialogOpen(true);
  };

  // Get employees for selected company
  const employeesInSelectedCompany = useMemo(() => {
    if (!selectedCompany) return [];

    return filteredEmployees
      .filter((emp) => {
        const companyName = companies.find((c) => c.id === emp.employing_company_id)?.name || 'לא מוגדר';
        return companyName === selectedCompany;
      })
      .map((emp) => ({
        ...emp,
        roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedCompany, companies, roles, seniorityLevels]);

  const handleCompanyClick = (companyName: string) => {
    setSelectedCompany(companyName);
    setIsCompanyDialogOpen(true);
  };

  // Get employees for selected criticality
  const employeesInSelectedCriticality = useMemo(() => {
    if (selectedCriticality === null) return [];

    return filteredEmployees
      .filter((emp) => {
        if (selectedCriticality === 'לא מוגדר') {
          return emp.unit_criticality === null || emp.unit_criticality === undefined;
        }
        const label = getCriticalityLabel(emp.unit_criticality);
        return emp.unit_criticality?.toString() === selectedCriticality || label === selectedCriticality;
      })
      .map((emp) => ({
        ...emp,
        roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
        branchName: branches.find((b) => b.id === emp.branch_id)?.name || 'לא מוגדר',
        projectName: projects.find((p) => p.id === emp.project_id)?.name || 'לא משויך',
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedCriticality, roles, seniorityLevels]);

  const handleCriticalityClick = (criticalityLevel: string) => {
    setSelectedCriticality(criticalityLevel);
    setIsCriticalityDialogOpen(true);
  };

  // Get employees for selected attrition risk
  const employeesInSelectedAttritionRisk = useMemo(() => {
    if (selectedAttritionRisk === null) return [];

    return filteredEmployees
      .filter((emp) => {
        if (selectedAttritionRisk === 'לא מוגדר') {
          return emp.attrition_risk === null || emp.attrition_risk === undefined;
        }
        const label = getAttritionRiskLabel(emp.attrition_risk);
        return emp.attrition_risk?.toString() === selectedAttritionRisk || label === selectedAttritionRisk;
      })
      .map((emp) => ({
        ...emp,
        roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
        branchName: branches.find((b) => b.id === emp.branch_id)?.name || 'לא מוגדר',
        projectName: projects.find((p) => p.id === emp.project_id)?.name || 'לא משויך',
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedAttritionRisk, roles, seniorityLevels]);

  const handleAttritionRiskClick = (riskLevel: string) => {
    setSelectedAttritionRisk(riskLevel);
    setIsAttritionRiskDialogOpen(true);
  };

  // Get employees for selected attention score
  const employeesInSelectedAttentionScore = useMemo(() => {
    if (selectedAttentionScore === null) return [];
    const targetScore = parseInt(selectedAttentionScore);

    return filteredEmployees
      .filter((emp) => {
        const criticality = emp.unit_criticality ?? 0;
        const attritionRisk = emp.attrition_risk ?? 0;
        return criticality * attritionRisk === targetScore;
      })
      .map((emp) => ({
        ...emp,
        roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
        branchName: branches.find((b) => b.id === emp.branch_id)?.name || 'לא מוגדר',
        projectName: projects.find((p) => p.id === emp.project_id)?.name || 'לא משויך',
        attentionScore: (emp.unit_criticality ?? 0) * (emp.attrition_risk ?? 0),
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedAttentionScore, roles, seniorityLevels, branches, projects]);

  const handleAttentionScoreClick = (score: string) => {
    setSelectedAttentionScore(score);
    setIsAttentionScoreDialogOpen(true);
  };

  const openEmployeeDetailDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEmployeeDetailDialogOpen(true);
  };

  // Helper functions to get names from IDs
  const getRoleName = (roleId: string | null, rolesList = roles) => {
    if (!roleId) return '-';
    return rolesList.find((r) => r.id === roleId)?.name || '-';
  };

  const getProjectName = (projectId: string | null, projectsList = projects) => {
    if (!projectId) return '-';
    return projectsList.find((p) => p.id === projectId)?.name || '-';
  };

  const getBranchName = (branchId: string | undefined | null, branchesList = branches) => {
    if (!branchId) return '-';
    return branchesList.find((b) => b.id === branchId)?.name || '-';
  };

  const getEmployingCompanyName = (companyId: string | undefined | null, companiesList = companies) => {
    if (!companyId) return '-';
    return companiesList.find((c) => c.id === companyId)?.name || '-';
  };

  const getSeniorityLevelName = (seniorityId: string | undefined | null, seniorityList = seniorityLevels) => {
    if (!seniorityId) return '-';
    return seniorityList.find((s) => s.id === seniorityId)?.name || '-';
  };

  const getPerformanceLevelName = (levelId: string | null | undefined, performanceList = performanceLevels) => {
    if (!levelId) return 'לא מוגדר';
    return performanceList.find(l => l.id === levelId)?.name || 'לא מוגדר';
  };

  const getLeavingReasonName = (id: string | null | undefined, leavingReasonsList = leavingReasons) => {
    if (!id) return '-';
    return leavingReasonsList.find(r => r.id === id)?.name || '-';
  };

  const clearFilters = () => {
    setFilterProject('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const activeFiltersCount = [
    filterProject !== 'all',
    filterStartDate !== '',
    filterEndDate !== '',
  ].filter(Boolean).length;

  // Get employees for selected leaving reason
  const employeesInSelectedLeavingReason = useMemo(() => {
    if (!selectedLeavingReason) return [];

    return filteredEmployees
      .filter((emp) => {
        const reasonName = leavingReasons.find((r) => r.id === emp.leaving_reason_id)?.name || 'לא מוגדר';
        return reasonName === selectedLeavingReason;
      })
      .map((emp) => ({
        ...emp,
        roleName: roles.find((r) => r.id === emp.job_role_id)?.name || 'לא מוגדר',
        seniorityName: seniorityLevels.find((s) => s.id === emp.seniority_level_id)?.name || 'לא מוגדר',
        branchName: branches.find((b) => b.id === emp.branch_id)?.name || 'לא מוגדר',
        projectName: projects.find((p) => p.id === emp.project_id)?.name || 'לא משויך',
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [filteredEmployees, selectedLeavingReason, leavingReasons, roles, seniorityLevels, branches, projects]);

  const handleLeavingReasonClick = (reasonName: string) => {
    setSelectedLeavingReason(reasonName);
    setIsLeavingReasonDialogOpen(true);
  };


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label || payload[0].name}</p>
          <p className="text-primary">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">דשבורדים ויזואליים</h1>
            <p className="text-muted-foreground mt-1">
              ניתוח נתונים וגרפים
              {activeFiltersCount > 0 && (
                <span className="text-primary mr-2">
                  ({filteredEmployees.length} מתוך {allEmployees.length} עובדים)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4 ml-2" />
              פילטרים
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -left-2 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="w-4 h-4 ml-2" />
                נקה
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <Card className="p-4 bg-secondary/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>תכנית</Label>
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="כל התכניות" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">כל התכניות</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>מתאריך התחלה</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  dir="ltr"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>עד תאריך התחלה</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  dir="ltr"
                  className="bg-background"
                />
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="w-full">
            <div className="outline-none">
              <div className="space-y-6">
                {/* Row 1: Pie charts - Program and Role */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>התפלגות עובדים לפי תכנית</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={employeesByProject}
                              cx="65%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={true}
                              onClick={(data) => handleProgramClick(data.name)}
                              style={{ cursor: 'pointer' }}
                            >
                              {employeesByProject.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              layout="vertical"
                              align="left"
                              verticalAlign="middle"
                              wrapperStyle={{ paddingLeft: '10px', fontSize: '12px', textAlign: 'right', cursor: 'pointer' }}
                              onClick={(data) => handleProgramClick(data.value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>התפלגות עובדים לפי תפקיד</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={employeesByRole}
                              cx="65%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={true}
                            >
                              {employeesByRole.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              layout="vertical"
                              align="left"
                              verticalAlign="middle"
                              wrapperStyle={{ paddingLeft: '10px', fontSize: '12px', textAlign: 'right' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Pie charts - Branch and Seniority */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>התפלגות עובדים לפי ענף</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={employeesByBranch}
                              cx="65%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={true}
                              onClick={(data) => handleBranchClick(data.name)}
                              style={{ cursor: 'pointer' }}
                            >
                              {employeesByBranch.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              layout="vertical"
                              align="left"
                              verticalAlign="middle"
                              wrapperStyle={{ paddingLeft: '10px', fontSize: '12px', textAlign: 'right', cursor: 'pointer' }}
                              onClick={(data) => handleBranchClick(data.value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>התפלגות עובדים לפי רמת ותק</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={employeesBySeniority}
                              cx="65%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={true}
                              onClick={(data) => handleSeniorityClick(data.name)}
                              style={{ cursor: 'pointer' }}
                            >
                              {employeesBySeniority.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              layout="vertical"
                              align="left"
                              verticalAlign="middle"
                              wrapperStyle={{ paddingLeft: '10px', fontSize: '12px', textAlign: 'right', cursor: 'pointer' }}
                              onClick={(data) => handleSeniorityClick(data.value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Hiring trend */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>מגמת קליטות - 12 חודשים אחרונים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={hiringTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Seniority trend over time */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>מגמת עובדים לפי רמת Seniority - מינואר 2025</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={seniorityTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip />
                          <Legend
                            wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                          />
                          {seniorityLevels.map((level, index) => (
                            <Line
                              key={level.id}
                              type="monotone"
                              dataKey={level.name}
                              stroke={COLORS[index % COLORS.length]}
                              strokeWidth={2}
                              dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          ))}
                          <Line
                            type="monotone"
                            dataKey="לא מוגדר"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Row 3: Bar charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>התפלגות עובדים לפי עיר (10 הגדולות)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={employeesByCity}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                              dataKey="value"
                              fill="hsl(var(--accent))"
                              radius={[4, 4, 0, 0]}
                              onClick={(data) => handleCityClick(data.name)}
                              style={{ cursor: 'pointer' }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>התפלגות עובדים לפי חברה מעסיקה</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={employeesByCompany}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                              dataKey="value"
                              fill="hsl(var(--primary))"
                              radius={[4, 4, 0, 0]}
                              onClick={(data) => handleCompanyClick(data.name)}
                              style={{ cursor: 'pointer' }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 4: Average experience by role */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>ממוצע ותק מקצועי לפי תפקיד (שנים)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={avgExperienceByRole}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                    <p className="font-medium text-foreground">{label}</p>
                                    <p className="text-primary">{payload[0].value} שנים</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="average" fill="hsl(280, 65%, 60%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Row 5: Cost charts (managers only) */}
                {isManager && (costByProject.length > 0 || costByBranch.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {costByProject.length > 0 && (
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle>עלות חודשית לפי תכנית</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={costByProject}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                          <p className="font-medium text-foreground">{label}</p>
                                          <p className="text-primary" dir="ltr">₪{payload[0].value?.toLocaleString()}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar dataKey="cost" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {costByBranch.length > 0 && (
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle>עלות חודשית לפי ענף</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={costByBranch}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                          <p className="font-medium text-foreground">{label}</p>
                                          <p className="text-primary" dir="ltr">₪{payload[0].value?.toLocaleString()}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar dataKey="cost" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Row: Criticality and Attrition Risk charts (managers only) */}
                {isManager && (employeesByCriticality.length > 0 || employeesByAttritionRisk.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {employeesByCriticality.length > 0 && (
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle>התפלגות עובדים לפי קריטיות ליחידה</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={employeesByCriticality}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                          <p className="font-medium text-foreground">רמת קריטיות: {label}</p>
                                          <p className="text-primary">{payload[0].value} עובדים</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar
                                  dataKey="value"
                                  fill="hsl(var(--accent))"
                                  radius={[4, 4, 0, 0]}
                                  onClick={(data) => handleCriticalityClick(data.name)}
                                  style={{ cursor: 'pointer' }}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {employeesByAttritionRisk.length > 0 && (
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle>התפלגות עובדים לפי סיכוי לעזיבה</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={employeesByAttritionRisk}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                          <p className="font-medium text-foreground">רמת סיכוי: {label}</p>
                                          <p className="text-primary">{payload[0].value} עובדים</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar
                                  dataKey="value"
                                  fill="hsl(var(--destructive))"
                                  radius={[4, 4, 0, 0]}
                                  onClick={(data) => handleAttritionRiskClick(data.name)}
                                  style={{ cursor: 'pointer' }}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Row: Attention Score chart (managers only) - full width */}
                {isManager && employeesByAttentionScore.length > 0 && (
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>עובדים הדורשים טיפול (קריטיות × סיכוי לעזיבה)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={employeesByAttentionScore}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                      <p className="font-medium text-foreground">ציון דחיפות: {label}</p>
                                      <p className="text-primary">{payload[0].value} עובדים</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar
                              dataKey="value"
                              fill="hsl(var(--warning))"
                              radius={[4, 4, 0, 0]}
                              onClick={(data) => handleAttentionScoreClick(data.name)}
                              style={{ cursor: 'pointer' }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Leaving Reason distribution chart */}
                {employeesByLeavingReason.length > 0 && (
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>התפלגות עובדים לפי סיבת רצון לעזוב</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={employeesByLeavingReason}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                      <p className="font-medium text-foreground">{label}</p>
                                      <p className="text-primary">{payload[0].value} עובדים</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar
                              dataKey="value"
                              fill="hsl(330, 70%, 50%)"
                              radius={[4, 4, 0, 0]}
                              onClick={(data) => handleLeavingReasonClick(data.name)}
                              style={{ cursor: 'pointer' }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Row 6: Cost by company chart (managers only) */}
                {isManager && costByCompany.length > 0 && (
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>עלות חודשית לפי חברה מעסיקה</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={costByCompany}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                      <p className="font-medium text-foreground">{label}</p>
                                      <p className="text-primary" dir="ltr">₪{payload[0].value?.toLocaleString()}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Super Admin Exclusive Dashboard */}
              {isSuperAdmin && superAdminMetrics && (
                <div className="space-y-6 mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-1 bg-destructive rounded-full" />
                    <h2 className="text-xl font-semibold text-foreground">דשבורד מנהלי על בלבד</h2>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="glass-card border-destructive/30">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">סה"כ עלויות חודשיות</p>
                        <p className="text-2xl font-bold text-foreground" dir="ltr">
                          ₪{superAdminMetrics.totalCost.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-destructive/30">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">סה"כ שכר משוער</p>
                        <p className="text-2xl font-bold text-foreground" dir="ltr">
                          ₪{Math.round(superAdminMetrics.totalEstimatedSalary).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-destructive/30">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">עובדי דלת מסתובבת</p>
                        <p className="text-2xl font-bold text-destructive">
                          {superAdminMetrics.revolvingDoorCount}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-destructive/30">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">פער שכר ממוצע</p>
                        <p className={`text-2xl font-bold ${superAdminMetrics.avgSalaryGap >= 0 ? 'text-destructive' : 'text-green-500'}`} dir="ltr">
                          ₪{Math.round(superAdminMetrics.avgSalaryGap).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {superAdminMetrics.avgSalaryGap >= 0 ? '(שוק גבוה יותר)' : '(אנחנו משלמים יותר)'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Salary Distribution Chart */}
                  {salaryDistribution.length > 0 && (
                    <Card className="glass-card border-destructive/30">
                      <CardHeader>
                        <CardTitle>התפלגות שכר משוער</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salaryDistribution}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                        <p className="font-medium text-foreground">טווח שכר: {label}</p>
                                        <p className="text-primary">{payload[0].value} עובדים</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar
                                dataKey="value"
                                fill="hsl(var(--destructive))"
                                radius={[4, 4, 0, 0]}
                                cursor="pointer"
                                onClick={(data) => {
                                  if (data && data.name) {
                                    setSelectedSalaryRange(data.name);
                                    setIsSalaryRangeDialogOpen(true);
                                  }
                                }}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Salary Gap Distribution Chart */}
                  {salaryGapDistribution.length > 0 && (
                    <Card className="glass-card border-destructive/30">
                      <CardHeader>
                        <CardTitle>התפלגות פער שכר (משוער מול שוק)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salaryGapDistribution}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                        <p className="font-medium text-foreground">{label}</p>
                                        <p className={data.isNegative ? 'text-destructive' : 'text-green-500'}>
                                          {payload[0].value} עובדים
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar
                                dataKey="value"
                                radius={[4, 4, 0, 0]}
                                cursor="pointer"
                                onClick={(data) => {
                                  if (data && data.name) {
                                    setSelectedSalaryGap(data.name);
                                    setIsSalaryGapDialogOpen(true);
                                  }
                                }}
                              >
                                {salaryGapDistribution.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isNegative ? 'hsl(var(--destructive))' : 'hsl(142, 76%, 36%)'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          אדום = אנחנו משלמים יותר מהשוק | ירוק = השוק משלם יותר
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>



      <Dialog open={isProgramDialogOpen} onOpenChange={setIsProgramDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים בתכנית: {selectedProgram}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedProgram.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים בתכנית זו
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedProgram.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Branch Employees Dialog */}
      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים בענף: {selectedBranch}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedBranch.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים בענף זה
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedBranch.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Seniority Employees Dialog */}
      <Dialog open={isSeniorityDialogOpen} onOpenChange={setIsSeniorityDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים ברמת ותק: {selectedSeniority}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedSeniority.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים ברמת ותק זו
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedSeniority.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* City Employees Dialog */}
      <Dialog open={isCityDialogOpen} onOpenChange={setIsCityDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים בעיר: {selectedCity}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedCity.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים בעיר זו
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedCity.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Company Employees Dialog */}
      <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים בחברה: {selectedCompany}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedCompany.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים בחברה זו
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedCompany.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Criticality Employees Dialog */}
      <Dialog open={isCriticalityDialogOpen} onOpenChange={setIsCriticalityDialogOpen}>
        <DialogContent className="max-w-6xl w-[95vw]">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים ברמת קריטיות: {selectedCriticality}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedCriticality.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים ברמת קריטיות זו
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">מידת סיכוי לעזיבה</TableHead>
                    <TableHead className="text-right">מידת קריטיות לארגון</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                    <TableHead className="text-right">תכנית</TableHead>
                    <TableHead className="text-right">ענף</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedCriticality.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{getAttritionRiskLabel(emp.attrition_risk)}</TableCell>
                      <TableCell className="text-right">{getCriticalityLabel(emp.unit_criticality)}</TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                      <TableCell className="text-right">{emp.projectName}</TableCell>
                      <TableCell className="text-right">{emp.branchName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Salary Distribution Range Employees Dialog */}
      <Dialog open={isSalaryRangeDialogOpen} onOpenChange={setIsSalaryRangeDialogOpen}>
        <DialogContent className="max-w-6xl w-[95vw]">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים בטווח שכר משוער: {selectedSalaryRange}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedSalaryRange.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים בטווח זה
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">שכר משוער</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                    <TableHead className="text-right">תכנית</TableHead>
                    <TableHead className="text-right">ענף</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedSalaryRange.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{emp.estimatedSalary?.toLocaleString() ?? 'לא מוגדר'}</TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                      <TableCell className="text-right">{emp.projectName}</TableCell>
                      <TableCell className="text-right">{emp.branchName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Salary Gap Employees Dialog */}
      <Dialog open={isSalaryGapDialogOpen} onOpenChange={setIsSalaryGapDialogOpen}>
        <DialogContent className="max-w-6xl w-[95vw]">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים בטווח פער שכר: {selectedSalaryGap}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedSalaryGap.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים בטווח זה
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">שכר שוק</TableHead>
                    <TableHead className="text-right">שכר משוער</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                    <TableHead className="text-right">תכנית</TableHead>
                    <TableHead className="text-right">ענף</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedSalaryGap.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{emp.real_market_salary?.toLocaleString() ?? 'לא מוגדר'}</TableCell>
                      <TableCell className="text-right">{emp.estimatedSalary?.toLocaleString() ?? 'לא מוגדר'}</TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                      <TableCell className="text-right">{emp.projectName}</TableCell>
                      <TableCell className="text-right">{emp.branchName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isAttritionRiskDialogOpen} onOpenChange={setIsAttritionRiskDialogOpen}>
        <DialogContent className="max-w-6xl w-[95vw]">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים ברמת סיכוי לעזיבה: {selectedAttritionRisk}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedAttritionRisk.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים ברמת סיכוי זו
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">מידת סיכוי לעזיבה</TableHead>
                    <TableHead className="text-right">מידת קריטיות לארגון</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                    <TableHead className="text-right">תכנית</TableHead>
                    <TableHead className="text-right">ענף</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedAttritionRisk.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{getAttritionRiskLabel(emp.attrition_risk)}</TableCell>
                      <TableCell className="text-right">{getCriticalityLabel(emp.unit_criticality)}</TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                      <TableCell className="text-right">{emp.projectName}</TableCell>
                      <TableCell className="text-right">{emp.branchName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Attention Score Employees Dialog */}
      <Dialog open={isAttentionScoreDialogOpen} onOpenChange={setIsAttentionScoreDialogOpen}>
        <DialogContent className="max-w-6xl w-[95vw]">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים בציון דחיפות: {selectedAttentionScore}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedAttentionScore.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים בציון דחיפות זה
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">מידת סיכוי לעזיבה</TableHead>
                    <TableHead className="text-right">מידת קריטיות לארגון</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                    <TableHead className="text-right">תכנית</TableHead>
                    <TableHead className="text-right">ענף</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedAttentionScore.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{getAttritionRiskLabel(emp.attrition_risk)}</TableCell>
                      <TableCell className="text-right">{getCriticalityLabel(emp.unit_criticality)}</TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                      <TableCell className="text-right">{emp.projectName}</TableCell>
                      <TableCell className="text-right">{emp.branchName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Leaving Reason Employees Dialog */}
      <Dialog open={isLeavingReasonDialogOpen} onOpenChange={setIsLeavingReasonDialogOpen}>
        <DialogContent className="max-w-6xl w-[95vw]">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              עובדים לפי סיבת רצון לעזוב - קטגוריות: {selectedLeavingReason}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {employeesInSelectedLeavingReason.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים בסיבה זו
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">פעולות</TableHead>
                    <TableHead className="text-right">רמת סיניוריטי</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">שם העובד</TableHead>
                    <TableHead className="text-right">תכנית</TableHead>
                    <TableHead className="text-right">ענף</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesInSelectedLeavingReason.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEmployeeDetailDialog(emp)}
                          title="צפה בפרטי עובד"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{emp.seniorityName}</TableCell>
                      <TableCell className="text-right">{emp.roleName}</TableCell>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                      <TableCell className="text-right">{emp.projectName}</TableCell>
                      <TableCell className="text-right">{emp.branchName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Employee Detail Dialog */}
      <Dialog open={isEmployeeDetailDialogOpen} onOpenChange={setIsEmployeeDetailDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] flex flex-col overflow-hidden" dir="rtl">
          <DialogHeader className="text-right flex-shrink-0">
            <DialogTitle className="text-right flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              פרטי עובד: {selectedEmployee?.full_name}
            </DialogTitle>
            <DialogDescription className="text-right">צפייה בפרטי העובד</DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <Tabs defaultValue="general" dir="rtl" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 gap-2 mb-6 bg-transparent h-auto p-0 shrink-0">
                <TabsTrigger
                  value="general"
                  className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all"
                >
                  כללי
                </TabsTrigger>
                <TabsTrigger
                  value="performance"
                  className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all"
                >
                  ביצועים ושכר
                </TabsTrigger>
                <TabsTrigger
                  value="retention"
                  className="py-2.5 px-4 rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted transition-all"
                >
                  שימור
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 overflow-y-auto pr-4">
                <TabsContent value="general" className="space-y-4 m-0 outline-none pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                      <Label>שם מלא</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.full_name || ''} disabled />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>תפקיד</Label>
                      <Input className="text-right bg-muted" value={getRoleName(selectedEmployee.job_role_id, roles)} disabled />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>תכנית</Label>
                      <Input className="text-right bg-muted" value={getProjectName(selectedEmployee.project_id, projects)} disabled />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>ענף</Label>
                      <Input className="text-right bg-muted" value={getBranchName(selectedEmployee.branch_id, branches)} disabled />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>חברה מעסיקה</Label>
                      <Input className="text-right bg-muted" value={getEmployingCompanyName(selectedEmployee.employing_company_id, companies)} disabled />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>ותק במקצוע (שנים)</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.professional_experience_years?.toString() || '0'} disabled dir="ltr" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>עיר מגורים</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.city || '-'} disabled />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>תאריך תחילת עבודה ביחידה</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.start_date ? new Date(selectedEmployee.start_date).toLocaleDateString('he-IL') : '-'} disabled dir="ltr" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>תאריך לידה</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.birth_date ? new Date(selectedEmployee.birth_date).toLocaleDateString('he-IL') : '-'} disabled dir="ltr" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>מספר טלפון</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.phone || '-'} disabled dir="ltr" />
                    </div>
                    <div className="space-y-2 text-right col-span-2">
                      <Label>טלפון חירום</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.emergency_phone || '-'} disabled dir="ltr" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4 m-0 outline-none pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 text-right col-span-2">
                      <Label>סניוריטי</Label>
                      <Input className="text-right bg-muted" value={getSeniorityLevelName(selectedEmployee.seniority_level_id, seniorityLevels)} disabled />
                    </div>
                    <div className="space-y-2 text-right col-span-2">
                      <Label>קישור ללינקדאין</Label>
                      {selectedEmployee.linkedin_url ? (
                        <a href={selectedEmployee.linkedin_url} target="_blank" rel="noopener noreferrer" className="block p-2 bg-muted rounded-md text-right text-primary hover:underline">
                          {selectedEmployee.linkedin_url}
                        </a>
                      ) : (
                        <Input className="text-right bg-muted" value="-" disabled />
                      )}
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>איתור שלנו?</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.our_sourcing === true ? 'כן' : selectedEmployee.our_sourcing === false ? 'לא' : '-'} disabled />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>דלת מסתובבת</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.revolving_door === true ? 'כן' : selectedEmployee.revolving_door === false ? 'לא' : '-'} disabled />
                    </div>

                    {(isManager || isSuperAdmin) && (
                      <>
                        <div className="space-y-2 text-right col-span-2">
                          <Label>עלות העובד בחודש (₪) - כולל מע"מ</Label>
                          <Input className="text-right bg-muted" value={selectedEmployee.cost ? `₪${formatToHebrewNumber(selectedEmployee.cost)}` : '-'} disabled dir="ltr" />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>שכר חודשי משוער (₪)</Label>
                          <Input
                            className="text-right bg-muted"
                            value={selectedEmployee.cost ? `₪${formatToHebrewNumber(selectedEmployee.cost / 1.4 / 1.1 / 1.18)}` : '-'}
                            disabled
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>שכר חודשי ריאלי בשוק (₪)</Label>
                          <Input className="text-right bg-muted" value={selectedEmployee.real_market_salary ? `₪${formatToHebrewNumber(selectedEmployee.real_market_salary)}` : '-'} disabled dir="ltr" />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>תאריך העלאת שכר</Label>
                          <Input className="text-right bg-muted" value={selectedEmployee.salary_raise_date ? new Date(selectedEmployee.salary_raise_date).toLocaleDateString('he-IL') : '-'} disabled dir="ltr" />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>אחוז העלאת שכר (%)</Label>
                          <Input className="text-right bg-muted" value={selectedEmployee.salary_raise_percentage ? `${formatToHebrewNumber(selectedEmployee.salary_raise_percentage)}%` : '-'} disabled dir="ltr" />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>ביצועי העובד</Label>
                          <Input className="text-right bg-muted" value={getPerformanceLevelName(selectedEmployee.performance_level_id, performanceLevels)} disabled />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>תאריך עדכון ביצועים</Label>
                          <Input className="text-right bg-muted" value={selectedEmployee.performance_update_date ? new Date(selectedEmployee.performance_update_date).toLocaleDateString('he-IL') : '-'} disabled dir="ltr" />
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="retention" className="space-y-4 m-0 outline-none pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 text-right col-span-2">
                      <Label>קריטיות ליחידה (0-5)</Label>
                      <Input className="text-right bg-muted" value={getCriticalityLabel(selectedEmployee.unit_criticality)} disabled />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>סיכוי לעזוב - לדעת היחידה (0-5)</Label>
                      <Input className="text-right bg-muted" value={getAttritionRiskLabel(selectedEmployee.attrition_risk)} disabled />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label>סיבת רצון לעזוב - קטגוריות</Label>
                      <Input className="text-right bg-muted" value={getLeavingReasonName(selectedEmployee.leaving_reason_id, leavingReasons)} disabled />
                    </div>
                    <div className="space-y-2 text-right col-span-2">
                      <Label>סיבת רצון לעזוב - מלל חופשי</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.attrition_risk_reason || '-'} disabled />
                    </div>
                    <div className="space-y-2 text-right col-span-2">
                      <Label>תכנית שימור - מבחינת היחידה</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.retention_plan || '-'} disabled />
                    </div>
                    <div className="space-y-2 text-right col-span-2">
                      <Label>לגייס במקומו?</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.replacement_needed || '-'} disabled />
                    </div>
                    <div className="space-y-2 text-right col-span-2">
                      <Label>סיכוי לעזוב - לדעת החברה (0-5)</Label>
                      <Input className="text-right bg-muted" value={getAttritionRiskLabel(selectedEmployee.company_attrition_risk)} disabled />
                    </div>
                    <div className="space-y-2 text-right col-span-2">
                      <Label>התיחסות חברה למעבר דרומה</Label>
                      <Input className="text-right bg-muted" value={selectedEmployee.company_retention_plan || '-'} disabled />
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>

              <DialogFooter className="mt-4 pt-4 border-t flex justify-start gap-2 flex-row-reverse">
                <Button variant="outline" onClick={() => setIsEmployeeDetailDialogOpen(false)}>סגור</Button>
              </DialogFooter>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

    </MainLayout >
  );
}
