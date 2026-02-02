
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { User, AttendanceSession, AttendanceRecord, StudentStats } from '../types';
import { COURSES, DEPARTMENTS } from '../constants';
import { analyzeAttendance } from '../services/geminiService';

interface SessionViewProps {
  user: User | null;
  activeSession: AttendanceSession | null;
  onLogout: () => void;
  onEndSession: (sessionId: string) => void;
}

export const SessionView: React.FC<SessionViewProps> = ({ user, activeSession, onLogout, onEndSession }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  // Load records for this session and listen for real-time updates
  useEffect(() => {
    const fetchRecords = () => {
      const allRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendx_records') || '[]');
      const filtered = allRecords.filter(r => r.sessionId === sessionId);
      setRecords(filtered.sort((a, b) => b.timestamp - a.timestamp));
    };

    fetchRecords();

    // Listen for storage changes from other tabs/users
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'attendx_records') {
        fetchRecords();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Polling as a fallback for high-reliability real-time feel
    const interval = setInterval(fetchRecords, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [sessionId]);

  const runAiAnalysis = async () => {
    if (records.length === 0) return;
    setAnalyzing(true);
    
    const allSessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
    const allRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendx_records') || '[]');
    
    // Determine the course context from the current session
    const currentSessionData = activeSession || allSessions.find(s => s.id === sessionId);
    if (!currentSessionData) {
      setAnalyzing(false);
      return;
    }

    const courseSessions = allSessions.filter(s => s.courseId === currentSessionData.courseId);
    
    // Calculate ACTUAL stats for students in this session based on historical data
    const realStats: StudentStats[] = records.map(r => {
      const studentHistoryForCourse = allRecords.filter(rec => 
        rec.matricNo === r.matricNo && 
        courseSessions.some(sess => sess.id === rec.sessionId)
      );
      
      const count = studentHistoryForCourse.length;
      const pct = courseSessions.length > 0 ? (count / courseSessions.length) * 100 : 0;
      
      return {
        matricNo: r.matricNo,
        name: r.studentName,
        sessionsAttended: count,
        totalSessions: courseSessions.length,
        percentage: pct,
        eligible: pct >= 75
      };
    });

    const insight = await analyzeAttendance(realStats);
    setAiInsights(insight);
    setAnalyzing(false);
  };

  const sessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
  const sessionData = activeSession || sessions.find(s => s.id === sessionId);

  if (!sessionData) {
    return (
      <Layout onLogout={onLogout} showLogout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-gray-800">Session data unavailable.</h2>
          <Link to="/dashboard" className="text-blue-600 font-semibold hover:underline mt-4 inline-block">Return to Dashboard</Link>
        </div>
      </Layout>
    );
  }

  const course = COURSES.find(c => c.id === sessionData.courseId);
  const portalUrl = `${window.location.origin}${window.location.pathname}#/portal/${sessionData.id}`;

  return (
    <Layout title="Live Session Tracking" onLogout={onLogout} showLogout>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full mb-2 uppercase tracking-wider ${sessionData.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {sessionData.active ? 'Live Session' : 'Past Session'}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{course?.name} ({course?.code})</h1>
              <p className="text-gray-500 font-medium">Level: {sessionData.level} | Dept: {DEPARTMENTS.find(d => d.id === sessionData.departmentId)?.name}</p>
            </div>
            {sessionData.active && (
              <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl text-center shadow-lg border-b-4 border-blue-800">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-1">Session Key</p>
                <p className="text-3xl font-black tracking-widest">{sessionData.sessionKey}</p>
              </div>
            )}
          </div>

          {sessionData.active && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">One-Time Attendance Link</label>
                <div className="flex items-center space-x-2">
                  <input 
                    readOnly 
                    value={portalUrl}
                    className="flex-1 bg-white border rounded-lg px-3 py-2 text-sm text-gray-600 outline-none truncate"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(portalUrl);
                      alert('Link copied to clipboard!');
                    }}
                    className="bg-gray-800 text-white p-2 rounded-lg hover:bg-black transition-colors"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center p-4 bg-blue-50 rounded-xl">
                <div className="text-center">
                  <span className="text-blue-700 text-3xl font-black">{records.length}</span>
                  <p className="text-blue-600 text-xs font-bold uppercase">Students Present</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Attendance Log</h3>
              <span className="text-xs text-gray-400">Total: {records.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Matric No</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">
                        {sessionData.active ? 'Waiting for students to log attendance...' : 'No records found for this session.'}
                      </td>
                    </tr>
                  ) : (
                    records.map(record => (
                      <tr key={record.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{record.matricNo}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{record.studentName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(record.timestamp).toLocaleTimeString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Verified</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">AI Insight Engine</h3>
                <i className="fas fa-microchip text-blue-500"></i>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Analyze student achievement relative to the 75% threshold based on historical records.
              </p>
              {aiInsights ? (
                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-4 animate-in fade-in zoom-in">
                  <div className="flex items-start space-x-2">
                    <i className="fas fa-quote-left text-blue-300 mt-1"></i>
                    <p className="italic leading-relaxed">{aiInsights}</p>
                  </div>
                </div>
              ) : null}
              <button 
                onClick={runAiAnalysis}
                disabled={analyzing || records.length === 0}
                className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md"
              >
                {analyzing ? (
                  <i className="fas fa-circle-notch fa-spin"></i>
                ) : (
                  <>
                    <i className="fas fa-brain"></i>
                    <span>Analyze Attendance</span>
                  </>
                )}
              </button>
            </div>

            {sessionData.active ? (
              <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
                <h3 className="font-bold text-red-800 mb-2">End Session</h3>
                <p className="text-sm text-red-600 mb-4">Once ended, the session key and link will expire permanently.</p>
                <button 
                  onClick={() => onEndSession(sessionData.id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-sm"
                >
                  <i className="fas fa-power-off"></i>
                  <span>Terminate Session</span>
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                 <Link 
                  to="/history" 
                  className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-sm"
                >
                  <i className="fas fa-chevron-left"></i>
                  <span>Back to History</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
