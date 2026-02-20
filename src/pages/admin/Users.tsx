import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCog, Shield, Pencil, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

type AppRole = 'user' | 'manager' | 'super_admin';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  created_at?: string;
}

interface Project {
  id: string;
  name: string;
}

interface UserProject {
  project_id: string;
}

const createUserSchema = z.object({
  fullName: z.string().min(2, 'שם מלא חייב להכיל לפחות 2 תווים'),
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
});

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Create user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && !isSuperAdmin) {
      navigate('/');
      toast.error('אין לך הרשאה לגשת לדף זה');
    }
  }, [user, authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchData();
    }
  }, [user, isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const [rolesSnap, projectsSnap, profilesSnap] = await Promise.all([
        getDocs(collection(db, 'user_roles')),
        getDocs(collection(db, 'projects')),
        getDocs(collection(db, 'profiles')) // Note: Assuming profiles is a valid firestore collection
      ]);

      const roles = rolesSnap.docs.map(doc => ({ user_id: doc.id, ...doc.data() }));
      const projectsData = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];

      const profiles = profilesSnap.docs.map(doc => ({ user_id: doc.id, ...doc.data() }));

      const usersWithRoles = profiles.map((profile: any) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          user_id: profile.user_id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          role: ((userRole as any)?.role as AppRole) || 'user',
          created_at: profile.created_at || new Date().toISOString(),
        };
      });
      setUsers(usersWithRoles);
      setProjects(projectsData);
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בטעינת הנתונים');
    }

    setLoading(false);
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">מנהל על</Badge>;
      case 'manager':
        return <Badge className="bg-accent/10 text-accent border-accent/30">מנהל</Badge>;
      default:
        return <Badge variant="secondary">משתמש</Badge>;
    }
  };

  const openEditDialog = (userItem: UserWithRole) => {
    setSelectedUser(userItem);
    setSelectedRole(userItem.role);
    setIsEditDialogOpen(true);
  };

  const openProjectsDialog = async (userItem: UserWithRole) => {
    setSelectedUser(userItem);

    try {
      const snap = await getDocs(collection(db, 'user_projects'));
      const userProjects = snap.docs
        .map(doc => doc.data() as UserProject)
        .filter(up => (up as any).user_id === userItem.user_id);

      setSelectedProjects(userProjects.map((up) => up.project_id) || []);
    } catch (e) {
      console.error(e);
    }
    setIsProjectsDialogOpen(true);
  };

  const openDeleteDialog = (userItem: UserWithRole) => {
    setSelectedUser(userItem);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    setFormLoading(true);

    try {
      const roleRef = doc(db, 'user_roles', selectedUser.user_id);
      await setDoc(roleRef, { role: selectedRole }, { merge: true });

      toast.success('ההרשאה עודכנה בהצלחה');
      setIsEditDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error('שגיאה בעדכון ההרשאה');
    }
    setFormLoading(false);
  };

  const handleUpdateProjects = async () => {
    if (!selectedUser) return;

    setFormLoading(true);

    try {
      // Very naive implementation for User Projects mapping in NoSQL:
      // Real implementation would delete existing entries and rewrite or use a subcollection.
      // This might not scale nicely without a batch commit.
      const snap = await getDocs(collection(db, 'user_projects'));
      for (const d of snap.docs) {
        if (d.data().user_id === selectedUser.user_id) {
          await deleteDoc(doc(db, 'user_projects', d.id));
        }
      }

      if (selectedProjects.length > 0) {
        for (const projectId of selectedProjects) {
          await addDoc(collection(db, 'user_projects'), {
            user_id: selectedUser.user_id,
            project_id: projectId
          });
        }
      }

      toast.success('התכניות עודכנו בהצלחה');
      setIsProjectsDialogOpen(false);
    } catch (e) {
      toast.error('שגיאה בעדכון התכניות');
    }
    setFormLoading(false);
  };

  const handleCreateUser = async () => {
    setFormErrors({});

    try {
      createUserSchema.parse({
        fullName: newUserName,
        email: newUserEmail,
        password: newUserPassword
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setFormErrors(fieldErrors);
        return;
      }
    }

    setFormLoading(true);

    // TODO: Calling Edge Functions or creating auth via Firebase Admin SDK
    // In client side Firebase, you'd probably just want to write this using a Cloud Function
    // Since we don't have Admin SDK set up here, this operation will just mock or fail.
    // For now, inform the user they cannot create users here directly without admin sdk
    toast.error('יצירת משתמשים חדשים באמצעות Firebase Admin מנותקת זמנית.');
    setFormLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setFormLoading(true);
    // TODO: Again Admin SDK is needed.
    toast.error('מחיקת משתמשים מחייבת Firebase Admin פונקציות וזה מנותק כרגע.');
    setFormLoading(false);
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ניהול משתמשים</h1>
            <p className="text-muted-foreground mt-1">יצירה, עריכה ומחיקה של משתמשים</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            משתמש חדש
          </Button>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              רשימת משתמשים
            </CardTitle>
            <CardDescription>סה״כ {users.length} משתמשים במערכת</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>הרשאה</TableHead>
                  <TableHead>תאריך הצטרפות</TableHead>
                  <TableHead className="w-48">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      לא נמצאו משתמשים
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((userItem) => (
                    <TableRow key={userItem.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium">
                        {userItem.full_name || '-'}
                      </TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {userItem.email}
                      </TableCell>
                      <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {userItem.created_at ? new Date(userItem.created_at).toLocaleDateString('he-IL') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(userItem)}
                            title="שנה הרשאה"
                          >
                            <Shield className="w-4 h-4 ml-1" />
                            הרשאה
                          </Button>
                          {(userItem.role === 'user' || userItem.role === 'manager') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openProjectsDialog(userItem)}
                              title="שייך לתכניות"
                            >
                              <Pencil className="w-4 h-4 ml-1" />
                              תכניות
                            </Button>
                          )}
                          {userItem.user_id !== user?.uid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(userItem)}
                              className="text-destructive hover:text-destructive"
                              title="מחק משתמש"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>יצירת משתמש חדש</DialogTitle>
              <DialogDescription>
                הזן את פרטי המשתמש החדש
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-name">שם מלא</Label>
                <Input
                  id="new-user-name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="ישראל ישראלי"
                />
                {formErrors.fullName && (
                  <p className="text-sm text-destructive">{formErrors.fullName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-email">אימייל</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="example@company.com"
                  dir="ltr"
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-password">סיסמה</Label>
                <Input
                  id="new-user-password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                />
                {formErrors.password && (
                  <p className="text-sm text-destructive">{formErrors.password}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleCreateUser} disabled={formLoading}>
                {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                צור משתמש
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>האם למחוק את המשתמש?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את המשתמש {selectedUser?.full_name || selectedUser?.email} לצמיתות.
                לא ניתן לבטל פעולה זו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={formLoading}
              >
                {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Role Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>שינוי הרשאה</DialogTitle>
              <DialogDescription>
                שנה את רמת ההרשאה עבור {selectedUser?.full_name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="role">סוג הרשאה</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">משתמש רגיל</SelectItem>
                  <SelectItem value="manager">מנהל</SelectItem>
                  <SelectItem value="super_admin">מנהל על</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-4 p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium mb-2">הסבר רמות הרשאה:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>משתמש רגיל:</strong> גישה לתכניות שהוקצו לו בלבד</li>
                  <li><strong>מנהל:</strong> גישה לתכניות שהוקצו לו + צפייה בשדות רגישים (עלויות, סיכונים)</li>
                  <li><strong>מנהל על:</strong> גישה מלאה לכל התכניות + ניהול משתמשים והגדרות</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateRole} disabled={formLoading}>
                {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                עדכן
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Projects Assignment Dialog */}
        <Dialog open={isProjectsDialogOpen} onOpenChange={setIsProjectsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>שיוך לתכניות</DialogTitle>
              <DialogDescription>
                בחר את התכניות שהמשתמש {selectedUser?.full_name || selectedUser?.email} יוכל לגשת אליהן
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3 max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => toggleProject(project.id)}
                >
                  <Checkbox
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={() => toggleProject(project.id)}
                  />
                  <span>{project.name}</span>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  לא נמצאו תכניות
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateProjects} disabled={formLoading}>
                {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
