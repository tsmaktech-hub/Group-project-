import { createClient } from '@supabase/supabase-js';
import { AttendanceSession, AttendanceRecord, User } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;

export const getSupabase = () => {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key are required. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
    }
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};

const SESSIONS_TABLE = 'session';
const RECORDS_TABLE = 'attendance_record';
const BUCKET_NAME = 'face-images';

export const createSession = async (sessionData: AttendanceSession) => {
  // Map camelCase to snake_case for Supabase
  const dbData = {
    lecturer_id: sessionData.lecturerId,
    course_id: sessionData.courseId,
    department_id: sessionData.departmentId,
    level: sessionData.level,
    session_key: sessionData.sessionKey,
    start_time: sessionData.startTime,
    active: sessionData.active,
    latitude: sessionData.latitude,
    longitude: sessionData.longitude
  };
  
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .insert([dbData])
    .select()
    .single();
  
  if (error) {
    console.error("Supabase Create Session Error:", error);
    // If the error is about no rows returned, it's likely RLS blocking the select
    if (error.code === 'PGRST116' && !data) {
      console.warn("Session created but RLS blocked the return. Attempting to fetch manually...");
      // Try to fetch it manually by session_key and start_time
      const { data: manualData, error: manualError } = await getSupabase()
        .from(SESSIONS_TABLE)
        .select('*')
        .eq('session_key', dbData.session_key)
        .eq('start_time', dbData.start_time)
        .single();
      
      if (manualError) {
        console.error("Manual fetch failed:", manualError);
        throw error;
      }
      return mapSessionFromDb(manualData);
    }
    throw error;
  }
  
  if (!data) {
    throw new Error("Session created but no data was returned from the database.");
  }

  return mapSessionFromDb(data);
};

// Helper to map DB session to Frontend session
const mapSessionFromDb = (data: any): AttendanceSession => ({
  id: data.id,
  lecturerId: data.lecturer_id,
  courseId: data.course_id,
  departmentId: data.department_id,
  level: data.level,
  sessionKey: data.session_key,
  startTime: data.start_time,
  endTime: data.end_time,
  active: data.active,
  latitude: data.latitude,
  longitude: data.longitude
});

// Helper to map DB record to Frontend record
const mapRecordFromDb = (data: any): AttendanceRecord => ({
  id: data.id,
  sessionId: data.session_id,
  studentName: data.student_name,
  matricNo: data.matric_no,
  department: data.department,
  timestamp: data.timestamp,
  faceImage: data.face_image,
  latitude: data.latitude,
  longitude: data.longitude,
  distance: data.distance
});

export const getSession = async (sessionId: string) => {
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) return null;
  return mapSessionFromDb(data);
};

export const addAttendanceRecord = async (recordData: AttendanceRecord) => {
  const dbData = {
    session_id: recordData.sessionId,
    student_name: recordData.studentName,
    matric_no: recordData.matricNo,
    department: recordData.department,
    timestamp: recordData.timestamp,
    face_image: recordData.faceImage,
    latitude: recordData.latitude,
    longitude: recordData.longitude,
    distance: recordData.distance
  };

  const { data, error } = await getSupabase()
    .from(RECORDS_TABLE)
    .insert([dbData])
    .select()
    .single();
  
  if (error) {
    console.error("Supabase Add Record Error:", error);
    throw error;
  }
  return mapRecordFromDb(data);
};

export const getRecordsForSession = async (sessionId: string) => {
  const { data, error } = await getSupabase()
    .from(RECORDS_TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: false });
  
  if (error) throw error;
  return data.map(mapRecordFromDb);
};

export const getActiveSession = async (lecturerId: string) => {
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('lecturer_id', lecturerId)
    .eq('active', true)
    .single();
  
  if (error) return null;
  return mapSessionFromDb(data);
};

export const endSession = async (sessionId: string) => {
  const { error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .update({ active: false, end_time: Date.now() })
    .eq('id', sessionId);
  
  if (error) throw error;
};

export const saveUser = async (user: User) => {
  const { error } = await getSupabase()
    .from('users')
    .upsert([user]);
  
  if (error) {
    console.error("Supabase Save User Error:", error);
    throw error;
  }
};

export const getSessionById = async (sessionId: string) => {
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) return null;
  return mapSessionFromDb(data);
};

export const subscribeToSessionRecords = (sessionId: string, callback: (records: AttendanceRecord[]) => void) => {
  // Initial fetch
  getRecordsForSession(sessionId).then(callback);

  // Subscribe to changes
  const channel = getSupabase()
    .channel(`session-records-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: RECORDS_TABLE,
        filter: `session_id=eq.${sessionId}`
      },
      () => {
        // Re-fetch all records for simplicity and consistency
        getRecordsForSession(sessionId).then(callback);
      }
    )
    .subscribe();

  return () => {
    getSupabase().removeChannel(channel);
  };
};

export const getSessionsByLecturer = async (lecturerId: string) => {
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('lecturer_id', lecturerId)
    .order('start_time', { ascending: false });
  
  if (error) throw error;
  return data.map(mapSessionFromDb);
};

export const getRecordCountForSession = async (sessionId: string) => {
  const { count, error } = await getSupabase()
    .from(RECORDS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);
  
  if (error) throw error;
  return count || 0;
};

export const getSessionsByCourse = async (courseId: string) => {
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('course_id', courseId);
  
  if (error) throw error;
  return data.map(mapSessionFromDb);
};

export const getRecordsBySessions = async (sessionIds: string[]) => {
  if (sessionIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from(RECORDS_TABLE)
    .select('*')
    .in('session_id', sessionIds);
  
  if (error) throw error;
  return data.map(mapRecordFromDb);
};

export const uploadFaceImage = async (sessionId: string, matricNo: string, blob: Blob) => {
  const fileName = `${sessionId}/${matricNo}_${Date.now()}.jpg`;
  const { data, error } = await getSupabase().storage
    .from(BUCKET_NAME)
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = getSupabase().storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return publicUrl;
};
