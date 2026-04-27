import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  subscription: 'active' | 'inactive';
  subInfo?: {
    plan: 'basic' | 'test' | 'premium';
    end_date: string;
    exams_left: number;
    has_video_access: boolean;
    has_ai_chat: boolean;
  } | null;
}

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  registerEmail: (email: string, password: string, name: string) => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional profile data from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to user profile and subscription
        const unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Fetch subscription
            const subDocRef = doc(db, 'users', firebaseUser.uid, 'subscription', 'current');
            const subSnap = await getDoc(subDocRef);
            const subInfo = subSnap.exists() ? subSnap.data() as User['subInfo'] : null;

            setUser({
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || 'Пользователь',
              email: firebaseUser.email || '',
              role: data.role || 'student',
              subscription: subInfo ? 'active' : 'inactive',
              subInfo: subInfo
            });
          } else {
            // First time login - create profile
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Пользователь',
              email: firebaseUser.email || '',
              role: 'student',
              subscription: 'inactive',
              subInfo: null
            };
            
            await setDoc(userDocRef, {
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
              subscription_status: 'inactive',
              created_at: new Date().toISOString()
            });
            
            setUser(newUser);
          }
          setIsLoading(false);
        });

        return () => unsubProfile();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const registerEmail = async (email: string, password: string, name: string) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(firebaseUser, { displayName: name });
    // Firestore profile creation is handled by the useEffect observer
  };

  const loginEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, registerEmail, loginEmail, logout, isLoading }}>
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
