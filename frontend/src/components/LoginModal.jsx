import React, { useState, useEffect, useRef } from 'react';
import { Heart, Sparkles, Delete, Loader2 } from 'lucide-react';
import { playHeartPop, playClick } from '../utils/sound';
import { authApi } from '../services/api';

const PIN_LENGTH = 6;

/**
 * Real login.
 *
 * The old version called `onLoginSuccess(selectedUser)` directly without ever
 * contacting the server — the PIN field was decorative and anyone could walk
 * straight in. Now it calls authApi.login(), which stores a 30-day token that
 * every other request carries.
 */
export default function LoginModal({ isOpen, profiles, onLoginSuccess }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  // profiles arrive asynchronously; the old `useState(profiles[0])` captured
  // an empty array on first render and never recovered.
  useEffect(() => {
    if (!selectedUser && profiles.length > 0) {
      setSelectedUser(profiles.find((p) => p.role === 'boy') || profiles[0]);
    }
  }, [profiles, selectedUser]);

  const doLogin = async (finalPin) => {
    if (!selectedUser || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login(selectedUser.username, finalPin);
      playHeartPop();
      onLoginSuccess(res.user);
      setPin('');
    } catch (err) {
      setError(err.message || 'PIN salah');
      setPin('');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // Auto-submit the moment the 6th digit lands — no extra tap on mobile.
  useEffect(() => {
    if (pin.length === PIN_LENGTH) doLogin(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // Physical keyboard support for desktop.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) setPin((p) => (p.length < PIN_LENGTH ? p + e.key : p));
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (user) => {
    setSelectedUser(user);
    setPin('');
    setError(null);
    playClick();
  };

  const pressKey = (digit) => {
    if (loading) return;
    playClick();
    setPin((p) => (p.length < PIN_LENGTH ? p + digit : p));
  };

  return (
    <div className="login-overlay">
      <div className="glass-panel login-card">
        <div className="login-badge">
          <Heart size={26} fill="#fff" className="pulse-heart" />
        </div>

        <h2 className="login-title">Acell &amp; Haikal Sanctuary</h2>
        <p className="login-subtitle">Pilih siapa yang sedang membuka sanctuary:</p>

        <div className="login-profiles">
          {profiles.map((user) => {
            const isSel = selectedUser?.id === user.id;
            const isBoy = user.role === 'boy';
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className={`login-profile ${isSel ? 'is-selected' : ''} ${isBoy ? 'is-boy' : 'is-girl'}`}
              >
                <img
                  src={user.avatar || ''}
                  alt=""
                  className="login-avatar"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                />
                <div className="login-profile-name">
                  {user.display_name || user.displayName}
                </div>
                <div className="login-profile-role">{user.nickname || (isBoy ? 'Prince 👑' : 'Princess 👑')}</div>
              </button>
            );
          })}
        </div>

        <div className="pin-dots" role="status" aria-label={`${pin.length} dari ${PIN_LENGTH} digit terisi`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? 'is-filled' : ''}`} />
          ))}
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} type="button" className="pin-key" onClick={() => pressKey(String(n))} disabled={loading}>
              {n}
            </button>
          ))}
          <span />
          <button type="button" className="pin-key" onClick={() => pressKey('0')} disabled={loading}>
            0
          </button>
          <button
            type="button"
            className="pin-key pin-key-action"
            onClick={() => { playClick(); setPin((p) => p.slice(0, -1)); }}
            disabled={loading}
            aria-label="Hapus satu digit"
          >
            <Delete size={20} />
          </button>
        </div>

        <div className="login-status">
          {loading ? (
            <><Loader2 size={16} className="spin" /> Membuka sanctuary…</>
          ) : (
            <><Sparkles size={16} /> Masukkan PIN {selectedUser?.display_name || selectedUser?.displayName || ''}</>
          )}
        </div>
      </div>
    </div>
  );
}
