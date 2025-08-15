

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Avatar } from '../types';
import { db } from '../services/db';
import { auth } from '../firebaseConfig';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    User as FirebaseUser
} from '@firebase/auth';


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
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (details: RegisterDetails) => Promise<boolean>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            // User is signed in, see docs for a list of available properties
            // https://firebase.google.com/docs/reference/js/firebase.User
            try {
                 const userProfile = await db.getUserById(firebaseUser.uid);
                 if (userProfile) {
                     setUser(userProfile);
                 } else {
                     // This case might happen if the user exists in Auth but not in Firestore DB.
                     // You might want to create a profile here or log them out.
                     console.warn("User exists in Firebase Auth but not in Firestore. Logging out.");
                     await signOut(auth);
                     setUser(null);
                 }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                setUser(null);
            }
        } else {
            // User is signed out
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const login = async (email: string, password = "password"): Promise<boolean> => {
    // Password is required for Firebase auth, but we can use a dummy one for this project's scope.
    setLoading(true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
    } catch(error) {
        console.error("Login failed:", error);
        return false;
    } finally {
        setLoading(false);
    }
  };

  const register = async (details: RegisterDetails): Promise<boolean> => {
    setLoading(true);
    try {
        // Step 1: Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, details.email, details.password);
        const firebaseUser = userCredential.user;

        // Step 2: Create user profile in Firestore
        const newUser: User = {
            id: firebaseUser.uid, // Use the UID from Auth as the document ID
            name: details.name,
            email: details.email,
            role: 'user',
            avatar: details.avatar,
            favoriteTeamId: details.favoriteTeamId,
            createdAt: new Date().toISOString(),
        };

        await db.saveUser(newUser);
        
        // The onAuthStateChanged listener will automatically set the user state.
        return true;

    } catch(error) {
        console.error("Registration failed:", error);
        return false;
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    // The onAuthStateChanged listener will handle setting user to null.
  };
  
  const updateUser = async (updatedUser: User) => {
      await db.saveUser(updatedUser);
      setUser(updatedUser); // Optimistically update local state
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser, isAuthenticated: !!user }}>
      {children}
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