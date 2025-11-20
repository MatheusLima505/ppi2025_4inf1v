import { useState, useEffect, createContext } from "react";
import { supabase } from "../utils/supabase";
import { toast, Bounce } from "react-toastify";

export const SessionContext = createContext({
  session: null,
  sessionLoading: false,
  handleSignUp: () => {},
  handleSignIn: () => {},
  handleSignOut: () => {},
});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState(null);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionMessage) {
      toast.success(sessionMessage, {
        position: "top-center",
        autoClose: 5000,
        theme: localStorage.getItem("theme"),
        transition: Bounce,
      });
      setSessionMessage(null);
    }
    if (sessionError) {
      toast.error(sessionError, {
        position: "top-center",
        autoClose: 5000,
        theme: localStorage.getItem("theme"),
        transition: Bounce,
      });
      setSessionError(null);
    }
  }, [sessionMessage, sessionError]);

  async function handleSignUp(email, password, username) {
    setSessionLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            admin: false,
          },
          emailRedirectTo: `${window.location.origin}/signin`,
        },
      });

      if (error) throw error;
      setSessionMessage(
        "Registration successful! Check your email to confirm your account."
      );
      return { success: true };
    } catch (error) {
      setSessionError(error.message);
      return { success: false };
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleSignIn(email, password) {
    setSessionLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.session) {
        setSessionMessage("Sign in successful!");
      }
      return { success: true };
    } catch (error) {
      setSessionError(error.message);
      return { success: false };
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleSignOut() {
    setSessionLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSessionMessage("Sign out successful!");
    } catch (error) {
      setSessionError(error.message);
    } finally {
      setSessionLoading(false);
    }
  }

  const context = {
    session,
    sessionLoading,
    handleSignUp,
    handleSignIn,
    handleSignOut,
  };

  return (
    <SessionContext.Provider value={context}>
      {children}
    </SessionContext.Provider>
  );
}