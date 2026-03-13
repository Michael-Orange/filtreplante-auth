import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { AppCard } from '../components/AppCard';
import { api } from '../lib/api';
import type { AppInfo } from '../types/user';

export function AppsPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user) {
      loadApps();
    }
  }, [user]);

  const loadApps = async () => {
    try {
      const response = await api.getApps();
      setApps(response); // backend retourne un tableau directement
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setIsLoadingApps(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Mes Applications</h2>
          <p className="text-gray-600 mt-1">Sélectionnez une application pour y accéder</p>
        </div>

        {isLoadingApps ? (
          <div className="text-center py-12 text-gray-600">
            Chargement des applications...
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Aucune application disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
