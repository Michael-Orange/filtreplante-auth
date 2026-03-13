import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { User } from '../types/user';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async (): Promise<User | null> => {
      const jwt = await api.me();
      if (!jwt) return null;
      // Mapper JWT payload → User frontend
      return {
        id: jwt.id,
        username: jwt.username,
        name: jwt.nom,
        email: '',
        role: jwt.role as 'admin' | 'user',
        active: true,
        permissions: {
          stock: jwt.apps.includes('stock'),
          prix: jwt.apps.includes('prix'),
          maintenance: jwt.apps.includes('maintenance-admin'),
          construction: jwt.apps.includes('construction'),
          shelly: jwt.apps.includes('shelly-admin'),
        },
        createdAt: '',
      };
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logout = async () => {
    await api.logout();
    queryClient.setQueryData(['auth', 'me'], null);
    queryClient.clear();
  };

  return {
    user: data as User | null | undefined,
    isLoading,
    error,
    logout,
    isAuthenticated: !!data,
    isAdmin: data?.role === 'admin',
  };
}
