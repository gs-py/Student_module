import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wuzropprhzffzaxvtokc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1enJvcHByaHpmZnpheHZ0b2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMDQ5NjQsImV4cCI6MjA1NTc4MDk2NH0.FUNucDHZa4JdTFAoBeheTfpkRhsvWAYxhYiNY-CnlOQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
