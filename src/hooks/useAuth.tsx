import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'asm' | 'mr';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  profileError: string | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role: 'admin' | 'asm' | 'mr') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<UserProfile | null>(null);
  const profileRequestId = useRef(0);
  const { toast } = useToast();

  const setCurrentProfile = (nextProfile: UserProfile | null) => {
    profileRef.current = nextProfile;
    setProfile(nextProfile);
  };

  const fetchProfile = async (userId: string): Promise<UserProfile> => {
    const [{ data: userData, error: userError }, { data: roleData, error: roleError }] = await Promise.all([
      supabase.from('users').select('id, name, email').eq('id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId).single(),
    ]);

    if (userError) throw userError;
    if (roleError) throw roleError;

    return { ...userData, role: roleData.role };
  };

  useEffect(() => {
    let mounted = true;

    const loadSessionProfile = (nextSession: Session | null, event?: string) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        profileRequestId.current += 1;
        setCurrentProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      const userId = nextSession.user.id;
      if (event === 'TOKEN_REFRESHED' && profileRef.current?.id === userId) {
        setLoading(false);
        return;
      }

      const requestId = ++profileRequestId.current;
      setCurrentProfile(null);
      setProfileError(null);
      setLoading(true);

      // Defer the profile query so it does not run inside Supabase's auth callback.
      window.setTimeout(async () => {
        try {
          const nextProfile = await fetchProfile(userId);
          if (!mounted || requestId !== profileRequestId.current) return;
          setCurrentProfile(nextProfile);
        } catch (error) {
          console.error('Error fetching profile:', error);
          if (!mounted || requestId !== profileRequestId.current) return;
          setCurrentProfile(null);
          setProfileError('Your sign-in succeeded, but your staff profile could not be loaded. Check your connection or contact an administrator.');
        } finally {
          if (mounted && requestId === profileRequestId.current) setLoading(false);
        }
      }, 0);
    };

    // Subscribe first so sign-in events cannot be missed during initial session lookup.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        loadSessionProfile(nextSession, event);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (!mounted) return;
        if (error) console.error('Error reading saved session:', error);
        loadSessionProfile(currentSession);
      })
      .catch((error: unknown) => {
        console.error('Error reading saved session:', error);
        if (!mounted) return;
        loadSessionProfile(null);
      });

    return () => {
      mounted = false;
      profileRequestId.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    const requestId = ++profileRequestId.current;
    setLoading(true);
    setProfileError(null);
    try {
      const nextProfile = await fetchProfile(user.id);
      if (requestId !== profileRequestId.current) return;
      setCurrentProfile(nextProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (requestId !== profileRequestId.current) return;
      setCurrentProfile(null);
      setProfileError('Your sign-in succeeded, but your staff profile could not be loaded. Check your connection or contact an administrator.');
    } finally {
      if (requestId === profileRequestId.current) setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }

      return { error };
    } catch (error) {
      toast({
        title: "Sign In Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'asm' | 'mr') => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Enhanced password validation
      if (password.length < 8) {
        toast({
          title: "Password Too Short",
          description: "Password must be at least 8 characters long.",
          variant: "destructive",
        });
        return { error: new Error("Password too short") };
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
          },
        },
      });

      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
      }

      return { error };
    } catch (error) {
      toast({
        title: "Sign Up Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Sign Out Error",
        description: "An error occurred while signing out.",
        variant: "destructive",
      });
    }
  };

  const value = {
    user,
    session,
    profile,
    profileError,
    loading,
    refreshProfile,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};