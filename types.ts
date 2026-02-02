
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'lecturer' | 'student';
}

export interface Department {
  id: string;
  name: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  deptId: string;
}

export interface AttendanceSession {
  id: string;
  lecturerId: string;
  courseId: string;
  departmentId: string;
  level: string;
  sessionKey: string;
  startTime: number;
  endTime?: number; // Added to mark past sessions
  location: {
    lat: number;
    lng: number;
  };
  radius: number; // in meters
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentName: string;
  matricNo: string;
  department: string;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
  };
}

export interface StudentStats {
  matricNo: string;
  name: string;
  sessionsAttended: number;
  totalSessions: number;
  percentage: number;
  eligible: boolean;
}
