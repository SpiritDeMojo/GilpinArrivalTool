import React from 'react';
import { GILPIN_LOGO_URL } from '../constants';

interface LoadingHubProps {
  isVisible: boolean;
  message: string;
}

const LoadingHub: React.FC<LoadingHubProps> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[5000] flex flex-col items-center justify-center text-white text-center p-12 animate-in fade-in duration-500">
      <div className="loading-hub mb-12">
        <div className="loading-ring loading-ring-1"></div>
        <div className="loading-ring loading-ring-2"></div>
        <img src={GILPIN_LOGO_URL} alt="Gilpin" className="w-[80px] z-10 animate-pulse" />
      </div>
      <h2 className="heading-font text-4xl font-black tracking-tighter uppercase leading-none mb-3">Loading</h2>
      <p className="text-[#c5a065] font-black uppercase tracking-[0.6em] text-[10px] animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingHub;