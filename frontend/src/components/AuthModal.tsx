import React, { useState } from 'react';
import { UserRole } from '../types';
import { Key, Mail, User as UserIcon } from 'lucide-react';

interface AuthModalProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLogin,
  onRegister,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('admin@darukaa.earth');
  const [password, setPassword] = useState('Password123!');
  const [fullName, setFullName] = useState('Operations Admin');
  const [role, setRole] = useState<UserRole>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await onRegister(email, password, fullName, role);
      } else {
        await onLogin(email, password);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Authentication failed.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPresetCredentials = (presetRole: UserRole) => {
    switch (presetRole) {
      case 'admin':
        setEmail('admin@darukaa.earth');
        setPassword('Password123!');
        setFullName('Operations Admin');
        setRole('admin');
        break;
      case 'analyst':
        setEmail('analyst@darukaa.earth');
        setPassword('Password123!');
        setFullName('Field Analyst');
        setRole('analyst');
        break;
      case 'viewer':
        setEmail('viewer@darukaa.earth');
        setPassword('Password123!');
        setFullName('Read Only Auditor');
        setRole('viewer');
        break;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(28, 43, 34, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-line)',
          width: '420px',
          padding: '32px 28px',
          boxShadow: '0 8px 32px rgba(28, 43, 34, 0.16)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            className="heading-serif"
            style={{
              fontSize: '24px',
              color: 'var(--color-canopy)',
              fontWeight: 700,
            }}
          >
            Darukaa.Earth
          </div>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-ink)',
              opacity: 0.7,
              marginTop: '4px',
            }}
          >
            {isRegister
              ? 'Register new ops console account'
              : 'Sign in to ops console'}
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(181, 86, 60, 0.1)',
              border: '1px solid var(--color-clay)',
              color: 'var(--color-clay)',
              fontSize: '12px',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                Full name
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '10px',
                    opacity: 0.5,
                  }}
                />
                <input
                  type="text"
                  required
                  placeholder="Elena Rostova"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '32px' }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '10px',
                  opacity: 0.5,
                }}
              />
              <input
                type="email"
                required
                placeholder="analyst@darukaa.earth"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Key
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '10px',
                  opacity: 0.5,
                }}
              />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>

          {isRegister && (
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                System role enum
              </label>
              <select
                value={role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setRole(e.target.value as UserRole)
                }
                className="input-field"
              >
                <option value="admin">Admin (full CRUD & deletion)</option>
                <option value="analyst">Analyst (create & edit sites)</option>
                <option value="viewer">Viewer (read-only audit access)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '10px',
              marginBottom: '16px',
            }}
          >
            {isSubmitting
              ? 'Authenticating...'
              : isRegister
                ? 'Create account'
                : 'Sign in to console'}
          </button>
        </form>

        {/* Demo Quick Presets */}
        <div
          style={{
            paddingTop: '16px',
            borderTop: '1px solid var(--color-line)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-ink)',
              opacity: 0.6,
              marginBottom: '8px',
            }}
          >
            Quick demo role presets:
          </div>
          <div
            style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}
          >
            <button
              type="button"
              onClick={() => setPresetCredentials('admin')}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setPresetCredentials('analyst')}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Analyst
            </button>
            <button
              type="button"
              onClick={() => setPresetCredentials('viewer')}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Viewer
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-canopy)',
              fontSize: '12px',
              marginTop: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : 'Need a new account? Register user'}
          </button>
        </div>
      </div>
    </div>
  );
};
