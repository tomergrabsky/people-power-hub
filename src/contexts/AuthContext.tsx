import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../integrations/firebase/client';

type AppRole = 'user' | 'manager' | 'super_admin';

interface AuthContextType {
  user: User | null;
  session: any | null; // Placeholder to avoid breaking other components using session
  role: AppRole | null;
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
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const roleRef = doc(db, 'user_roles', userId);
      const docSnap = await getDoc(roleRef);

      if (docSnap.exists()) {
        setRole(docSnap.data().role as AppRole);
      } else {
        setRole('user'); // Default role
      }
    } catch (e) {
      console.error("Error fetching role", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await fetchUserRole(currentUser.uid);
      } else {
        setRole(null);
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
  };

  const isManager = role === 'manager' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  return (
    <AuthContext.Provider value={{
      user,
      session: user ? { user } : null,
      role,
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
