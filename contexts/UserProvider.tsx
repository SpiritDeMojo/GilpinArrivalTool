import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface UserContextType {
    userName: string;
    setUserName: (name: string) => void;
    logout: () => void;
}

const UserContext = createContext<UserContextType>({
    userName: '',
    setUserName: () => { },
    logout: () => { }
});

export function useUser() {
    return useContext(UserContext);
}

const STORAGE_KEY = 'gilpin_user_name';

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userName, setUserNameState] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY) || '';
    });

    useEffect(() => {
        if (userName) {
            localStorage.setItem(STORAGE_KEY, userName);
        }
    }, [userName]);

    const setUserName = useCallback((name: string) => {
        const trimmed = name.trim();
        if (trimmed) {
            setUserNameState(trimmed);
            localStorage.setItem(STORAGE_KEY, trimmed);
        }
    }, []);

    const logout = useCallback(() => {
        setUserNameState('');
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return (
        <UserContext.Provider value={{ userName, setUserName, logout }}>
            {children}
        </UserContext.Provider>
    );
}
