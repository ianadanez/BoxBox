import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Avatar } from '../types';
import { db } from '../services/db';

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
    // Check for a logged-in user in session storage on startup
    const checkLoggedInUser = async () => {
        const userId = sessionStorage.getItem('userId');
        if (userId) {
            try {
                const userProfile = await db.getUserById(userId);
                if (userProfile) {
                    setUser(userProfile);
                } else {
                    sessionStorage.removeItem('userId');
                }
            } catch (error) {
                console.error("Error fetching user profile from local DB:", error);
            }
        }
        setLoading(false);
    };
    checkLoggedInUser();
  }, []);

  const login = async (email: string, password = "password"): Promise<void> => {
    setLoading(true);
    try {
        const userProfile = await db.getUserByEmail(email);
        
        // In this local-only version, we accept a hardcoded password for simplicity.
        if (userProfile && userProfile.password === password) {
            setUser(userProfile);
            sessionStorage.setItem('userId', userProfile.id);
        } else {
            // Throw an error with a message that mimics Firebase for component compatibility
            throw new Error('auth/invalid-credential');
        }
    } catch(error) {
        console.error("Login failed:", error);
        throw error;
    } finally {
        setLoading(false);
    }
  };

  const register = async (details: RegisterDetails): Promise<void> => {
    setLoading(true);
    try {
        const existingUser = await db.getUserByEmail(details.email);
        if (existingUser) {
            throw new Error('auth/email-already-in-use');
        }

        const newUser: User = {
            id: crypto.randomUUID(),
            name: details.name,
            email: details.email,
            password: details.password, // Storing plaintext password, for demo only
            role: 'user',
            avatar: details.avatar,
            favoriteTeamId: details.favoriteTeamId,
            createdAt: new Date().toISOString(),
        };

        await db.saveUser(newUser);
        setUser(newUser);
        sessionStorage.setItem('userId', newUser.id);

    } catch(error) {
        console.error("Registration failed:", error);
        throw error;
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    sessionStorage.removeItem('userId');
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