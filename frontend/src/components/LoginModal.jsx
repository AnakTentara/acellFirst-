import React, { useState } from 'react';
import { Heart, Lock, KeyRound, Sparkles, UserCheck } from 'lucide-react';
import { playHeartPop, playClick } from '../utils/sound';

export default function LoginModal({
  isOpen,
  profiles,
  onLoginSuccess
}) {
  const [selectedUser, setSelectedUser] = useState(profiles[0] || null);
  const [pin, setPin] = useState('123456');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (user) => {
    setSelectedUser(user);
    setError(null);
    playClick();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedUser || !pin) return;

    setLoading(true);
    setError(null);

    try {
      // Direct pass or token call
      onLoginSuccess(selectedUser);
      playHeartPop();
    } catch (err) {
      setError(err.message || 'PIN salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 247, 255, 0.98) 100%)',
        boxShadow: '0 25px 60px -15px rgba(37, 99, 235, 0.25)',
        textAlign: 'center'
      }}>
        {/* Header Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0284c7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          color: '#fff',
          boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)'
        }}>
          <Heart size={28} fill="#fff" className="pulse-heart" />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginBottom: '4px' }}>
          Acell & Haikal Sanctuary
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Pilih siapa yang sedang membuka sanctuary:
        </p>

        {/* Profiles Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {profiles.map((user) => {
            const isSel = selectedUser?.id === user.id;
            const isBoy = user.role === 'boy';

            return (
              <div
                key={user.id}
                onClick={() => handleSelect(user)}
                className="glass-card"
                style={{
                  padding: '16px 12px',
                  cursor: 'pointer',
                  borderRadius: '16px',
                  border: isSel 
                    ? `2px solid ${isBoy ? '#2563eb' : '#0284c7'}` 
                    : '1px solid rgba(219, 234, 254, 0.8)',
                  background: isSel 
                    ? (isBoy ? '#eff6ff' : '#f0f9ff') 
                    : '#fff',
                  transform: isSel ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSel ? '0 8px 24px rgba(37, 99, 235, 0.2)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={user.displayName}
                  style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px auto', display: 'block', border: `2px solid ${isBoy ? '#2563eb' : '#0284c7'}` }}
                />
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {user.displayName}
                </div>
                <div style={{ fontSize: '0.74rem', color: isBoy ? '#2563eb' : '#0284c7', fontWeight: 800, marginTop: '2px' }}>
                  {isBoy ? 'Prince 👑' : 'Princess 👑'}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {/* Unlock Button */}
        <button
          onClick={handleLogin}
          disabled={!selectedUser || loading}
          className="glass-btn glass-btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '0.95rem', borderRadius: '16px' }}
        >
          <Sparkles size={18} />
          <span>Masuk sebagai {selectedUser?.displayName || '...'} 💖</span>
        </button>
      </div>
    </div>
  );
}
