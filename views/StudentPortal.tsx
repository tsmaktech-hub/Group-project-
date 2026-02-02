
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { DEPARTMENTS } from '../constants';
import { AttendanceSession, AttendanceRecord } from '../types';

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    const sessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
    const found = sessions.find(s => s.id === sessionId);
    if (found) {
      setActiveSession(found);
      startCamera();
    }
  }, [sessionId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  const captureImage = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 300, 300);
        return canvasRef.current.toDataURL('image/jpeg', 0.5);
      }
    }
    return undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performAttendanceCheck();
  };

  const performAttendanceCheck = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');

    if (!activeSession || !activeSession.active) {
      setStatus('error');
      setMessage('This session is no longer active.');
      setLoading(false);
      return;
    }

    const deviceLockKey = `attendx_lock_${sessionId}`;
    const lockedMatric = localStorage.getItem(deviceLockKey);
    
    if (lockedMatric && lockedMatric.toUpperCase() !== matricNo.toUpperCase()) {
      setStatus('error');
      setMessage(`Security Alert: This device is locked to ${lockedMatric}.`);
      setLoading(false);
      return;
    }

    if (sessionKey.toUpperCase() !== activeSession.sessionKey) {
      setStatus('error');
      setMessage('Incorrect Session Key. Check with your lecturer.');
      setLoading(false);
      return;
    }

    const faceImage = captureImage();
    if (!faceImage && cameraActive) {
      setStatus('error');
      setMessage('Face capture failed. Please ensure camera is allowed.');
      setLoading(false);
      return;
    }

    const getLocation = (useHighAccuracy: boolean, timeout: number, maxAge: number) => {
      return new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: useHighAccuracy,
          timeout: timeout,
          maximumAge: maxAge
        });
      });
    };

    let position: GeolocationPosition | null = null;

    try {
      position = await getLocation(true, 10000, 0);
    } catch (e) {
      try {
        console.warn("GPS timed out, trying network positioning...");
        position = await getLocation(false, 15000, 30000);
      } catch (e2) {
        setStatus('error');
        setMessage('Location error: Unable to fix position. If you are indoors, try moving closer to a window.');
        setLoading(false);
        return;
      }
    }

    if (!position) return;

    const distance = getDistanceInMeters(
      position.coords.latitude,
      position.coords.longitude,
      activeSession.location.lat,
      activeSession.location.lng
    );
    
    const allowedRadius = activeSession.radius + 75; 
    
    if (distance > allowedRadius) {
       setStatus('error');
       setMessage(`Too far from lecture hall (${Math.round(distance)}m). You must be present in class.`);
       setLoading(false);
       return;
    }

    const records: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendx_records') || '[]');
    const alreadySubmitted = records.some(r => r.sessionId === sessionId && r.matricNo.toUpperCase() === matricNo.toUpperCase());
    
    if (alreadySubmitted) {
      setStatus('error');
      setMessage('Attendance already recorded.');
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
      faceImage: faceImage,
      location: {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
    };

    localStorage.setItem('attendx_records', JSON.stringify([...records, newRecord]));
    localStorage.setItem(deviceLockKey, matricNo.toUpperCase());
    
    setStatus('success');
    setMessage(`Verified! Attendance logged for ${name}.`);
    setLoading(false);
  };

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-sm">
          <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <h2 className="text-xl font-bold">Session Unavailable</h2>
          <button onClick={() => window.location.reload()} className="mt-6 text-blue-600 font-bold uppercase text-xs tracking-widest">Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-6 text-white text-center">
          <h1 className="text-xl font-black uppercase tracking-tight">Institutional Attendance</h1>
          <div className="mt-2 inline-flex items-center space-x-2 bg-blue-700 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-blue-100">
             <i className="fas fa-shield-alt"></i>
             <span>Identity + Location Guard Active</span>
          </div>
        </div>

        <div className="p-8 md:p-10">
          {status === 'success' ? (
            <div className="text-center space-y-4 animate-in zoom-in">
              <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-check text-4xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Logged Successfully</h2>
              <p className="text-gray-600 px-4">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group overflow-hidden rounded-2xl bg-black aspect-square max-w-[200px] mx-auto border-4 border-gray-100 shadow-inner">
                {!cameraActive && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                      <i className="fas fa-camera-slash text-2xl mb-2 opacity-50"></i>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Allow Camera access</p>
                   </div>
                )}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover grayscale brightness-110 contrast-125"
                />
                <div className="absolute top-4 left-4 border-l-2 border-t-2 border-blue-400 w-4 h-4"></div>
                <div className="absolute top-4 right-4 border-r-2 border-t-2 border-blue-400 w-4 h-4"></div>
                <div className="absolute bottom-4 left-4 border-l-2 border-b-2 border-blue-400 w-4 h-4"></div>
                <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-blue-400 w-4 h-4"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="w-full h-[1px] bg-blue-500/20 animate-pulse"></div>
                </div>
                <canvas ref={canvasRef} width="300" height="300" className="hidden" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Matric Number</label>
                  <input
                    type="text" required value={matricNo} onChange={(e) => setMatricNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="ENG/21/0000"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <label className="block text-center text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Lecture Key</label>
                <input
                  type="text" 
                  required 
                  maxLength={6} 
                  value={sessionKey} 
                  onChange={(e) => setSessionKey(e.target.value.toUpperCase())}
                  className="w-full text-center text-3xl font-black tracking-[0.4em] py-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition-all text-blue-700 uppercase"
                  placeholder="------"
                />
              </div>

              {status === 'error' && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex flex-col space-y-2 text-xs border border-red-100 animate-in shake">
                  <div className="flex items-center space-x-2 font-bold">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>{message}</span>
                  </div>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-3 text-sm uppercase tracking-widest"
              >
                {loading ? <i className="fas fa-sync-alt fa-spin"></i> : <span>Verify Presence</span>}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-8 text-center space-y-2">
        <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">Institutional Anti-Fraud Protocol Active</p>
        <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Engineered by SIENA Group</p>
      </div>
    </div>
  );
};
