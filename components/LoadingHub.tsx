import React from 'react';

interface LoadingHubProps {
  isVisible: boolean;
  message?: string;
  currentBatch?: number;
  totalBatches?: number;
}

const LoadingHub: React.FC<LoadingHubProps> = ({
  isVisible,
  message = "Processing...",
  currentBatch,
  totalBatches
}) => {
  if (!isVisible) return null;

  const progress = currentBatch && totalBatches
    ? Math.round((currentBatch / totalBatches) * 100)
    : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-[3rem] p-12 shadow-2xl border border-[#c5a065]/20 flex flex-col items-center gap-6 min-w-[320px]">
        {/* Animated Rings */}
        <div className="loading-hub">
          <div className="loading-ring loading-ring-1"></div>
          <div className="loading-ring loading-ring-2"></div>
          <div className="w-24 h-24 rounded-full bg-[#c5a065]/10 flex items-center justify-center">
            <span className="text-4xl animate-pulse">✨</span>
          </div>
        </div>

        {/* Message */}
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-2">
            {message}
          </p>

          {/* Progress Bar */}
          {progress !== null && (
            <div className="w-48 mt-4">
              <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                <span>Batch {currentBatch} of {totalBatches}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#c5a065] to-[#d4b078] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Skeleton Preview */}
        <div className="w-full space-y-2 mt-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-3 rounded-full bg-slate-200 dark:bg-stone-700 animate-pulse"
              style={{
                width: `${80 - (i * 15)}%`,
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingHub;