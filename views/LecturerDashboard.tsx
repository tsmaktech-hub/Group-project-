
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { User, AttendanceSession } from '../types';
import { DEPARTMENTS, COURSES, LEVELS, GEOCONFIG } from '../constants';

interface LecturerDashboardProps {
  user: User | null;
  onLogout: () => void;
  onStartSession: (session: AttendanceSession) => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ user, onLogout, onStartSession }) => {
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredCourses = COURSES.filter(c => c.deptId === selectedDept);

  const handleStartSession = () => {
    if (!selectedDept || !selectedLevel || !selectedCourse) {
      setError('Please complete all selections.');
      return;
    }

    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const sessionKey = Math.random().toString(36).substr(2, 6).toUpperCase();
        const sessionId = Math.random().toString(36).substr(2, 9);
        
        const newSession: AttendanceSession = {
          id: sessionId,
          lecturerId: user?.id || 'anonymous',
          courseId: selectedCourse,
          departmentId: selectedDept,
          level: selectedLevel,
          sessionKey,
          startTime: Date.now(),
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          },
          radius: GEOCONFIG.DEFAULT_RADIUS,
          active: true
        };

        onStartSession(newSession);
        setLoading(false);
      },
      (err) => {
        setError('Failed to get your location. Please enable location services.');
        setLoading(false);
      }
    );
  };

  return (
    <Layout title="Lecturer Dashboard" onLogout={onLogout} showLogout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <i className="fas fa-plus-circle text-blue-600 mr-2"></i>
              Start New Session
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">College</label>
                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-medium">
                  College of Engineering
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => { setSelectedDept(e.target.value); setSelectedCourse(''); }}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Level</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="">Select Level</option>
                    {LEVELS.map(l => (
                      <option key={l} value={l}>{l} Level</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedDept && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="">Select Course</option>
                    {filteredCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center space-x-2 text-sm">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleStartSession}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-lg"
              >
                {loading ? (
                  <i className="fas fa-circle-notch fa-spin"></i>
                ) : (
                  <>
                    <i className="fas fa-satellite-dish"></i>
                    <span>Generate Session & Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-clipboard-check text-blue-600 mr-2"></i>
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/history" className="p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-blue-50 transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                    <i className="fas fa-history"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Session History</h4>
                    <p className="text-xs text-gray-500">View and manage past sessions</p>
                  </div>
                </div>
              </Link>
              {selectedCourse ? (
                <Link to={`/audit/${selectedCourse}`} className="p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-green-50 transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-green-600 group-hover:scale-110 transition-transform">
                      <i className="fas fa-user-graduate"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">Exam Eligibility</h4>
                      <p className="text-xs text-gray-500">75% attendance audit</p>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl opacity-50 cursor-not-allowed">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                      <i className="fas fa-user-graduate"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-400">Exam Eligibility</h4>
                      <p className="text-xs text-gray-400">Select course to audit</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Institutional Policy</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                <span className="text-gray-600 text-sm font-medium">Exam Eligibility</span>
                <span className="text-blue-700 font-bold">75% Attendance</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                As per Senate regulation, students who fail to meet the 75% attendance threshold are strictly ineligible for semester examinations. Use the Audit tool to generate official lists.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-bold mb-2 text-blue-100">Live Dashboard</h3>
            <p className="text-sm mb-4">Active sessions appear in real-time as students submit. Ensure you are within the classroom geofence.</p>
            <div className="animate-pulse flex items-center space-x-2 text-xs font-bold text-blue-200">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span>READY FOR SESSIONS</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
