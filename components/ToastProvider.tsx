import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getStyles = (type: Toast['type']) => {
    const base = 'bg-white dark:bg-stone-900 border shadow-2xl';
    switch (type) {
      case 'success': return `${base} border-emerald-500/30`;
      case 'error': return `${base} border-red-500/30`;
      case 'warning': return `${base} border-amber-500/30`;
      default: return `${base} border-[#c5a065]/30`;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl backdrop-blur-xl animate-in slide-in-from-right duration-300 ${getStyles(toast.type)}`}
            onClick={() => removeToast(toast.id)}
          >
            <span className="text-xl">{getIcon(toast.type)}</span>
            <span className="text-sm font-semibold dark:text-white">{toast.message}</span>
            <button 
              className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
