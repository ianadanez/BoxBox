import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Avatar } from '../types';
import { db } from '../services/db';
import { getActiveSeason } from '../services/seasonService';
import { auth } from '../firebaseConfig';
import { appendFavoriteTeamAssignment } from '../services/favoriteTeamHistory';
// FIX: Removed modular auth imports to use compat API with the compat auth instance.

interface RegisterDetails {
  username: string;
  email: string;
  password: string;
  countryCode: string;
  favoriteTeamId: string;
  avatar: Avatar;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (details: RegisterDetails) => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  // FIX: Added applyActionCode to handle email verification.
  applyActionCode: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FIX: Use compat API `onAuthStateChanged` method directly on the auth instance.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
            // Only proceed if the user's email is verified
            if (firebaseUser.emailVerified) {
                try {
                    const userProfile = await db.getUserById(firebaseUser.uid);
                    if (userProfile) {
                        setUser(userProfile);
                    } else {
                        console.warn("User exists in Auth but not in Firestore. Logging out.");
                        await auth.signOut();
                        setUser(null);
                    }
                } catch (error) {
                    console.error("Error fetching user profile from Firestore:", error);
                    setUser(null);
                }
            } else {
                 // If email is not verified, ensure user is logged out of the app state.
                 // This handles cases where a user might still have a session but hasn't verified.
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

  const login = async (email: string, password: string): Promise<void> => {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    if (!userCredential.user?.emailVerified) {
        // Log the user out immediately if their email is not verified
        await auth.signOut();
        const error = new Error("El correo electrónico no ha sido verificado.");
        error.name = 'auth/email-not-verified';
        throw error;
    }
    // onAuthStateChanged will handle setting the user state
  };
  
  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    await auth.sendPasswordResetEmail(email);
  };

  const applyActionCode = async (code: string): Promise<void> => {
    await auth.applyActionCode(code);
  };

  const register = async (details: RegisterDetails): Promise<void> => {
    // FIX: Use compat API `createUserWithEmailAndPassword` method directly on the auth instance.
    const userCredential = await auth.createUserWithEmailAndPassword(details.email, details.password);
    const firebaseUser = userCredential.user;

    if (!firebaseUser) {
        throw new Error("User creation failed, firebase user object is null.");
    }

    const trimmedUsername = details.username.trim();
    let reservedUsername = false;
    try {
        await db.reserveUsername(trimmedUsername, firebaseUser.uid);
        reservedUsername = true;
    } catch (err) {
        await firebaseUser.delete().catch(() => auth.signOut());
        throw err;
    }

    // Send verification email
    await firebaseUser.sendEmailVerification();

    const activeSeasonId = await getActiveSeason();

    const newUser: User = {
        id: firebaseUser.uid, // Use Firebase UID as the user ID
        username: trimmedUsername,
        email: details.email,
        // Do not store password
        role: 'user',
        avatar: details.avatar,
        countryCode: details.countryCode.trim().toUpperCase(),
        favoriteTeamId: details.favoriteTeamId,
        favoriteTeamSeason: activeSeasonId || undefined,
        createdAt: new Date().toISOString(),
        favoriteTeamHistory: appendFavoriteTeamAssignment(
          {
            favoriteTeamId: undefined,
            favoriteTeamHistory: [],
            createdAt: new Date().toISOString(),
          },
          details.favoriteTeamId
        ),
    };

    try {
        await db.saveUser(newUser);
    } catch (err) {
        if (reservedUsername) {
            await db.releaseUsername(trimmedUsername, firebaseUser.uid).catch(() => {});
        }
        throw err;
    }
    // Log the user out so they have to verify their email before logging in
    await auth.signOut();
  };

  const logout = async () => {
    // FIX: Use compat API `signOut` method directly on the auth instance.
    await auth.signOut();
    setUser(null);
  };
  
  const updateUser = async (updatedUser: User) => {
      await db.saveUser(updatedUser);
      setUser(updatedUser); // Optimistically update local state
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser, isAuthenticated: !!user, sendPasswordResetEmail, applyActionCode }}>
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
