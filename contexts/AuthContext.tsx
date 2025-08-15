
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Avatar } from '../types';
import { db } from '../services/db';
import { auth } from '../firebaseConfig';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'firebase/auth';

interface RegisterDetails {
  name: string;
  email: string;
  password: string;
  favoriteTeamId: string;
  avatar: Avatar;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (details: RegisterDetails) => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            try {
                // User is signed in, see docs for a list of available properties
                // https://firebase.google.com/docs/reference/js/firebase.User
                const userProfile = await db.getUserById(firebaseUser.uid);
                if (userProfile) {
                    setUser(userProfile);
                } else {
                    // This case might happen if user exists in Auth but not in Firestore.
                    // You might want to log them out or create a profile.
                    console.warn("User exists in Auth but not in Firestore. Logging out.");
                    await signOut(auth);
                    setUser(null);
                }
            } catch (error) {
                console.error("Error fetching user profile from Firestore:", error);
                setUser(null);
            }
        } else {
            // User is signed out
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password = "password"): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle setting the user state
  };

  const register = async (details: RegisterDetails): Promise<void> => {
    const userCredential = await createUserWithEmailAndPassword(auth, details.email, details.password);
    const firebaseUser = userCredential.user;

    const newUser: User = {
        id: firebaseUser.uid, // Use Firebase UID as the user ID
        name: details.name,
        email: details.email,
        // Do not store password
        role: 'user',
        avatar: details.avatar,
        favoriteTeamId: details.favoriteTeamId,
        createdAt: new Date().toISOString(),
    };

    await db.saveUser(newUser);
    // onAuthStateChanged will handle setting the user state
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };
  
  const updateUser = async (updatedUser: User) => {
      await db.saveUser(updatedUser);
      setUser(updatedUser); // Optimistically update local state
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
