
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DEPARTMENTS } from '../constants';
import { AttendanceSession, AttendanceRecord } from '../types';

export const StudentPortal: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [name, setName] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [department, setDepartment] = useState('');
  const [sessionKey, setSessionKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);

  useEffect(() => {
    const sessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
    const found = sessions.find(s => s.id === sessionId);
    if (found) {
      setActiveSession(found);
    }
  }, [sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    setMessage('');

    if (!activeSession || !activeSession.active) {
      setStatus('error');
      setMessage('This session is no longer active.');
      setLoading(false);
      return;
    }

    if (sessionKey.toUpperCase() !== activeSession.sessionKey) {
      setStatus('error');
      setMessage('Incorrect Session Key. Please ask your lecturer.');
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Geolocation must be enabled to take attendance.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Calculate distance (very rough simplification for demo)
        const latDiff = Math.abs(position.coords.latitude - activeSession.location.lat);
        const lngDiff = Math.abs(position.coords.longitude - activeSession.location.lng);
        
        // Approx 100m threshold
        if (latDiff > 0.001 || lngDiff > 0.001) {
           setStatus('error');
           setMessage('Outside lecture range. Attendance denied.');
           setLoading(false);
           return;
        }

        setTimeout(() => {
          // Save Record
          const records: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendx_records') || '[]');
          
          // Check if student already submitted for this session
          const alreadySubmitted = records.some(r => r.sessionId === sessionId && r.matricNo === matricNo);
          if (alreadySubmitted) {
            setStatus('error');
            setMessage('You have already logged attendance for this session.');
            setLoading(false);
            return;
          }

          const newRecord: AttendanceRecord = {
            id: Math.random().toString(36).substr(2, 9),
            sessionId: sessionId!,
            studentName: name,
            matricNo: matricNo.toUpperCase(),
            department: department,
            timestamp: Date.now(),
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          };

          localStorage.setItem('attendx_records', JSON.stringify([...records, newRecord]));
          
          setStatus('success');
          setMessage(`Attendance successfully logged for ${name}!`);
          setLoading(false);
          setName('');
          setMatricNo('');
          setDepartment('');
          setSessionKey('');
        }, 1000);
      },
      (err) => {
        setStatus('error');
        setMessage('Location access denied. Attendance cannot be verified.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <h2 className="text-xl font-bold">Invalid Session</h2>
          <p className="text-gray-500">The attendance link you followed is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-white text-center">
          <div className="bg-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <i className="fas fa-university text-3xl"></i>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Student Attendance Portal</h1>
          <p className="text-blue-100 mt-2 text-sm">Logging for session at: {new Date(activeSession.startTime).toLocaleTimeString()}</p>
        </div>

        <div className="p-8 md:p-10">
          {status === 'success' ? (
            <div className="animate-in zoom-in duration-300 text-center space-y-4">
              <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-check text-4xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verified!</h2>
              <p className="text-gray-600 px-4">{message}</p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-6 text-blue-600 font-bold hover:underline"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Matric Number</label>
                  <input
                    type="text"
                    required
                    value={matricNo}
                    onChange={(e) => setMatricNo(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800"
                    placeholder="ENG/21/0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Department</label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 appearance-none"
                >
                  <option value="">Choose Department</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 p-6 rounded-2xl border-2 border-dashed border-blue-200">
                <label className="block text-center text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">One-Time Session Key</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={sessionKey}
                  onChange={(e) => setSessionKey(e.target.value.toUpperCase())}
                  className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-white border border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all text-blue-700 uppercase"
                  placeholder="------"
                />
              </div>

              {status === 'error' && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center space-x-2 text-sm animate-in slide-in-from-bottom-2">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-3 text-lg uppercase tracking-wider mt-4"
              >
                {loading ? (
                  <i className="fas fa-circle-notch fa-spin"></i>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    <span>Submit Attendance</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-gray-400 text-xs font-medium space-y-1">
        <p>Geo-fencing active. Must reach 75% for exam eligibility.</p>
      </div>
    </div>
  );
};
