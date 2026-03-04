import { createClient } from '@supabase/supabase-js';
import { AttendanceSession, AttendanceRecord, User } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SESSIONS_TABLE = 'sessions';
const RECORDS_TABLE = 'records';
const BUCKET_NAME = 'face-images';

export const createSession = async (sessionData: Omit<AttendanceSession, 'id'>) => {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .insert([sessionData])
    .select()
    .single();
  
  if (error) throw error;
  return { ...data, id: data.id } as AttendanceSession;
};

export const getSession = async (sessionId: string) => {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) return null;
  return data as AttendanceSession;
};

export const addAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id'>) => {
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .insert([recordData])
    .select()
    .single();
  
  if (error) throw error;
  return data as AttendanceRecord;
};

export const getRecordsForSession = async (sessionId: string) => {
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .select('*')
    .eq('sessionId', sessionId)
    .order('timestamp', { ascending: false });
  
  if (error) throw error;
  return data as AttendanceRecord[];
};

export const getActiveSession = async (lecturerId: string) => {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('lecturerId', lecturerId)
    .eq('active', true)
    .single();
  
  if (error) return null;
  return data as AttendanceSession;
};

export const endSession = async (sessionId: string) => {
  const { error } = await supabase
    .from(SESSIONS_TABLE)
    .update({ active: false, endTime: Date.now() })
    .eq('id', sessionId);
  
  if (error) throw error;
};

export const saveUser = async (user: User) => {
  const { error } = await supabase
    .from('users')
    .upsert([user]);
  
  if (error) throw error;
};

export const getSessionById = async (sessionId: string) => {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) return null;
  return data as AttendanceSession;
};

export const subscribeToSessionRecords = (sessionId: string, callback: (records: AttendanceRecord[]) => void) => {
  // Initial fetch
  getRecordsForSession(sessionId).then(callback);

  // Subscribe to changes
  const channel = supabase
    .channel(`session-records-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: RECORDS_TABLE,
        filter: `sessionId=eq.${sessionId}`
      },
      () => {
        // Re-fetch all records for simplicity and consistency
        getRecordsForSession(sessionId).then(callback);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const getSessionsByLecturer = async (lecturerId: string) => {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('lecturerId', lecturerId)
    .order('startTime', { ascending: false });
  
  if (error) throw error;
  return data as AttendanceSession[];
};

export const getRecordCountForSession = async (sessionId: string) => {
  const { count, error } = await supabase
    .from(RECORDS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('sessionId', sessionId);
  
  if (error) throw error;
  return count || 0;
};

export const getSessionsByCourse = async (courseId: string) => {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('courseId', courseId);
  
  if (error) throw error;
  return data as AttendanceSession[];
};

export const getRecordsBySessions = async (sessionIds: string[]) => {
  if (sessionIds.length === 0) return [];
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .select('*')
    .in('sessionId', sessionIds);
  
  if (error) throw error;
  return data as AttendanceRecord[];
};

export const uploadFaceImage = async (sessionId: string, matricNo: string, blob: Blob) => {
  const fileName = `${sessionId}/${matricNo}_${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return publicUrl;
};
