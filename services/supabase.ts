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

const SESSIONS_TABLE = 'sessions';
const RECORDS_TABLE = 'records';
const BUCKET_NAME = 'face-images';

export const createSession = async (sessionData: AttendanceSession) => {
  // Strip the frontend-generated ID to let Supabase generate a proper one if needed
  const { id, ...rest } = sessionData;
  
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .insert([rest])
    .select()
    .single();
  
  if (error) {
    console.error("Supabase Create Session Error:", error);
    // If the error is about no rows returned, it's likely RLS blocking the select
    if (error.code === 'PGRST116' && !data) {
      console.warn("Session created but RLS blocked the return. Attempting to fetch manually...");
      // Try to fetch it manually by sessionKey and startTime
      const { data: manualData, error: manualError } = await getSupabase()
        .from(SESSIONS_TABLE)
        .select('*')
        .eq('sessionKey', rest.sessionKey)
        .eq('startTime', rest.startTime)
        .single();
      
      if (manualError) {
        console.error("Manual fetch failed:", manualError);
        throw error;
      }
      return manualData as AttendanceSession;
    }
    throw error;
  }
  
  if (!data) {
    throw new Error("Session created but no data was returned from the database.");
  }

  return data as AttendanceSession;
};

export const getSession = async (sessionId: string) => {
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) return null;
  return data as AttendanceSession;
};

export const addAttendanceRecord = async (recordData: AttendanceRecord) => {
  const { id, ...rest } = recordData;
  const { data, error } = await getSupabase()
    .from(RECORDS_TABLE)
    .insert([rest])
    .select()
    .single();
  
  if (error) {
    console.error("Supabase Add Record Error:", error);
    throw error;
  }
  return data as AttendanceRecord;
};

export const getRecordsForSession = async (sessionId: string) => {
  const { data, error } = await getSupabase()
    .from(RECORDS_TABLE)
    .select('*')
    .eq('sessionId', sessionId)
    .order('timestamp', { ascending: false });
  
  if (error) throw error;
  return data as AttendanceRecord[];
};

export const getActiveSession = async (lecturerId: string) => {
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('lecturerId', lecturerId)
    .eq('active', true)
    .single();
  
  if (error) return null;
  return data as AttendanceSession;
};

export const endSession = async (sessionId: string) => {
  const { error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .update({ active: false, endTime: Date.now() })
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
  return data as AttendanceSession;
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
        filter: `sessionId=eq.${sessionId}`
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
    .eq('lecturerId', lecturerId)
    .order('startTime', { ascending: false });
  
  if (error) throw error;
  return data as AttendanceSession[];
};

export const getRecordCountForSession = async (sessionId: string) => {
  const { count, error } = await getSupabase()
    .from(RECORDS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('sessionId', sessionId);
  
  if (error) throw error;
  return count || 0;
};

export const getSessionsByCourse = async (courseId: string) => {
  const { data, error } = await getSupabase()
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('courseId', courseId);
  
  if (error) throw error;
  return data as AttendanceSession[];
};

export const getRecordsBySessions = async (sessionIds: string[]) => {
  if (sessionIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from(RECORDS_TABLE)
    .select('*')
    .in('sessionId', sessionIds);
  
  if (error) throw error;
  return data as AttendanceRecord[];
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
