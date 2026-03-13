import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import type { PublicUser } from '../types/user';

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.getPublicUsers();
      setUsers(response); // backend retourne un tableau directement
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUsername || !password) {
      setError('Veuillez sélectionner un utilisateur et saisir le mot de passe');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.login(selectedUsername, password);
      
      if (response.success && response.user) {
        // Check for redirect parameter
        const urlParams = new URLSearchParams(window.location.search);
        const redirectApp = urlParams.get('redirect');
        
        if (redirectApp) {
          // Generate SSO token and redirect to app
          try {
            const ssoResponse = await api.generateSSO(redirectApp);
            if (ssoResponse.success && ssoResponse.redirectUrl) {
              window.location.href = ssoResponse.redirectUrl;
              return;
            }
          } catch (ssoError) {
            console.error('SSO generation failed:', ssoError);
          }
        }
        
        // Default redirect to apps page
        setLocation('/apps');
      } else {
        setError('Identifiants invalides');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Filtreplante</h1>
          <p className="text-gray-600">Portail d'authentification</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sélectionnez votre nom
            </label>
            <select
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              required
              className="w-full touch-target px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">-- Choisir --</option>
              {users.map((user) => (
                <option key={user.username} value={user.username}>
                  {user.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full touch-target px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full touch-target px-4 py-3 text-base font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
