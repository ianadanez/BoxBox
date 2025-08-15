

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Avatar } from '../types';
import { db } from '../services/db';

interface RegisterDetails {
  name: string;
  email: string;
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
    const checkUserSession = async () => {
        try {
            const storedUserId = localStorage.getItem('boxbox_user_id');
            if (storedUserId) {
                const userProfile = await db.getUserById(storedUserId);
                if (userProfile) {
                    setUser(userProfile);
                }
            }
        } catch (error) {
            console.error("Failed to restore session:", error);
            localStorage.removeItem('boxbox_user_id');
        } finally {
            setLoading(false);
        }
    }
    checkUserSession();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    setLoading(true);
    try {
        const userProfile = await db.getUserByEmail(email);
        if (userProfile) {
            setUser(userProfile);
            localStorage.setItem('boxbox_user_id', userProfile.id);
            return true;
        }
        return false;
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
        const existingUser = await db.getUserByEmail(details.email);
        if (existingUser) {
            console.error("Registration failed: Email already in use.");
            return false;
        }

        const newUser: User = {
            id: `user_${Date.now()}`,
            name: details.name,
            email: details.email,
            role: 'user',
            avatar: details.avatar,
            favoriteTeamId: details.favoriteTeamId,
            createdAt: new Date().toISOString(),
        };

        await db.saveUser(newUser);
        setUser(newUser);
        localStorage.setItem('boxbox_user_id', newUser.id);
        return true;

    } catch(error) {
        console.error("Registration failed:", error);
        return false;
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('boxbox_user_id');
    return Promise.resolve();
  };
  
  const updateUser = async (updatedUser: User) => {
      await db.saveUser(updatedUser);
      setUser(updatedUser);
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