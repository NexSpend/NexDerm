import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  profile_image_url?: string;
}

interface UserContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Load user from AsyncStorage on app start
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userProfile');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    loadUser();
  }, []);

  const handleSetUser = async (userData: UserProfile | null) => {
    setUser(userData);
    if (userData) {
      try {
        await AsyncStorage.setItem('userProfile', JSON.stringify(userData));
      } catch (error) {
        console.error('Error saving user profile:', error);
      }
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      await AsyncStorage.removeItem('userProfile');
    } catch (error) {
      console.error('Error removing user profile:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser: handleSetUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
