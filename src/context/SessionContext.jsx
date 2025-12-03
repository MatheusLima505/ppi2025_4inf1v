import { createContext, useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [profile, setProfile] = useState(null); // username + isadmin

  useEffect(() => {
    // Verifica sessão atual
    const current = supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setSessionLoading(false);
    });

    // Listener para login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // ---- Busca o perfil na tabela "profiles"
  async function fetchProfile(userId) {
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("username, admin")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Erro ao carregar perfil:", error);
      return;
    }

    setProfile(data);
    console.log("DEBUG PROFILE:", data);
    console.log("TIPO ADMIN:", typeof data.admin);

  }

  // ---- Logout
  async function handleSignOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        sessionLoading,
        profile,
        isAdmin: profile?.isadmin === true,
        handleSignOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
