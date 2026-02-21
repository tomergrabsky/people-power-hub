import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2, Cake, UserPlus, Award } from 'lucide-react';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Employee {
  is_left?: boolean;
  left_date?: string;
  left_reason?: string;
  id: string;
  full_name: string;
  birth_date: string | null;
  start_date: string;
  cost: number | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    upcomingBirthdays: 0,
    hiredThisMonth: 0,
    upcomingWorkAnniversaries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isBirthdayDialogOpen, setIsBirthdayDialogOpen] = useState(false);
  const [isPazmuledetDialogOpen, setIsPazmuledetDialogOpen] = useState(false);
  const [isHiredDialogOpen, setIsHiredDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'employees'));
      const fetchedEmployees = (snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[]).filter(emp => !emp.is_left);

      setEmployees(fetchedEmployees);

      const today = new Date();

      // Calculate upcoming birthdays (next 7 days)
      const upcomingBirthdays = fetchedEmployees.filter(emp => {
        if (!emp.birth_date) return false;
        const birthDate = new Date(emp.birth_date);
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = thisYearBirthday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= 0 && diffDays <= 7;
      }).length;

      // Calculate employees hired this month
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const hiredThisMonth = fetchedEmployees.filter(emp => {
        if (!emp.start_date) return false;
        const startDate = new Date(emp.start_date);
        return startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;
      }).length;

      // Calculate upcoming work anniversaries (פז"מולדת) - next 7 days
      const upcomingWorkAnniversaries = fetchedEmployees.filter(emp => {
        if (!emp.start_date) return false;
        const startDate = new Date(emp.start_date);
        const thisYearAnniversary = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());

        if (thisYearAnniversary < today) {
          thisYearAnniversary.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = thisYearAnniversary.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= 0 && diffDays <= 7;
      }).length;

      setStats({
        totalEmployees: fetchedEmployees.length,
        upcomingBirthdays,
        hiredThisMonth,
        upcomingWorkAnniversaries,
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Get employees with upcoming birthdays
  const upcomingBirthdayEmployees = useMemo(() => {
    const today = new Date();
    return employees
      .filter(emp => {
        if (!emp.birth_date) return false;
        const birthDate = new Date(emp.birth_date);
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = thisYearBirthday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= 0 && diffDays <= 7;
      })
      .map(emp => {
        const today = new Date();
        const birthDate = new Date(emp.birth_date!);
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = thisYearBirthday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const age = thisYearBirthday.getFullYear() - birthDate.getFullYear();

        return {
          ...emp,
          daysUntilBirthday: diffDays,
          upcomingAge: age,
          birthdayDate: thisYearBirthday,
        };
      })
      .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
  }, [employees]);

  // Get employees with upcoming work anniversaries (Pazmuledet)
  const upcomingPazmuledetEmployees = useMemo(() => {
    const today = new Date();
    return employees
      .filter(emp => {
        if (!emp.start_date) return false;
        const startDate = new Date(emp.start_date);
        const thisYearAnniversary = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());

        if (thisYearAnniversary < today) {
          thisYearAnniversary.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = thisYearAnniversary.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= 0 && diffDays <= 7;
      })
      .map(emp => {
        const today = new Date();
        const startDate = new Date(emp.start_date!);
        const thisYearAnniversary = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());

        if (thisYearAnniversary < today) {
          thisYearAnniversary.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = thisYearAnniversary.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const yearsAtWork = thisYearAnniversary.getFullYear() - startDate.getFullYear();

        return {
          ...emp,
          daysUntilAnniversary: diffDays,
          yearsAtWork,
          anniversaryDate: thisYearAnniversary,
        };
      })
      .sort((a, b) => a.daysUntilAnniversary - b.daysUntilAnniversary);
  }, [employees]);

  // Get employees hired this month
  const hiredThisMonthEmployees = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return employees
      .filter(emp => {
        if (!emp.start_date) return false;
        const startDate = new Date(emp.start_date);
        return startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;
      })
      .map(emp => ({
        ...emp,
        startDate: new Date(emp.start_date),
      }))
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [employees]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">בית</h1>
          <p className="text-muted-foreground mt-1">סקירה כללית של המערכת</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => navigate('/employees')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  סה״כ עובדים
                </CardTitle>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">עובדים פעילים במערכת</p>
              </CardContent>
            </Card>

            <Card
              className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setIsHiredDialogOpen(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  נקלטו החודש
                </CardTitle>
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.hiredThisMonth}</div>
                <p className="text-xs text-muted-foreground mt-1">עובדים חדשים החודש</p>
              </CardContent>
            </Card>

            <Card
              className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setIsBirthdayDialogOpen(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ימי הולדת קרובים
                </CardTitle>
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Cake className="w-5 h-5 text-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.upcomingBirthdays}</div>
                <p className="text-xs text-muted-foreground mt-1">ב-7 הימים הקרובים</p>
              </CardContent>
            </Card>

            <Card
              className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setIsPazmuledetDialogOpen(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  פז"מולדת קרובים
                </CardTitle>
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.upcomingWorkAnniversaries}</div>
                <p className="text-xs text-muted-foreground mt-1">ב-7 הימים הקרובים</p>
              </CardContent>
            </Card>

          </div>
        )}

        <div className="grid grid-cols-1 gap-6">

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>פעולות מהירות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => navigate('/employees')}
                className="w-full text-right p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors flex items-center gap-3"
              >
                <Users className="w-5 h-5 text-primary" />
                <span>צפייה ברשימת העובדים</span>
              </button>
              <button
                onClick={() => navigate('/employees')}
                className="w-full text-right p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors flex items-center gap-3"
              >
                <UserPlus className="w-5 h-5 text-accent" />
                <span>הוספת עובד חדש</span>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Birthday List Dialog */}
      <Dialog open={isBirthdayDialogOpen} onOpenChange={setIsBirthdayDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-destructive" />
              ימי הולדת ב-7 הימים הקרובים
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {upcomingBirthdayEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים עם ימי הולדת ב-7 הימים הקרובים
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם העובד</TableHead>
                    <TableHead className="text-right">תאריך יום הולדת</TableHead>
                    <TableHead className="text-right">גיל</TableHead>
                    <TableHead className="text-right">בעוד</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingBirthdayEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                      <TableCell className="text-right">
                        {emp.birthdayDate.toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell className="text-right">{emp.upcomingAge}</TableCell>
                      <TableCell className="text-right">
                        {emp.daysUntilBirthday === 0
                          ? 'היום! 🎉'
                          : emp.daysUntilBirthday === 1
                            ? 'מחר'
                            : `${emp.daysUntilBirthday} ימים`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Pazmuledet List Dialog */}
      <Dialog open={isPazmuledetDialogOpen} onOpenChange={setIsPazmuledetDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              פז"מולדת ב-7 הימים הקרובים
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {upcomingPazmuledetEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים עם פז"מולדת ב-7 הימים הקרובים
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם העובד</TableHead>
                    <TableHead className="text-right">תאריך פז"מולדת</TableHead>
                    <TableHead className="text-right">שנים בארגון</TableHead>
                    <TableHead className="text-right">בעוד</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingPazmuledetEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                      <TableCell className="text-right">
                        {emp.anniversaryDate.toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell className="text-right">{emp.yearsAtWork}</TableCell>
                      <TableCell className="text-right">
                        {emp.daysUntilAnniversary === 0
                          ? 'היום! 🎉'
                          : emp.daysUntilAnniversary === 1
                            ? 'מחר'
                            : `${emp.daysUntilAnniversary} ימים`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hired This Month Dialog */}
      <Dialog open={isHiredDialogOpen} onOpenChange={setIsHiredDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-accent" />
              עובדים שנקלטו החודש
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {hiredThisMonthEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                אין עובדים שנקלטו החודש
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם העובד</TableHead>
                    <TableHead className="text-right">תאריך קליטה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hiredThisMonthEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium text-right">{emp.full_name}</TableCell>
                      <TableCell className="text-right">
                        {emp.startDate.toLocaleDateString('he-IL')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
