
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
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            name: profile.name,
            role: profile.role
          });
        } else {
          // Fallback to user metadata if profile hasn't been created yet (trigger delay)
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'User',
            role: session.user.user_metadata?.role || 'lecturer'
          });
        }
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            name: profile.name,
            role: profile.role
          });
          navigate('/dashboard');
        } else {
          // Fallback to user metadata
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'User',
            role: session.user.user_metadata?.role || 'lecturer'
          });
          navigate('/dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setActiveSession(null);
        navigate('/');
      }
    });

    const checkActiveSession = async () => {
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('active', true)
        .order('startTime', { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        setActiveSession(sessions[0]);
      }
    };

    checkActiveSession();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setActiveSession(null);
    setShowLogoutModal(false);
    navigate('/');
  };

  const startSession = (session: AttendanceSession) => {
    setActiveSession(session);
    navigate(`/session/${session.id}`);
  };

  const endSession = (sessionId: string) => {
    setActiveSession(null);
    navigate('/dashboard');
  };

  // Guard routes
  useEffect(() => {
    if (loading) return;
    const isStudentPortal = location.pathname.startsWith('/portal/');
    if (!currentUser && !isStudentPortal && location.pathname !== '/' && location.pathname !== '/signup') {
      navigate('/');
    }
  }, [currentUser, location, navigate, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
