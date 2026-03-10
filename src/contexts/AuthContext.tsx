import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../integrations/firebase/client';
import { toast } from 'sonner';

type AppRole = 'user' | 'manager' | 'super_admin';

interface AuthContextType {
  user: User | null;
  session: any | null; // Placeholder to avoid breaking other components using session
  role: AppRole | null;
  allowedProjectIds: string[] | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isManager: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [allowedProjectIds, setAllowedProjectIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserPermissions = async (userId: string) => {
    try {
      // Fetch role
      const roleRef = doc(db, 'user_roles', userId);
      const roleSnap = await getDoc(roleRef);

      if (roleSnap.exists()) {
        const data = roleSnap.data();
        if (data.is_deleted === true) {
          await firebaseSignOut(auth);
          setUser(null);
          setRole(null);
          setAllowedProjectIds(null);
          toast.error('חשבונך בוטל. פנה למנהל המערכת.');
          return;
        }
        setRole(data.role as AppRole);
      } else {
        // If the user logs in via Google the first time, they won't have a role,
        // create a default role for them and their profile.
        await setDoc(roleRef, { role: 'user' }, { merge: true });

        const profileRef = doc(db, 'profiles', userId);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await setDoc(profileRef, {
            user_id: userId,
            email: auth.currentUser?.email || '',
            full_name: auth.currentUser?.displayName || '',
            created_at: new Date().toISOString()
          }, { merge: true });
        }
        setRole('user');
      }

      // Fetch allowed projects
      const q = query(collection(db, 'user_projects'), where('user_id', '==', userId));
      const projectsSnap = await getDocs(q);
      const projectIds = projectsSnap.docs.map(doc => doc.data().project_id);
      setAllowedProjectIds(projectIds);

    } catch (e) {
      console.error("Error fetching permissions", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await fetchUserPermissions(currentUser.uid);
      } else {
        setRole(null);
        setAllowedProjectIds(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });

      // Save name and default role in firestore
      await setDoc(doc(db, 'user_roles', userCredential.user.uid), {
        role: 'user',
        full_name: fullName,
        email: email
      });

      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setRole(null);
    setAllowedProjectIds(null);
  };

  const isManager = role === 'manager' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  return (
    <AuthContext.Provider value={{
      user,
      session: user ? { user } : null,
      role,
      allowedProjectIds,
      loading,
      signIn,
      signUp,
      signOut,
      isManager,
      isSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

