import React, { useState, useCallback } from 'react';
import { useUser } from '../contexts/UserProvider';

export default function LoginScreen() {
    const { setUserName } = useUser();
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            setError('Please enter at least 2 characters');
            return;
        }
        if (trimmed.length > 30) {
            setError('Name must be 30 characters or less');
            return;
        }
        setUserName(trimmed);
    }, [name, setUserName]);

    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">🏨</div>
                    <h1 className="login-title">Gilpin Hotel</h1>
                    <p className="login-subtitle">Arrival Management Tool</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <label htmlFor="login-name" className="login-label">
                        Enter your name
                    </label>
                    <input
                        id="login-name"
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(''); }}
                        placeholder="e.g. Sarah, Tom, Reception..."
                        className="login-input"
                        autoFocus
                        autoComplete="off"
                        maxLength={30}
                    />
                    {error && <p className="login-error">{error}</p>}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={name.trim().length < 2}
                    >
                        Sign In
                    </button>
                </form>

                <p className="login-footer">
                    Your name will appear on all updates, notes, and messages.
                </p>
            </div>

            <style>{`
        .login-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          margin: 1rem;
          padding: 2.5rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(191, 155, 96, 0.3);
          border-radius: 20px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-logo {
          font-size: 3rem;
          margin-bottom: 0.5rem;
          filter: drop-shadow(0 4px 8px rgba(191, 155, 96, 0.3));
        }

        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #bf9b60;
          margin: 0;
          letter-spacing: 0.5px;
        }

        .login-subtitle {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0.25rem 0 0 0;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .login-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        .login-input {
          width: 100%;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(191, 155, 96, 0.25);
          border-radius: 12px;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .login-input:focus {
          border-color: #bf9b60;
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 0 3px rgba(191, 155, 96, 0.15);
        }

        .login-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .login-error {
          color: #ff6b6b;
          font-size: 0.8rem;
          margin: 0;
        }

        .login-button {
          width: 100%;
          padding: 0.875rem;
          margin-top: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #1a1a2e;
          background: linear-gradient(135deg, #bf9b60, #d4af72);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.5px;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(191, 155, 96, 0.35);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .login-footer {
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.35);
          margin: 1.5rem 0 0 0;
          line-height: 1.4;
        }
      `}</style>
        </div>
    );
}
