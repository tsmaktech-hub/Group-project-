
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthView } from './views/AuthView';
import { LecturerDashboard } from './views/LecturerDashboard';
import { SessionView } from './views/SessionView';
import { StudentPortal } from './views/StudentPortal';
import { HistoryView } from './views/HistoryView';
import { AuditView } from './views/AuditView';
import { User, AttendanceSession } from './types';
import { LogoutConfirmation } from './components/LogoutConfirmation';
import { getActiveSession, endSession as supabaseEndSession, createSession as supabaseCreateSession } from './services/supabase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('attendx_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      
      if (user.role === 'lecturer') {
        checkActiveSession(user.id);
      }
    }
  }, []);

  const checkActiveSession = async (lecturerId: string) => {
    try {
      const active = await getActiveSession(lecturerId);
      if (active) setActiveSession(active);
    } catch (error) {
      console.error("Error checking active session:", error);
    }
  };

  const handleLogin = (user: User) => {
    localStorage.setItem('attendx_user', JSON.stringify(user));
    setCurrentUser(user);
    if (user.role === 'lecturer') {
      checkActiveSession(user.id);
    }
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('attendx_user');
    setCurrentUser(null);
    setActiveSession(null);
    setShowLogoutModal(false);
    navigate('/');
  };

  const startSession = async (session: AttendanceSession) => {
    try {
      const newSession = await supabaseCreateSession(session);
      setActiveSession(newSession);
      navigate(`/session/${newSession.id}`);
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to start session in cloud storage. Please check your connection.");
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      await supabaseEndSession(sessionId);
      setActiveSession(null);
      navigate('/dashboard');
    } catch (error) {
      console.error("Error ending session:", error);
    }
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
