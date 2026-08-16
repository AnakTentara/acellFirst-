import React, { useState } from 'react';
import { Send, Sparkles, X, Mail, Heart, Tag } from 'lucide-react';
import { playClick, playChime } from '../utils/sound';

export default function ComposeMailModal({
  isOpen,
  onClose,
  onSend,
  activeDomain,
  currentUser
}) {
  const [fromAlias, setFromAlias] = useState(currentUser?.role === 'girl' ? 'acell' : 'us');
  const [to, setTo] = useState(`us@${activeDomain}`);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const aliases = [
    { id: 'us', label: `us@${activeDomain}`, desc: 'Email Kita Berdua / Couple' },
    { id: 'shopping', label: `shopping@${activeDomain}`, desc: 'Khusus Belanja & Resi' },
    { id: 'etall', label: `etall@${activeDomain}`, desc: 'Belanja & Layanan Bersama' },
    { id: 'acell', label: `acell@${activeDomain}`, desc: 'Email Pribadi Princess Acell' }
  ];

  const presets = [
    'Paket kejutan manis sedang menuju ke rumahmu! 🎁',
    'Jangan lupa senyum & makan teratur ya kesayanganku 🍱💖',
    'List barang impian date kita berikutnya! 📸',
    'Cuma mau ngingetin kalau aku cinta banget sama kamu ✨'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!to || !subject || !body) return;

    setIsSending(true);
    try {
      await onSend({
        fromAlias,
        to,
        subject,
        text: body,
        html: `<div style="font-family: sans-serif; padding: 24px; background: #fffafc; border-radius: 16px; border: 1px solid #ffd1dc; color: #333; line-height: 1.6;">
          <h3 style="color: #ff5c8a; margin-top: 0;">${subject}</h3>
          <p style="white-space: pre-wrap;">${body}</p>
          <hr style="border: none; border-top: 1px solid #ffd1dc; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888; margin: 0;">
            Dikirim dengan cinta dari <b>${currentUser?.displayName || 'Pasanganmu'}</b> lewat <b>Acel & Haikal Sanctuary</b> 💖
          </p>
        </div>`,
        fromName: `${currentUser?.displayName || 'Sanctuary'} (${currentUser?.nickname || 'Love'})`
      });

      playChime();
      onClose();
      setSubject('');
      setBody('');
    } catch (err) {
      alert('Gagal mengirim: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sheet-scrim" style={{
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
      <form onSubmit={handleSubmit} className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '26px',
        background: '#fff',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff6b9d 0%, #ff5c8a 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Send size={16} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Tulis Pesan / Email Baru
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#999' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Sender Alias Selector */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Kirim Sebagai (Alamat Email):
            </label>
            <select
              className="glass-input"
              value={fromAlias}
              onChange={(e) => setFromAlias(e.target.value)}
              style={{ fontWeight: 700, color: '#ff5c8a' }}
            >
              {aliases.map(a => (
                <option key={a.id} value={a.id}>
                  {a.label} — ({a.desc})
                </option>
              ))}
            </select>
          </div>

          {/* Recipient */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Kepada (Email Tujuan):
            </label>
            <input
              type="text"
              required
              className="glass-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={`us@${activeDomain} atau email tujuan`}
            />
          </div>

          {/* Subject with Presets */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Subjek Email:
            </label>
            <input
              type="text"
              required
              className="glass-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Tuliskan judul pesan..."
            />

            {/* Presets */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginTop: '6px', paddingBottom: '2px' }}>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSubject(p)}
                  className="glass-pill"
                  style={{ fontSize: '0.7rem', padding: '3px 8px', whiteSpace: 'nowrap' }}
                >
                  {p.slice(0, 30)}...
                </button>
              ))}
            </div>
          </div>

          {/* Message Body */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Isi Pesan:
            </label>
            <textarea
              required
              rows={5}
              className="glass-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ketik pesan manis untuk pasanganmu..."
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            className="glass-btn"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSending}
            className="glass-btn glass-btn-primary"
          >
            <Send size={15} />
            <span>{isSending ? 'Mengirim...' : 'Kirim Sekarang ✨'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
