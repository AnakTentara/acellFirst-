import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Volume2, VolumeX, Globe, Radio, UserCheck, Smile, BatteryCharging, ChevronDown } from 'lucide-react';
import { isSoundEnabled, toggleSound, playClick } from '../utils/sound';
import { authApi } from '../services/api';

export default function TopBar({ 
  currentUser, 
  onSwitchUser, 
  profiles, 
  daysTogether, 
  activeDomain, 
  onOpenSettings,
  isLiveConnected,
  onRefresh
}) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState(currentUser?.mood || '💖 Lagi kangen kamu');
  const [battery, setBattery] = useState(currentUser?.batteryLevel || 100);

  const moodPresets = [
    '💖 Lagi kangen banget',
    '🥰 Bahagia & bersyukur',
    '✨ Semangat hari ini!',
    '😴 Ngantuk / pengen peluk',
    '🍱 Laper pengen jajan',
    '🥺 Butuh disemangatin'
  ];

  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) playClick();
  };

  const handleSaveMood = async () => {
    if (!currentUser) return;
    try {
      await authApi.updateProfile(currentUser.id, {
        mood: selectedMood,
        batteryLevel: battery
      });
      setShowMoodModal(false);
      onRefresh();
      playClick();
    } catch (err) {
      alert('Gagal update mood: ' + err.message);
    }
  };

  const partnerUser = profiles.find(p => p.id !== currentUser?.id) || profiles[1];

  return (
    <header className="glass-panel" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
      {/* Brand & Together Counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 16px rgba(255, 117, 140, 0.35)',
          color: '#fff'
        }}>
          <Heart size={22} fill="#fff" className="pulse-heart" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>
              Acel & Haikal Sanctuary
            </h1>
            <span style={{
              background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ec 100%)',
              border: '1px solid #ffd1dc',
              color: '#ff4d80',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              ✨ Ekosistem Couple
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#ff5c8a', fontWeight: 700 }}>{daysTogether || '...'}</span>
            <span>•</span>
            <span>Domain: <code style={{ background: 'rgba(0,0,0,0.04)', padding: '1px 5px', borderRadius: '4px' }}>@{activeDomain}</code></span>
          </p>
        </div>
      </div>

      {/* Mood & Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Current User Pill */}
        <div 
          onClick={() => setShowMoodModal(true)}
          className="glass-card" 
          style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          title="Klik untuk ubah status mood kamu"
        >
          <img 
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
            alt={currentUser?.displayName} 
            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff758c' }} 
          />
          <div style={{ fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{currentUser?.displayName || 'Kamu'}</span>
              <span style={{ color: '#ff5c8a', fontSize: '0.75rem' }}>({currentUser?.role === 'boy' ? 'My Boy 💙' : 'My Girl 💖'})</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              {currentUser?.mood || 'Status Aktif'} 🔋 {currentUser?.batteryLevel || 100}%
            </div>
          </div>
          <ChevronDown size={14} color="#888" />
        </div>

        {/* Partner Status Pill */}
        {partnerUser && (
          <div className="glass-card" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.45)' }}>
            <img 
              src={partnerUser.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'} 
              alt={partnerUser.displayName} 
              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3a86ff' }} 
            />
            <div style={{ fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                {partnerUser.displayName} <span style={{ color: '#3a86ff', fontSize: '0.75rem' }}>({partnerUser.role === 'boy' ? 'My Boy 💙' : 'My Girl 💖'})</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                {partnerUser.mood || 'Online'} 🔋 {partnerUser.batteryLevel || 100}%
              </div>
            </div>
          </div>
        )}

        {/* Actions & Utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Switch Profile Button */}
          <button 
            onClick={onSwitchUser}
            className="glass-btn" 
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            title="Ganti Profil (Acel / Haikal)"
          >
            <UserCheck size={16} color="#ff5c8a" />
            <span>Ganti Akun</span>
          </button>

          {/* Sound Toggle */}
          <button 
            onClick={handleSoundToggle}
            className="glass-btn" 
            style={{ padding: '8px', width: '36px', height: '36px' }}
            title={soundOn ? 'Suara Aktif' : 'Suara Dimatikan'}
          >
            {soundOn ? <Volume2 size={16} color="#ff5c8a" /> : <VolumeX size={16} color="#999" />}
          </button>

          {/* Settings / Domain Manager */}
          <button 
            onClick={onOpenSettings}
            className="glass-btn" 
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            title="Domain & Ecosystem Settings"
          >
            <Globe size={16} color="#3a86ff" />
            <span>Domain</span>
          </button>

          {/* Live Sync Status */}
          <div 
            className="glass-pill" 
            style={{ 
              padding: '6px 10px', 
              fontSize: '0.75rem',
              color: isLiveConnected ? '#059669' : '#dc2626',
              background: isLiveConnected ? '#ecfdf5' : '#fef2f2',
              borderColor: isLiveConnected ? '#a7f3d0' : '#fecaca'
            }}
            title={isLiveConnected ? 'Real-time Server-Sent Events terhubung' : 'Reconnecting to Server'}
          >
            <Radio size={12} className={isLiveConnected ? 'pulse-heart' : ''} />
            <span>{isLiveConnected ? 'Live Sync' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Mood Edit Modal */}
      {showMoodModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>✨ Update Status & Mood Kamu</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Status ini akan langsung muncul di widget layar pacarmu!
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Pilih Mood:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {moodPresets.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedMood(m)}
                    className="glass-pill"
                    style={{
                      padding: '8px 12px',
                      justifyContent: 'flex-start',
                      background: selectedMood === m ? '#fff0f5' : '#f9f9f9',
                      borderColor: selectedMood === m ? '#ff5c8a' : '#eee',
                      color: selectedMood === m ? '#ff5c8a' : '#333'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Atau Tulis Status Sendiri:
              </label>
              <input 
                type="text" 
                className="glass-input" 
                value={selectedMood} 
                onChange={(e) => setSelectedMood(e.target.value)} 
                placeholder="Contoh: Lagi otw jemput kamu 🛵"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Battery Level: {battery}%
              </label>
              <input 
                type="range" 
                min="5" 
                max="100" 
                value={battery} 
                onChange={(e) => setBattery(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: '#ff5c8a' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setShowMoodModal(false)} 
                className="glass-btn"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleSaveMood} 
                className="glass-btn glass-btn-primary"
              >
                Simpan Status 💕
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
