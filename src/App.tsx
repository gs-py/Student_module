import { useEffect, useState } from "react";
import supabase from "./supabase";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { Session } from "@supabase/supabase-js";
import { Toaster } from "react-hot-toast";

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return session ? (
    <>  <Dashboard user={session.user} />
     <Toaster position="top-right" /></>
  
  ) : (
      <Login />
      
  );
}

export default App;
