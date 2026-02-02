
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthView } from './views/AuthView';
import { LecturerDashboard } from './views/LecturerDashboard';
import { SessionView } from './views/SessionView';
import { StudentPortal } from './views/StudentPortal';
import { HistoryView } from './views/HistoryView';
import { AuditView } from './views/AuditView';
import { User, AttendanceSession, AttendanceRecord } from './types';
import { LogoutConfirmation } from './components/LogoutConfirmation';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('attendx_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    const checkActiveSession = () => {
      const sessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
      const active = sessions.find(s => s.active);
      if (active) setActiveSession(active);
    };

    checkActiveSession();

    // Real-time feel: Listen for storage changes (e.g., student submission from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'attendx_records' || e.key === 'attendx_sessions') {
        checkActiveSession();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('attendx_user', JSON.stringify(user));
    setCurrentUser(user);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('attendx_user');
    setCurrentUser(null);
    setActiveSession(null);
    setShowLogoutModal(false);
    navigate('/');
  };

  const startSession = (session: AttendanceSession) => {
    const sessions = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
    const updatedSessions = [...sessions.map((s: any) => ({ ...s, active: false })), session];
    localStorage.setItem('attendx_sessions', JSON.stringify(updatedSessions));
    setActiveSession(session);
    navigate(`/session/${session.id}`);
  };

  const endSession = (sessionId: string) => {
    const sessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
    const updatedSessions = sessions.map(s => 
      s.id === sessionId ? { ...s, active: false, endTime: Date.now() } : s
    );
    localStorage.setItem('attendx_sessions', JSON.stringify(updatedSessions));
    setActiveSession(null);
    navigate('/dashboard');
  };

  // Guard routes
  useEffect(() => {
    const isStudentPortal = location.pathname.startsWith('/portal/');
    if (!currentUser && !isStudentPortal && location.pathname !== '/' && location.pathname !== '/signup') {
      navigate('/');
    }
  }, [currentUser, location, navigate]);

  return (
    <>
      <Routes>
        <Route path="/" element={<AuthView mode="login" onAuth={handleLogin} />} />
        <Route path="/signup" element={<AuthView mode="signup" onAuth={handleLogin} />} />
        <Route 
          path="/dashboard" 
          element={
            <LecturerDashboard 
              user={currentUser} 
              onLogout={() => setShowLogoutModal(true)} 
              onStartSession={startSession} 
            />
          } 
        />
        <Route 
          path="/history" 
          element={
            <HistoryView 
              onLogout={() => setShowLogoutModal(true)} 
            />
          } 
        />
        <Route 
          path="/audit/:courseId" 
          element={
            <AuditView 
              onLogout={() => setShowLogoutModal(true)} 
            />
          } 
        />
        <Route 
          path="/session/:sessionId" 
          element={
            <SessionView 
              user={currentUser} 
              activeSession={activeSession}
              onLogout={() => setShowLogoutModal(true)} 
              onEndSession={endSession}
            />
          } 
        />
        <Route path="/portal/:sessionId" element={<StudentPortal />} />
      </Routes>

      <LogoutConfirmation 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={handleLogout} 
      />
    </>
  );
};

export default App;
