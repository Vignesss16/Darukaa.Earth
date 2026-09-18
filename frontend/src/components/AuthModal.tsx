import React, { useState } from 'react';
import { UserRole } from '../types';
import { Key, Mail, User as UserIcon, Globe } from 'lucide-react';

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
  const [password, setPassword] = useState('admin123');
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
        setPassword('admin123');
        setFullName('Operations Admin');
        setRole('admin');
        break;
      case 'analyst':
        setEmail('analyst@darukaa.earth');
        setPassword('analyst123');
        setFullName('Field Analyst');
        setRole('analyst');
        break;
      case 'viewer':
        setEmail('viewer@darukaa.earth');
        setPassword('viewer123');
        setFullName('Stakeholder Viewer');
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
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      className="print:hidden"
    >
      <div
        className="card-container"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #e0e3e5',
          borderRadius: '12px',
          width: '400px',
          padding: '28px 24px',
          boxShadow:
            '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: '#131b2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <Globe size={14} />
            </div>
            <span
              style={{ fontSize: '18px', fontWeight: 700, color: '#191c1e' }}
            >
              Darukaa.Earth
            </span>
          </div>
          <p
            style={{
              fontSize: '12px',
              color: '#45464d',
              marginTop: '2px',
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
              padding: '8px 12px',
              backgroundColor: '#ffdad6',
              border: '1px solid rgba(186, 26, 26, 0.3)',
              color: '#93000a',
              fontSize: '12px',
              borderRadius: '6px',
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
                  color: '#191c1e',
                }}
              >
                Full name
              </label>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <UserIcon
                  size={15}
                  color="#76777d"
                  style={{
                    position: 'absolute',
                    left: '10px',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  required
                  placeholder="Elena Rostova"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  style={{
                    paddingLeft: '32px',
                    height: '34px',
                    borderColor: '#e0e3e5',
                  }}
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
                color: '#191c1e',
              }}
            >
              Email address
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Mail
                size={15}
                color="#76777d"
                style={{
                  position: 'absolute',
                  left: '10px',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="email"
                required
                placeholder="analyst@darukaa.earth"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{
                  paddingLeft: '32px',
                  height: '34px',
                  borderColor: '#e0e3e5',
                }}
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
                color: '#191c1e',
              }}
            >
              Password
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Key
                size={15}
                color="#76777d"
                style={{
                  position: 'absolute',
                  left: '10px',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{
                  paddingLeft: '32px',
                  height: '34px',
                  borderColor: '#e0e3e5',
                }}
              />
            </div>
          </div>

          {isRegister && (
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '4px',
                  color: '#191c1e',
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
                style={{ height: '34px', borderColor: '#e0e3e5' }}
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
              height: '34px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#131b2e',
              borderColor: '#131b2e',
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
            borderTop: '1px solid #e0e3e5',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#76777d',
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
              style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setPresetCredentials('analyst')}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
            >
              Analyst
            </button>
            <button
              type="button"
              onClick={() => setPresetCredentials('viewer')}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
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
              color: '#006a61',
              fontSize: '12px',
              marginTop: '14px',
              cursor: 'pointer',
              fontWeight: 500,
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
