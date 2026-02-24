import {
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from 'react';
import { useReplitAuth, type AuthUser } from '@/hooks/use-auth';
import { apiClient } from '@/lib/apiClient';

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  role: string | null;
  account_type: string | null;
  profile_image_url: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => void;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toProfile(user: AuthUser | null | undefined): Profile | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    company: user.company,
    role: user.role,
    account_type: user.accountType,
    profile_image_url: user.profileImageUrl,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useReplitAuth();

  const profile = toProfile(user);

  const signOut = useCallback(() => {
    localStorage.removeItem('pending_invite_token');
    localStorage.removeItem('pending_profile_data');
    localStorage.removeItem('assessment_org_id');
    localStorage.removeItem('assessment_member_type');
    localStorage.removeItem('pending_assessment_org');
    window.location.href = '/api/logout';
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') };
      try {
        await apiClient.profile.update({
          firstName: updates.first_name ?? undefined,
          lastName: updates.last_name ?? undefined,
          company: updates.company ?? undefined,
          role: updates.role ?? undefined,
          accountType: updates.account_type ?? undefined,
        });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Update failed') };
      }
    },
    [user]
  );

  const refreshProfile = useCallback(() => {}, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading: isLoading, signOut, updateProfile, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
