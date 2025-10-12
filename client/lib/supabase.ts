import { createClient } from "@supabase/supabase-js";

const runtimeUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  (typeof window !== "undefined" && (window as any).__env?.VITE_SUPABASE_URL) ||
  "";
const runtimeAnon =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  (typeof window !== "undefined" &&
    (window as any).__env?.VITE_SUPABASE_ANON_KEY) ||
  "";

function failingResponse() {
  return Promise.resolve({
    data: null,
    error: new Error(
      "Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY",
    ),
  });
}

function mockFrom() {
  return {
    select: () => ({
      order: () => failingResponse(),
      maybeSingle: () => failingResponse(),
      single: () => failingResponse(),
      eq: () => ({
        maybeSingle: () => failingResponse(),
        single: () => failingResponse(),
      }),
    }),
    insert: () => failingResponse(),
    update: () => ({ eq: () => failingResponse() }),
    delete: () => ({ eq: () => failingResponse() }),
  } as any;
}

let supabase: any;
if (runtimeUrl && runtimeAnon) {
  supabase = createClient(runtimeUrl, runtimeAnon);
} else {
  // provide a minimal mock to avoid runtime constructor errors; methods return a rejection-like response
  supabase = { from: () => mockFrom() } as any;
}

export { supabase };
