import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Department, UserLocation } from '../types';

interface UserContextType {
    userName: string;
    department: Department | null;
    location: UserLocation | null;
    setUserName: (name: string) => void;
    setDepartment: (dept: Department) => void;
    setLocation: (loc: UserLocation) => void;
    logout: () => void;
}

const UserContext = createContext<UserContextType>({
    userName: '',
    department: null,
    location: null,
    setUserName: () => { },
    setDepartment: () => { },
    setLocation: () => { },
    logout: () => { }
});

export function useUser() {
    return useContext(UserContext);
}

const NAME_KEY = 'gilpin_user_name';
const DEPT_KEY = 'gilpin_user_dept';
const LOC_KEY = 'gilpin_user_location';

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userName, setUserNameState] = useState<string>(() => {
        return localStorage.getItem(NAME_KEY) || '';
    });

    const [department, setDepartmentState] = useState<Department | null>(() => {
        const stored = localStorage.getItem(DEPT_KEY);
        if (stored === 'HK' || stored === 'MAIN' || stored === 'REC') return stored;
        return null;
    });

    const [location, setLocationState] = useState<UserLocation | null>(() => {
        const stored = localStorage.getItem(LOC_KEY);
        if (stored === 'main' || stored === 'lake') return stored;
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

    useEffect(() => {
        if (location) {
            localStorage.setItem(LOC_KEY, location);
        }
    }, [location]);

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

    const setLocation = useCallback((loc: UserLocation) => {
        setLocationState(loc);
        localStorage.setItem(LOC_KEY, loc);
    }, []);

    const logout = useCallback(() => {
        setUserNameState('');
        setDepartmentState(null);
        setLocationState(null);
        localStorage.removeItem(NAME_KEY);
        localStorage.removeItem(DEPT_KEY);
        localStorage.removeItem(LOC_KEY);
    }, []);

    return (
        <UserContext.Provider value={{ userName, department, location, setUserName, setDepartment, setLocation, logout }}>
            {children}
        </UserContext.Provider>
    );
}
