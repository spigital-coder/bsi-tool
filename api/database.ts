import { BellowsPart } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibasglziaqxtywitwqwf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYXNnbHppYXF4dHl3aXR3cXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODQ5NzMsImV4cCI6MjA4MzE2MDk3M30.xrCJV1xxWAjb9u84dduiTenVVHLtaG1ubcaPMyN4FUg';

export const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'BSI-product-images';

export const db = {
  auth: {
    signIn: async (email: string, pass: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, error: null, user: data.user };
      } catch (e: any) {
        return { success: false, error: e.message || "Network error. Please check your connection or project status." };
      }
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    getSession: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
      } catch {
        return null;
      }
    }
  },

  storage: {
    uploadImage: async (file: File): Promise<{url: string | null, error: string | null}> => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `parts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file);

        if (uploadError) {
          console.error("Storage Upload Error:", uploadError);
          return { url: null, error: uploadError.message };
        }

        const { data } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        return { url: data.publicUrl, error: null };
      } catch (e: any) {
        return { url: null, error: e.message || "Failed to upload image. Check network connection." };
      }
    }
  },

  getAll: async (): Promise<BellowsPart[]> => {
    try {
      const { data, error } = await supabase
        .from('bellows_parts')
        .select('*')
        .order('part_number', { ascending: true });

      if (error) {
        console.error("Cloud Database Fetch Error:", error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Connectivity issue:", e);
      return [];
    }
  },

  create: async (newPart: BellowsPart): Promise<{success: boolean, error?: string}> => {
    try {
      const { error } = await supabase
        .from('bellows_parts')
        .insert([newPart]);
      
      if (error) {
        console.error("Insert Error:", error);
        const msg = error.code === '42501' ? "RLS Policy Violation: Check your Supabase Table RLS Policies." : error.message;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to connect to database." };
    }
  },

  update: async (partNumber: string, data: Partial<BellowsPart>): Promise<{success: boolean, error?: string}> => {
    try {
      const { error } = await supabase
        .from('bellows_parts')
        .update(data)
        .eq('part_number', partNumber);

      if (error) {
        const msg = error.code === '42501' ? "RLS Policy Violation: Check your Supabase Table RLS Policies." : error.message;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to connect to database." };
    }
  },

  delete: async (partNumber: string): Promise<{success: boolean, error?: string}> => {
    try {
      console.log("Database: Attempting to delete part:", partNumber);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("Delete aborted: No active session found.");
        return { success: false, error: "Session Expired. Please sign in again." };
      }

      // Execute delete
      const { error } = await supabase
        .from('bellows_parts')
        .delete()
        .eq('part_number', partNumber);

      if (error) {
        console.error("Database Delete Error:", error);
        const msg = error.code === '42501' ? "RLS Permission Denied: Explicit DELETE policy missing in Supabase." : error.message;
        return { success: false, error: msg };
      }

      console.log("Database: Delete request completed successfully.");
      return { success: true };
    } catch (e: any) {
      console.error("CRITICAL error in delete service:", e);
      return { success: false, error: e.message || "Internal network error during deletion." };
    }
  }
};