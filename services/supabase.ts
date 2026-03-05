import { createClient } from '@supabase/supabase-js';
import { AttendanceSession, AttendanceRecord, User } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;

export const getSupabase = () => {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your-supabase-url') {
      console.warn('Supabase URL and Anon Key are not configured correctly. Using localStorage fallback.');
      return null;
    }
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseClient;
};

const SESSIONS_TABLE = 'sessions';
const RECORDS_TABLE = 'records';
const BUCKET_NAME = 'face-images';

export const createSession = async (sessionData: Omit<AttendanceSession, 'id'>) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(SESSIONS_TABLE)
        .insert([sessionData])
        .select()
        .single();
      
      if (!error && data) return { ...data, id: data.id } as AttendanceSession;
      console.warn('Supabase insert error, falling back to local:', error);
    } catch (e) {
      console.warn('Supabase request failed, falling back to local:', e);
    }
  }

  // Fallback to localStorage
  const id = Math.random().toString(36).substr(2, 9);
  const newSession = { ...sessionData, id } as AttendanceSession;
  const sessions = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
  sessions.push(newSession);
  localStorage.setItem('attendx_sessions', JSON.stringify(sessions));
  return newSession;
};

export const getSession = async (sessionId: string) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(SESSIONS_TABLE)
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (!error && data) return data as AttendanceSession;
    } catch (e) {}
  }

  const sessions = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
  return sessions.find((s: any) => s.id === sessionId) || null;
};

export const addAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id'>) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(RECORDS_TABLE)
        .insert([recordData])
        .select()
        .single();
      
      if (!error && data) return data as AttendanceRecord;
    } catch (e) {}
  }

  const id = Math.random().toString(36).substr(2, 9);
  const newRecord = { ...recordData, id } as AttendanceRecord;
  const records = JSON.parse(localStorage.getItem('attendx_records') || '[]');
  records.push(newRecord);
  localStorage.setItem('attendx_records', JSON.stringify(records));
  return newRecord;
};

export const getRecordsForSession = async (sessionId: string) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(RECORDS_TABLE)
        .select('*')
        .eq('sessionId', sessionId)
        .order('timestamp', { ascending: false });
      
      if (!error && data) return data as AttendanceRecord[];
    } catch (e) {}
  }

  const records = JSON.parse(localStorage.getItem('attendx_records') || '[]');
  return records
    .filter((r: any) => r.sessionId === sessionId)
    .sort((a: any, b: any) => b.timestamp - a.timestamp) as AttendanceRecord[];
};

export const getActiveSession = async (lecturerId: string) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(SESSIONS_TABLE)
        .select('*')
        .eq('lecturerId', lecturerId)
        .eq('active', true)
        .single();
      
      if (!error && data) return data as AttendanceSession;
    } catch (e) {}
  }

  const sessions = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
  return sessions.find((s: any) => s.lecturerId === lecturerId && s.active) || null;
};

export const endSession = async (sessionId: string) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from(SESSIONS_TABLE)
        .update({ active: false, endTime: Date.now() })
        .eq('id', sessionId);
      
      if (!error) return;
    } catch (e) {}
  }

  const sessions = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
  const updatedSessions = sessions.map((s: any) => 
    s.id === sessionId ? { ...s, active: false, endTime: Date.now() } : s
  );
  localStorage.setItem('attendx_sessions', JSON.stringify(updatedSessions));
};

export const saveUser = async (user: User) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert([user]);
      
      if (!error) return;
    } catch (e) {}
  }
  
  const users = JSON.parse(localStorage.getItem('attendx_all_users') || '[]');
  const existingIndex = users.findIndex((u: any) => u.id === user.id);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem('attendx_all_users', JSON.stringify(users));
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

  const supabase = getSupabase();
  if (supabase) {
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
  }

  // Local storage "subscription" (polling fallback)
  const interval = setInterval(() => {
    getRecordsForSession(sessionId).then(callback);
  }, 2000);

  return () => clearInterval(interval);
};

export const getSessionsByLecturer = async (lecturerId: string) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(SESSIONS_TABLE)
        .select('*')
        .eq('lecturerId', lecturerId)
        .order('startTime', { ascending: false });
      
      if (!error && data) return data as AttendanceSession[];
    } catch (e) {}
  }

  const sessions = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
  return sessions
    .filter((s: any) => s.lecturerId === lecturerId)
    .sort((a: any, b: any) => b.startTime - a.startTime) as AttendanceSession[];
};

export const getRecordCountForSession = async (sessionId: string) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { count, error } = await supabase
        .from(RECORDS_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('sessionId', sessionId);
      
      if (!error) return count || 0;
    } catch (e) {}
  }

  const records = JSON.parse(localStorage.getItem('attendx_records') || '[]');
  return records.filter((r: any) => r.sessionId === sessionId).length;
};

export const getSessionsByCourse = async (courseId: string) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(SESSIONS_TABLE)
        .select('*')
        .eq('courseId', courseId);
      
      if (!error && data) return data as AttendanceSession[];
    } catch (e) {}
  }

  const sessions = JSON.parse(localStorage.getItem('attendx_sessions') || '[]');
  return sessions.filter((s: any) => s.courseId === courseId) as AttendanceSession[];
};

export const getRecordsBySessions = async (sessionIds: string[]) => {
  if (sessionIds.length === 0) return [];
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(RECORDS_TABLE)
        .select('*')
        .in('sessionId', sessionIds);
      
      if (!error && data) return data as AttendanceRecord[];
    } catch (e) {}
  }

  const records = JSON.parse(localStorage.getItem('attendx_records') || '[]');
  return records.filter((r: any) => sessionIds.includes(r.sessionId)) as AttendanceRecord[];
};

export const uploadFaceImage = async (sessionId: string, matricNo: string, blob: Blob) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const fileName = `${sessionId}/${matricNo}_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName);

        return publicUrl;
      }
    } catch (e) {}
  }

  // Fallback: convert blob to base64 for local storage (limited by size, but works for demo)
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};
