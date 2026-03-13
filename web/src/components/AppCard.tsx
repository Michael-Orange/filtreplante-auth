import { useState } from 'react';
import type { AppInfo } from '../types/user';
import { api } from '../lib/api';

interface AppCardProps {
  app: AppInfo;
}

export function AppCard({ app }: AppCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;

    if (app.directLink) {
      window.open(app.url, '_blank');
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.generateSSO(app.id);
      if (response.success && response.redirectUrl) {
        window.location.href = response.redirectUrl;
      }
    } catch (error) {
      console.error('SSO generation failed:', error);
      alert('Erreur lors de la génération du lien SSO');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full min-h-[120px] bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:border-primary hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      <div className="flex flex-col items-center text-center">
        <div className="text-4xl mb-3">{app.icon}</div>
        <h3 className="font-semibold text-gray-900 text-lg mb-1">{app.name}</h3>
        {app.description && (
          <p className="text-sm text-gray-600">{app.description}</p>
        )}
        {isLoading && (
          <p className="text-xs text-primary mt-2">Chargement...</p>
        )}
      </div>
    </button>
  );
}
