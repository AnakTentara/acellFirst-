import React, { useState } from 'react';
import { 
  Heart, 
  Lock, 
  Unlock, 
  Music, 
  Calendar, 
  Send, 
  Sparkles, 
  Smile, 
  Clock, 
  Plus,
  Play,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playHeartPop, playChime, playClick } from '../utils/sound';

export default function LoveLetters({
  letters,
  currentUser,
  onSendLetter,
  onOpenLetter
}) {
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [showWriteModal, setShowWriteModal] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newMusic, setNewMusic] = useState('');
  const [newColor, setNewColor] = useState('#ff6b9d');
  const [isLocked, setIsLocked] = useState(false);
  const [unlockDate, setUnlockDate] = useState('');

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ff5c8a', '#ff9ebb', '#ffd1dc', '#ffb703', '#ffffff']
      });
    } catch (e) {}
  };

  const handleOpenLetterClick = async (letter) => {
    if (letter.is_currently_locked === 1) {
      alert('⏳ Surat ini masih terkunci di dalam kapsul waktu!');
      return;
    }

    setSelectedLetter(letter);
    playHeartPop();
    triggerConfetti();

    if (!letter.is_opened) {
      await onOpenLetter(letter.id, '💖');
    }
  };

  const handleReactionClick = async (emoji) => {
    if (!selectedLetter) return;
    playHeartPop();
    triggerConfetti();
    await onOpenLetter(selectedLetter.id, emoji);
    setSelectedLetter(prev => ({ ...prev, reaction: emoji, is_opened: 1 }));
  };

  const handleSaveLetter = async (e) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    const recipientId = currentUser?.role === 'boy' ? 'user_acel' : 'user_haikal';

    await onSendLetter({
      authorId: currentUser?.id || 'user_haikal',
      recipientId,
      title: newTitle,
      content: newContent,
      musicUrl: newMusic,
      themeColor: newColor,
      isLocked,
      unlockDate: isLocked ? unlockDate : null
    });

    setShowWriteModal(false);
    setNewTitle('');
    setNewContent('');
    setNewMusic('');
    setIsLocked(false);
    setUnlockDate('');
    playChime();
    triggerConfetti();
  };

  const formatCountdown = (targetDateStr) => {
    if (!targetDateStr) return 'Terkunci';
    const target = new Date(targetDateStr);
    const now = new Date();
    const diff = target - now;
    if (diff <= 0) return 'Siap Dibuka!';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} Hari ${hours} Jam Lagi`;
  };

  const colorPresets = ['#ff6b9d', '#8338ec', '#3a86ff', '#06d6a0', '#ffb703', '#ff006e'];

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💌 Surat Cinta & Kapsul Waktu</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Kirim pesan romantis privat atau kunci surat rahasia untuk dibuka saat tanggal anniversary/kejutan ✨
          </p>
        </div>

        <button
          onClick={() => {
            playClick();
            setShowWriteModal(true);
          }}
          className="glass-btn glass-btn-primary"
          style={{ padding: '10px 18px', fontSize: '0.88rem' }}
        >
          <Plus size={16} />
          <span>Tulis Surat Baru</span>
        </button>
      </div>

      {/* Letters Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
        {letters.map((letter) => {
          const isLockedNow = letter.is_currently_locked === 1;

          return (
            <div
              key={letter.id}
              onClick={() => handleOpenLetterClick(letter)}
              className="glass-card"
              style={{
                padding: '20px',
                cursor: isLockedNow ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '190px',
                borderLeft: `5px solid ${letter.theme_color || '#ff6b9d'}`,
                background: isLockedNow 
                  ? 'linear-gradient(135deg, rgba(245, 240, 255, 0.7) 0%, rgba(255, 255, 255, 0.8) 100%)' 
                  : 'rgba(255, 255, 255, 0.75)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={letter.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={letter.author_name}
                      style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {letter.author_name}
                    </span>
                  </div>

                  {isLockedNow ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#f3e8ff',
                      color: '#7e22ce',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}>
                      <Lock size={12} />
                      <span>{formatCountdown(letter.unlock_date)}</span>
                    </span>
                  ) : letter.reaction ? (
                    <span style={{ fontSize: '1.2rem' }}>{letter.reaction}</span>
                  ) : letter.is_opened ? (
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>✓ Telah Dibaca</span>
                  ) : (
                    <span style={{
                      background: '#fff0f5',
                      color: '#ff5c8a',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}>
                      ✨ Baru
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.3 }}>
                  {letter.title}
                </h3>

                <p style={{
                  fontSize: '0.84rem',
                  color: isLockedNow ? 'var(--text-muted)' : 'var(--text-secondary)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  fontStyle: isLockedNow ? 'italic' : 'normal'
                }}>
                  {letter.content}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.04)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{new Date(letter.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {letter.music_url && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff5c8a', fontWeight: 600 }}>
                    <Music size={13} />
                    <span>Ada Lagu Romantis 🎶</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Letter Reader Modal */}
      {selectedLetter && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            padding: '30px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 245, 250, 0.98) 100%)',
            border: `2px solid ${selectedLetter.theme_color || '#ffd1dc'}`,
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={selectedLetter.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={selectedLetter.author_name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Surat cinta dari</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedLetter.author_name} 💕</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLetter(null)}
                className="glass-btn"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Tutup
              </button>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: selectedLetter.theme_color || '#ff5c8a', marginBottom: '16px' }}>
              {selectedLetter.title}
            </h2>

            {/* Letter Content Styled as Aesthetic Note */}
            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 180, 205, 0.3)',
              boxShadow: '0 4px 20px rgba(220, 180, 205, 0.15)',
              fontSize: '1.05rem',
              lineHeight: 1.8,
              color: '#333',
              fontFamily: 'var(--font-sans)',
              whiteHeight: 'pre-wrap',
              maxHeight: '340px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {selectedLetter.content}
            </div>

            {/* Reaction Picker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Beri Reaksi:</span>
                {['💖', '🥰', '🥺', '✨', '💐'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji)}
                    style={{
                      fontSize: '1.3rem',
                      background: selectedLetter.reaction === emoji ? '#fff0f5' : 'transparent',
                      border: selectedLetter.reaction === emoji ? '1px solid #ff5c8a' : 'none',
                      borderRadius: '8px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {selectedLetter.music_url && (
                <a
                  href={selectedLetter.music_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-pill"
                  style={{ background: '#1db954', color: '#fff', borderColor: '#1db954', fontSize: '0.78rem' }}
                >
                  <Music size={13} />
                  <span>Putar Lagu di Spotify</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Write Letter Modal */}
      {showWriteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '16px'
        }}>
          <form onSubmit={handleSaveLetter} className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>💌 Tulis Surat Cinta & Kapsul Waktu</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Surat ini akan tersimpan rapi dan bisa diberi countdown kunci waktu.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Judul Surat *</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  placeholder="Contoh: Untuk Pacar Tercantikku 🌸"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Isi Pesan Romantis *</label>
                <textarea
                  required
                  rows={5}
                  className="glass-input"
                  placeholder="Tuliskan semua perasaan dan hal manis untuk pasanganmu..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Link Lagu Spotify (Opsional)</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="https://open.spotify.com/track/..."
                  value={newMusic}
                  onChange={(e) => setNewMusic(e.target.value)}
                />
              </div>

              {/* Color Theme Selector */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Pilih Warna Tema:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: c,
                        border: newColor === c ? '3px solid #333' : '2px solid #fff',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Time Capsule Lock Toggle */}
              <div style={{ background: '#fcf8ff', padding: '12px', borderRadius: '12px', border: '1px solid #eed8ff' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={isLocked}
                    onChange={(e) => setIsLocked(e.target.checked)}
                    style={{ accentColor: '#8338ec', width: '16px', height: '16px' }}
                  />
                  <span>⏳ Kunci sebagai Kapsul Waktu (Time Capsule)</span>
                </label>

                {isLocked && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Bisa Dibuka Pada Tanggal & Waktu:
                    </label>
                    <input
                      type="datetime-local"
                      required={isLocked}
                      className="glass-input"
                      value={unlockDate}
                      onChange={(e) => setUnlockDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowWriteModal(false)}
                className="glass-btn"
              >
                Batal
              </button>
              <button
                type="submit"
                className="glass-btn glass-btn-primary"
              >
                Kirim Surat 💌
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
