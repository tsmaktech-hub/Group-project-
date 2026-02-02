
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  onLogout?: () => void;
  showLogout?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, onLogout, showLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="fas fa-id-badge text-2xl"></i>
            <h1 className="text-xl font-bold tracking-tight">AttendX</h1>
          </div>
          {title && <span className="hidden md:block font-medium text-blue-100">{title}</span>}
          <div className="flex items-center space-x-4">
            {showLogout && (
              <button 
                onClick={onLogout}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>
      <footer className="bg-white border-t py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} AttendX Institutional System. Powered by AI.
        </div>
      </footer>
    </div>
  );
};
