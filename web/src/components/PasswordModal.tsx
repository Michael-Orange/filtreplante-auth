import { useState, useEffect } from 'react';
import type { User } from '../types/user';
import { api } from '../lib/api';

interface PasswordModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onChangePassword: (password: string) => void;
}

export function PasswordModal({ user, isOpen, onClose, onChangePassword }: PasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadPassword();
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setShowPassword(false);
    }
  }, [isOpen, user]);

  const loadPassword = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await api.getPassword(user.id);
      setCurrentPassword(response.password);
    } catch (error) {
      console.error('Failed to load password:', error);
      alert('Erreur lors du chargement du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = () => {
    if (!newPassword.trim()) {
      alert('Veuillez saisir un nouveau mot de passe');
      return;
    }
    onChangePassword(newPassword);
    setNewPassword('');
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Mot de passe - {user.name}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe actuel
              </label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {isLoading && (
                <p className="text-xs text-gray-500 mt-1">Chargement...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Saisir un nouveau mot de passe..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={!newPassword.trim()}
              className="w-full touch-target px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Changer le mot de passe
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="touch-target px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
