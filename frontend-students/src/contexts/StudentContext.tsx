import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface StudentSession {
  email: string;
  quizId: string;
  joined: boolean;
}

interface StudentContextType {
  session: StudentSession | null;
  setSession: (session: StudentSession | null) => void;
  clearSession: () => void;
}

const StudentContext = createContext<StudentContextType | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<StudentSession | null>(() => {
    // Restore from sessionStorage
    const saved = sessionStorage.getItem('student_session');
    return saved ? JSON.parse(saved) : null;
  });

  const setSession = useCallback((newSession: StudentSession | null) => {
    setSessionState(newSession);
    if (newSession) {
      sessionStorage.setItem('student_session', JSON.stringify(newSession));
    } else {
      sessionStorage.removeItem('student_session');
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    sessionStorage.removeItem('student_session');
  }, []);

  return (
    <StudentContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within StudentProvider');
  }
  return context;
}
