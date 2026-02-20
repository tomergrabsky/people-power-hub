import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, Building2, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { auth } from '@/integrations/firebase/client';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
const loginSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('אימייל או סיסמה שגויים');
      } else {
        toast.error('שגיאה בהתחברות: ' + error.message);
      }
    } else {
      toast.success('התחברת בהצלחה!');
      navigate('/');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error: any) {
      toast.error('שגיאה בהתחברות עם Google: ' + error.message);
    } finally {
      setGoogleLoading(false);
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
    <div className="min-h-screen flex">
      {/* Right side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-2xl bg-accent/20 flex items-center justify-center">
              <Users className="w-12 h-12 text-accent" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-primary-foreground">
              מערכת ניהול עובדים
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-md">
              נהלו את הצוות שלכם בקלות ויעילות עם כלים חכמים לניהול, מעקב ודיווח
            </p>
          </div>
          <div className="flex justify-center gap-8 pt-8">
            <div className="text-center">
              <Building2 className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-primary-foreground/80 text-sm">ניהול תכניות</p>
            </div>
            <div className="text-center">
              <Shield className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-primary-foreground/80 text-sm">אבטחה מתקדמת</p>
            </div>
            <div className="text-center">
              <Users className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-primary-foreground/80 text-sm">ניהול הרשאות</p>
            </div>
          </div>
        </div>
      </div>

      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md glass-card animate-fade-in">
          <CardHeader className="text-center">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">ברוכים הבאים</CardTitle>
            <CardDescription>התחברו למערכת ניהול העובדים</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">אימייל</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="example@company.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="text-right"
                  dir="ltr"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">סיסמה</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  dir="ltr"
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                התחבר
              </Button>
            </form>

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                או
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              התחבר עם Google
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              לקבלת גישה למערכת, פנו למנהל המערכת
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
