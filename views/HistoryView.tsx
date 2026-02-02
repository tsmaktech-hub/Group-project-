
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AttendanceSession, AttendanceRecord } from '../types';
import { COURSES, DEPARTMENTS } from '../constants';

interface HistoryViewProps {
  onLogout: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onLogout }) => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);

  useEffect(() => {
    const savedSessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
    setSessions(savedSessions.sort((a, b) => b.startTime - a.startTime));
  }, []);

  return (
    <Layout title="Session History" onLogout={onLogout} showLogout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Attendance History</h2>
          <Link to="/dashboard" className="text-blue-600 font-bold hover:underline flex items-center space-x-2">
            <i className="fas fa-plus"></i>
            <span>New Session</span>
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-20 text-center">
            <i className="fas fa-folder-open text-gray-300 text-5xl mb-4"></i>
            <h3 className="text-lg font-bold text-gray-800">No sessions recorded yet.</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">Start your first attendance session from the dashboard.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map(session => {
              const course = COURSES.find(c => c.id === session.courseId);
              const records: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendx_records') || '[]');
              const attendanceCount = records.filter(r => r.sessionId === session.id).length;

              return (
                <div key={session.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  <div className="p-5 border-b">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {course?.code}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${session.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {session.active ? 'Active' : 'Ended'}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 truncate">{course?.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      <i className="far fa-calendar-alt mr-1"></i>
                      {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="p-5 flex-1 bg-gray-50/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Attendance</p>
                      <p className="text-2xl font-black text-gray-800">{attendanceCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Level</p>
                      <p className="text-sm font-bold text-gray-800">{session.level}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-white border-t">
                    <Link 
                      to={`/session/${session.id}`}
                      className="w-full flex items-center justify-center space-x-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                      <i className="fas fa-eye"></i>
                      <span>View Report</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};
