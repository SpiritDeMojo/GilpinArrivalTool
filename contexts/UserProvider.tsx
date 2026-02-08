import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Department } from '../types';

interface UserContextType {
    userName: string;
    department: Department | null;
    setUserName: (name: string) => void;
    setDepartment: (dept: Department) => void;
    logout: () => void;
}

const UserContext = createContext<UserContextType>({
    userName: '',
    department: null,
    setUserName: () => { },
    setDepartment: () => { },
    logout: () => { }
});

export function useUser() {
    return useContext(UserContext);
}

const NAME_KEY = 'gilpin_user_name';
const DEPT_KEY = 'gilpin_user_dept';

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userName, setUserNameState] = useState<string>(() => {
        return localStorage.getItem(NAME_KEY) || '';
    });

    const [department, setDepartmentState] = useState<Department | null>(() => {
        const stored = localStorage.getItem(DEPT_KEY);
        if (stored === 'HK' || stored === 'MAIN' || stored === 'REC') return stored;
        return null;
    });

    useEffect(() => {
        if (userName) {
            localStorage.setItem(NAME_KEY, userName);
        }
    }, [userName]);

    useEffect(() => {
        if (department) {
            localStorage.setItem(DEPT_KEY, department);
        }
    }, [department]);

    const setUserName = useCallback((name: string) => {
        const trimmed = name.trim();
        if (trimmed) {
            setUserNameState(trimmed);
            localStorage.setItem(NAME_KEY, trimmed);
        }
    }, []);

    const setDepartment = useCallback((dept: Department) => {
        setDepartmentState(dept);
        localStorage.setItem(DEPT_KEY, dept);
    }, []);

    const logout = useCallback(() => {
        setUserNameState('');
        setDepartmentState(null);
        localStorage.removeItem(NAME_KEY);
        localStorage.removeItem(DEPT_KEY);
    }, []);

    return (
        <UserContext.Provider value={{ userName, department, setUserName, setDepartment, logout }}>
            {children}
        </UserContext.Provider>
    );
}
