
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AttendanceSession, AttendanceRecord, StudentStats } from '../types';
import { COURSES } from '../constants';

interface AuditViewProps {
  onLogout: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({ onLogout }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const [stats, setStats] = useState<StudentStats[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  const course = COURSES.find(c => c.id === courseId);

  useEffect(() => {
    const allSessions: AttendanceSession[] = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
    const courseSessions = allSessions.filter(s => s.courseId === courseId);
    setTotalSessions(courseSessions.length);

    const allRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendx_records') || '[]');
    const courseRecords = allRecords.filter(r => courseSessions.some(s => s.id === r.sessionId));

    // Group by matric no
    const studentMap: Record<string, { name: string; count: number }> = {};
    courseRecords.forEach(r => {
      if (!studentMap[r.matricNo]) {
        studentMap[r.matricNo] = { name: r.studentName, count: 0 };
      }
      studentMap[r.matricNo].count += 1;
    });

    const calculatedStats: StudentStats[] = Object.keys(studentMap).map(matric => {
      const { name, count } = studentMap[matric];
      const pct = courseSessions.length > 0 ? (count / courseSessions.length) * 100 : 0;
      return {
        matricNo: matric,
        name,
        sessionsAttended: count,
        totalSessions: courseSessions.length,
        percentage: pct,
        eligible: pct >= 75
      };
    });

    setStats(calculatedStats.sort((a, b) => b.percentage - a.percentage));
  }, [courseId]);

  return (
    <Layout title="Exam Eligibility Audit" onLogout={onLogout} showLogout>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Attendance Audit Report</h2>
              <p className="text-gray-500 font-medium">{course?.code} - {course?.name}</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => window.print()} 
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl flex items-center space-x-2 transition-colors"
              >
                <i className="fas fa-print"></i>
                <span>Export List</span>
              </button>
              <Link to="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-2 transition-colors shadow-md">
                <i className="fas fa-chevron-left text-xs"></i>
                <span>Dashboard</span>
              </Link>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Total Classes</p>
              <p className="text-3xl font-black text-blue-700">{totalSessions}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
              <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Eligible Students</p>
              <p className="text-3xl font-black text-green-700">{stats.filter(s => s.eligible).length}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">At Risk / Ineligible</p>
              <p className="text-3xl font-black text-red-700">{stats.filter(s => !s.eligible).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800">75% Attendance Roll Call</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest border-b">Matric Number</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest border-b">Full Name</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest border-b">Present</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest border-b">Percentage</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest border-b">Exam Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">
                      No student records found for this course.
                    </td>
                  </tr>
                ) : (
                  stats.map(s => (
                    <tr key={s.matricNo} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{s.matricNo}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{s.name}</td>
                      <td className="px-6 py-4 text-sm text-center font-bold text-gray-600">
                        {s.sessionsAttended} / {totalSessions}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-black ${s.eligible ? 'text-green-600' : 'text-red-600'}`}>
                          {s.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.eligible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.eligible ? (
                            <><i className="fas fa-check-circle mr-1"></i> ELIGIBLE</>
                          ) : (
                            <><i className="fas fa-times-circle mr-1"></i> BARRED</>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};
