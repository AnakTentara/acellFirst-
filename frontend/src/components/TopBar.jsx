import React, { useState, useRef } from 'react';
import { 
  Heart, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Globe, 
  MoreVertical, 
  Camera, 
  Upload, 
  Smile, 
  BatteryCharging, 
  ChevronDown,
  X,
  Zap,
  Code,
  Settings
} from 'lucide-react';
import { isSoundEnabled, toggleSound, playClick, playHeartPop } from '../utils/sound';
import { authApi } from '../services/api';

export default function TopBar({ 
  currentUser, 
  onSwitchUser, 
  profiles, 
  daysTogether, 
  activeDomain, 
  onOpenSettings,
  onSimulateMail,
  onRefresh
}) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);

  // Profile Edit states
  const [selectedMood, setSelectedMood] = useState(currentUser?.mood || '💙 Lagi kangen kamu');
  const [battery, setBattery] = useState(currentUser?.batteryLevel || 100);
  const [nicknameInput, setNicknameInput] = useState(currentUser?.nickname || '');
  const [displayNameInput, setDisplayNameInput] = useState(currentUser?.displayName || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef(null);

  const moodPresets = [
    '💙 Lagi kangen banget',
    '🥰 Bahagia & bersyukur',
    '🌌 Semangat hari ini!',
    '😴 Ngantuk pengen dipeluk',
    '🍱 Laper pengen jajan',
    '🥺 Butuh disemangatin'
  ];

  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) playClick();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setAvatarPreview(uploadEvent.target.result);
      playClick();
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSavingProfile(true);
    try {
      await authApi.updateProfile(currentUser.id, {
        mood: selectedMood,
        batteryLevel: battery,
        nickname: nicknameInput,
        displayName: displayNameInput,
        avatar: avatarPreview
      });
      playHeartPop();
      setShowProfileModal(false);
      onRefresh();
    } catch (err) {
      alert('Gagal menyimpan profil: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const partnerUser = profiles.find(p => p.id !== currentUser?.id) || profiles[1];

  return (
    <header className="glass-panel" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
      {/* Brand & Clean Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0284c7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
          color: '#fff'
        }}>
          <Heart size={20} fill="#fff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
              Acell & Haikal Sanctuary
            </h1>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--brand-blue)', fontWeight: 700 }}>{daysTogether || '...'}</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>@{activeDomain}</span>
          </p>
        </div>
      </div>

      {/* Profiles & Clean Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Partner Status Pill */}
        {partnerUser && (
          <div 
            onClick={() => onSwitchUser(partnerUser)}
            className="glass-card" 
            title={`Ganti ke profil ${partnerUser.display_name}`}
            style={{ padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <img
              src={partnerUser.avatar}
              alt={partnerUser.display_name}
              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ fontSize: '0.78rem', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{partnerUser.display_name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{partnerUser.mood || 'Online'}</div>
            </div>
          </div>
        )}

        {/* Current User Active Button */}
        {currentUser && (
          <div 
            onClick={() => {
              setSelectedMood(currentUser.mood);
              setBattery(currentUser.batteryLevel);
              setNicknameInput(currentUser.nickname);
              setDisplayNameInput(currentUser.displayName);
              setAvatarPreview(currentUser.avatar);
              setShowProfileModal(true);
              playClick();
            }}
            className="glass-card" 
            style={{ 
              padding: '5px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              borderColor: 'rgba(37, 99, 235, 0.4)',
              background: 'rgba(239, 246, 255, 0.9)'
            }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ position: 'absolute', bottom: -2, right: -2, width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', border: '1.5px solid #fff' }} />
            </div>
            <div style={{ fontSize: '0.78rem', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 800, color: 'var(--brand-blue-deep)' }}>
                {currentUser.displayName} <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>({currentUser.batteryLevel}%)</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{currentUser.mood}</div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>
        )}

        {/* Audio Toggle */}
        <button
          onClick={handleSoundToggle}
          className="glass-pill"
          title={soundOn ? 'Matikan Suara' : 'Nyalakan Suara'}
          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
        >
          {soundOn ? <Volume2 size={15} color="var(--brand-blue)" /> : <VolumeX size={15} color="var(--text-muted)" />}
        </button>

        {/* 3-Dots Menu Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            className="glass-pill"
            style={{ padding: '6px 10px' }}
          >
            <MoreVertical size={16} />
          </button>

          {showMenuDropdown && (
            <div 
              className="glass-panel"
              style={{
                position: 'absolute',
                right: 0,
                top: '38px',
                width: '200px',
                padding: '6px',
                zIndex: 1000,
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
              }}
            >
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  onOpenSettings();
                }}
                style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' }}
              >
                <Settings size={14} />
                <span>Domain & SMTP</span>
              </button>

              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  setShowDebugModal(true);
                }}
                style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#0284c7', cursor: 'pointer', textAlign: 'left' }}
              >
                <Zap size={14} />
                <span>Debug & Simulator</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile & Avatar Customizer Modal */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#ffffff', boxShadow: '0 20px 50px rgba(37,99,235,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>Edit Profil & Foto</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Avatar Uploader */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                <img
                  src={avatarPreview}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--brand-blue-light)', boxShadow: '0 4px 12px rgba(37,99,235,0.15)' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--brand-blue)',
                    color: '#fff',
                    border: '2px solid #fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Camera size={14} />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="glass-pill"
                style={{ fontSize: '0.75rem', padding: '4px 12px' }}
              >
                <Upload size={12} />
                Unggah Foto Baru
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nama Lengkap</label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Panggilan Sayang</label>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mood Hari Ini</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {moodPresets.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMood(m)}
                      className={`glass-pill ${selectedMood === m ? 'active' : ''}`}
                      style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  placeholder="Ketik mood custom..."
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Level Baterai Cinta: {battery}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={battery}
                  onChange={(e) => setBattery(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--brand-blue)' }}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="glass-btn glass-btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
              >
                {isSavingProfile ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug & Inbound Simulator Modal */}
      {showDebugModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#0284c7" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>Simulator & Debug Email</h3>
              </div>
              <button onClick={() => setShowDebugModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
              Kirim email simulasi otomatis ke webhook tanpa mengirim email nyata:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => {
                  onSimulateMail('shopee');
                  setShowDebugModal(false);
                }}
                className="glass-pill"
                style={{ padding: '8px 12px', justifyContent: 'center', fontSize: '0.78rem' }}
              >
                📦 Shopee Resi
              </button>
              <button
                onClick={() => {
                  onSimulateMail('tokopedia');
                  setShowDebugModal(false);
                }}
                className="glass-pill"
                style={{ padding: '8px 12px', justifyContent: 'center', fontSize: '0.78rem' }}
              >
                🛍️ Tokopedia
              </button>
              <button
                onClick={() => {
                  onSimulateMail('tiktok');
                  setShowDebugModal(false);
                }}
                className="glass-pill"
                style={{ padding: '8px 12px', justifyContent: 'center', fontSize: '0.78rem' }}
              >
                🎶 TikTok Shop
              </button>
              <button
                onClick={() => {
                  onSimulateMail('love_letter');
                  setShowDebugModal(false);
                }}
                className="glass-pill"
                style={{ padding: '8px 12px', justifyContent: 'center', fontSize: '0.78rem' }}
              >
                💌 Surat Cinta
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
