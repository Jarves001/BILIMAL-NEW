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
  subject?: string;
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

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        // Fetch additional profile data from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to user profile and subscription
        unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          try {
            console.log('Profile snapshot received:', docSnap.exists() ? 'Exists' : 'Missing');
            if (docSnap.exists()) {
              const data = docSnap.data();
              
              // Fetch subscription
              const subDocRef = doc(db, 'users', firebaseUser.uid, 'subscription', 'current');
              const subSnap = await getDoc(subDocRef);
              const subInfo = subSnap.exists() ? subSnap.data() as User['subInfo'] : null;

              const userEmail = firebaseUser.email?.toLowerCase() || '';
              const isAdminUser = userEmail === 'jarves276@gmail.com';
              console.log('Auth check:', { email: userEmail, isAdminUser, roleFromDb: data.role });

              setUser({
                id: firebaseUser.uid,
                name: data.name || firebaseUser.displayName || 'Пользователь',
                email: userEmail,
                role: isAdminUser ? 'admin' : (data.role || 'student'),
                subject: data.subject,
                subscription: subInfo ? 'active' : 'inactive',
                subInfo: subInfo
              });
            } else {
              // First time login - create profile
              const userEmail = firebaseUser.email?.toLowerCase() || '';
              const isAdminUser = userEmail === 'jarves276@gmail.com';
              console.log('Creating new profile for:', userEmail, 'is Admin:', isAdminUser);
              
              const newUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Пользователь',
                email: userEmail,
                role: isAdminUser ? 'admin' : 'student',
                subscription: 'inactive',
                subInfo: null
              };
              
              const path = `users/${firebaseUser.uid}`;
              try {
                await setDoc(userDocRef, {
                  name: newUser.name,
                  email: newUser.email,
                  role: newUser.role,
                  subscription_status: 'inactive',
                  created_at: new Date().toISOString()
                });
                setUser(newUser);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, path);
              }
            }
          } catch (err) {
            console.error('Error processing profile update:', err);
          }
          setIsLoading(false);
        }, (error) => {
          // If we are still signed in, report the error. 
          // If we are intentionaly signing out, ignore the permission error that might happen during transition.
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          }
          setIsLoading(false);
        });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
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
