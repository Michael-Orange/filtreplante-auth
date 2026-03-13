import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import { Layout } from '../components/Layout';
import { UserTable } from '../components/UserTable';
import { UserModal } from '../components/UserModal';
import { PasswordModal } from '../components/PasswordModal';
import type { User } from '../types/user';

export function AdminPage() {
  const { user, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { users, isLoading, updateUser, deleteUser, createUser, changePassword } = useUsers();
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation('/login');
    } else if (!isAuthLoading && user && !isAdmin) {
      setLocation('/apps');
    }
  }, [user, isAuthLoading, isAdmin, setLocation]);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handlePassword = (user: User) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  const handleDelete = (user: User) => {
    deleteUser(user.id);
  };

  const handleToggleActive = (user: User) => {
    updateUser({ id: user.id, data: { active: !user.active } });
  };

  const handleSaveUser = (data: any) => {
    if (selectedUser) {
      // Update existing user
      updateUser({ 
        id: selectedUser.id, 
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          permissions: data.permissions,
        }
      });
    } else {
      // Create new user
      createUser(data);
    }
    setIsUserModalOpen(false);
    setSelectedUser(null);
  };

  const handleChangePassword = (password: string) => {
    if (selectedUser) {
      changePassword({ id: selectedUser.id, password });
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
    }
  };

  if (isAuthLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h2>
            <p className="text-gray-600 mt-1">Gérer les comptes et permissions</p>
          </div>
          <button
            onClick={() => {
              setSelectedUser(null);
              setIsUserModalOpen(true);
            }}
            className="touch-target px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg"
          >
            + Nouvel utilisateur
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-600">
            Chargement des utilisateurs...
          </div>
        ) : (
          <UserTable
            users={users}
            onEdit={handleEdit}
            onPassword={handlePassword}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        )}
      </div>

      <UserModal
        user={selectedUser}
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
      />

      <PasswordModal
        user={selectedUser}
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setSelectedUser(null);
        }}
        onChangePassword={handleChangePassword}
      />
    </Layout>
  );
}
