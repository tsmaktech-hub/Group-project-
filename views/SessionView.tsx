
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { User, AttendanceSession, AttendanceRecord, StudentStats } from '../types';
import { COURSES, DEPARTMENTS } from '../constants';
import { analyzeAttendance } from '../services/geminiService';

const LINK_EXPIRY_MS = 30 * 60 * 1000;

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
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const fetchRecords = () => {
      const allRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendx_records') || '[]');
      const filtered = allRecords.filter(r => r.sessionId === sessionId);
      setRecords(filtered.sort((a, b) => b.timestamp - a.timestamp));
    };

    const updateTimer = () => {
      const sessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
      const sess = sessions.find(s => s.id === sessionId);
      if (sess && sess.active) {
        const diff = LINK_EXPIRY_MS - (Date.now() - sess.startTime);
        if (diff <= 0) {
          setTimeLeft('EXPIRED');
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        }
      }
    };

    fetchRecords();
    updateTimer();
    const interval = setInterval(() => {
      fetchRecords();
      updateTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const runAiAnalysis = async () => {
    if (records.length === 0) return;
    setAnalyzing(true);
    
    const allSessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
    const allRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendx_records') || '[]');
    
    const currentSessionData = activeSession || allSessions.find(s => s.id === sessionId);
    if (!currentSessionData) {
      setAnalyzing(false);
      return;
    }

    const courseSessions = allSessions.filter(s => s.courseId === currentSessionData.courseId);
    
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
    <Layout title="Live Verification" onLogout={onLogout} showLogout>
      {selectedFace && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 animate-in fade-in" onClick={() => setSelectedFace(null)}>
           <div className="bg-white rounded-3xl p-2 max-w-sm w-full relative animate-in zoom-in duration-200">
             <img src={selectedFace} className="w-full aspect-square object-cover rounded-2xl" />
             <button className="absolute -top-4 -right-4 bg-white text-black w-10 h-10 rounded-full shadow-xl flex items-center justify-center font-bold">
               <i className="fas fa-times"></i>
             </button>
             <div className="p-4 text-center">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Biometric Snapshot Captured at Login</p>
             </div>
           </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className={`inline-block px-3 py-1 text-[10px] font-black rounded-full mb-2 uppercase tracking-widest ${sessionData.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {sessionData.active ? 'Active Verification' : 'Past Report'}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{course?.code}: {course?.name}</h1>
              {sessionData.active && (
                <div className="flex items-center space-x-2 mt-2">
                  <i className={`fas fa-hourglass-half text-xs ${timeLeft === 'EXPIRED' ? 'text-red-500' : 'text-blue-500'}`}></i>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${timeLeft === 'EXPIRED' ? 'text-red-600' : 'text-blue-600'}`}>
                    Link Expires in: {timeLeft}
                  </span>
                </div>
              )}
            </div>
            {sessionData.active && (
              <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl text-center shadow-lg border-b-4 border-blue-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100 mb-1">Session Key</p>
                <p className="text-3xl font-black tracking-[0.2em]">{sessionData.sessionKey}</p>
              </div>
            )}
          </div>
          {sessionData.active && (
            <div className="mt-8 flex flex-col md:flex-row gap-4 items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Student Portal URL</label>
                  <div className="flex items-center space-x-2">
                    <input readOnly value={portalUrl} className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-500 truncate" />
                    <button onClick={() => { navigator.clipboard.writeText(portalUrl); alert('Copied!'); }} className="bg-blue-600 text-white p-2 rounded-lg text-sm"><i className="fas fa-copy"></i></button>
                  </div>
                </div>
                <div className="px-8 border-l border-blue-200 text-center">
                    <span className="text-4xl font-black text-blue-700 leading-none">{records.length}</span>
                    <p className="text-[10px] font-black text-blue-400 uppercase">Present</p>
                </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-widest">Attendance Roll</h3>
              <i className="fas fa-shield-alt text-blue-500"></i>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Matric No</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Face ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-gray-400 italic text-sm">Waiting for verification requests...</td>
                    </tr>
                  ) : (
                    records.map(record => (
                      <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                              {record.studentName.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold text-gray-800">{record.studentName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{record.matricNo}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">{new Date(record.timestamp).toLocaleTimeString()}</td>
                        <td className="px-6 py-4 text-right">
                          {record.faceImage ? (
                            <button 
                              onClick={() => setSelectedFace(record.faceImage!)}
                              className="text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full uppercase tracking-tighter"
                            >
                              View ID
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-300 font-bold uppercase">No Photo</span>
                          )}
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
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-widest mb-4">AI Insight Engine</h3>
              {aiInsights ? (
                <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-800 mb-4 leading-relaxed animate-in fade-in">
                   {aiInsights}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-6 italic">Run analysis to see attendance trends and 75% threshold risk.</p>
              )}
              <button 
                onClick={runAiAnalysis} disabled={analyzing || records.length === 0}
                className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-200 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-xs uppercase"
              >
                {analyzing ? <i className="fas fa-circle-notch fa-spin"></i> : <span>Analyze Records</span>}
              </button>
            </div>

            {sessionData.active && (
              <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
                <button 
                  onClick={() => onEndSession(sessionData.id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-xs uppercase shadow-lg shadow-red-200"
                >
                  <i className="fas fa-power-off"></i>
                  <span>End Session</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
