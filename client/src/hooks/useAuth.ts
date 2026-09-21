import { useAuthStore } from '../store/authStore';

/** Thin selector hook over authStore — the public surface screens should use. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);
  const linkGuestToAccount = useAuthStore((s) => s.linkGuestToAccount);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);
  const updateUser = useAuthStore((s) => s.updateUser);

  return {
    user,
    isAuthenticated,
    isGuest,
    isLoading,
    error,
    login,
    register,
    loginAsGuest,
    linkGuestToAccount,
    logout,
    clearError,
    updateUser,
  };
}
