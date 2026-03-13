import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { User } from '../types/user';

export function useUsers() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async (): Promise<User[]> => {
      const dbUsers = await api.getAllUsers();
      // Mapper DbUser → User frontend
      return dbUsers.map(u => ({
        id: u.id,
        username: u.username,
        name: u.nom,
        email: u.email || '',
        role: u.role as 'admin' | 'user',
        active: u.actif,
        permissions: {
          stock: u.peut_acces_stock,
          prix: u.peut_acces_prix,
          maintenance: u.peut_admin_maintenance,
          construction: u.peut_acces_construction,
          shelly: u.peut_acces_shelly,
        },
        lastLogin: u.derniere_connexion || undefined,
        createdAt: u.date_creation,
      }));
    },
  });

  const createUserMutation = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.changePassword(id, password),
  });

  return {
    users: data || [],
    isLoading,
    error,
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
}
