import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'wouter';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">Filtreplante</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                Bonjour, <span className="font-semibold">{user.name}</span>
              </span>
              
              {isAdmin && (
                <button
                  onClick={() => setLocation('/admin')}
                  className="touch-target px-4 py-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  Administration
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="touch-target px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
