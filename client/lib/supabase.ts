// ------------------------------
// ACES Fuel Driver App – Supabase Connection
// ------------------------------
// Framework: React + Vite + Capacitor
// Author: eng.altieb@aces-co.com
// Description:
// Initializes the Supabase client for the Driver Mobile App.
// Works in Builder.io (runtime __env), Vite local dev, and Capacitor native builds.
// Provides safe fallbacks if not configured.
// ------------------------------

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Try to read environment variables from both:
 *  1. Vite static build-time vars (import.meta.env)
 *  2. Builder.io / runtime window.__env vars (injected at runtime)
 */
const env = (typeof window !== "undefined" && (window as any).__env) || {};

const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string) || env.VITE_SUPABASE_URL || "";

const SUPABASE_ANON_KEY: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  env.VITE_SUPABASE_ANON_KEY ||
  "";

/**
 * If both vars exist, Supabase is configured.
 * Otherwise, we return a mock client that prevents runtime crashes.
 */
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Generates a mock response when Supabase is not configured.
 * Prevents hard runtime errors during Builder preview or offline sessions.
 */
function failingResponse() {
  return Promise.resolve({
    data: null,
    error: new Error(
      "Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    ),
  });
}

/**
 * Minimal mock implementation of Supabase's `from()` interface.
 * Every method safely returns a Promise that resolves with an error.
 */
function mockFrom() {
  const chainObj: any = {
    maybeSingle: () => failingResponse(),
    single: () => failingResponse(),
  };

  const chainable = () => chainObj;

  chainObj.ilike = chainable;
  chainObj.eq = chainable;
  chainObj.order = chainable;
  chainObj.filter = chainable;
  chainObj.limit = chainable;
  chainObj.match = chainable;
  chainObj.not = chainable;
  chainObj.is = chainable;

  return {
    select: () => chainObj,
    insert: () => failingResponse(),
    update: () => ({ eq: () => failingResponse() }),
    delete: () => ({ eq: () => failingResponse() }),
    upsert: () => failingResponse(),
  } as any;
}

/**
 * Create Supabase client if configured; otherwise provide safe mock.
 */
export const supabase: SupabaseClient | any = SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : { from: () => mockFrom() };

/**
 * Optional helper: quickly test if connection works.
 * Uncomment during debugging.
 *
 * supabase
 *   .from("drivers")
 *   .select("*")
 *   .limit(1)
 *   .then(console.log);
 */

export default supabase;
