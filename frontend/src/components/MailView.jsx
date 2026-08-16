import React, { useState } from 'react';
import { 
  Search, 
  Star, 
  Trash2, 
  ShoppingBag, 
  Heart, 
  User, 
  Mail, 
  ExternalLink, 
  Copy, 
  Check, 
  Truck, 
  Clock, 
  DollarSign,
  Sparkles,
  Inbox
} from 'lucide-react';
import { playClick, playHeartPop } from '../utils/sound';

export default function MailView({
  emails,
  selectedEmail,
  onSelectEmail,
  onToggleStar,
  onDeleteMail,
  currentUser,
  shoppingItem
}) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedResi, setCopiedResi] = useState(false);

  const categories = [
    { id: 'all', label: 'Semua', icon: Inbox },
    { id: 'shopping', label: '🛍️ Belanja', icon: ShoppingBag },
    { id: 'love', label: '💌 Surat Cinta', icon: Heart },
    { id: 'personal', label: '👤 Personal', icon: User },
    { id: 'starred', label: '⭐ Berbintang', icon: Star }
  ];

  const filteredEmails = emails.filter((mail) => {
    // Category match
    if (filterCategory === 'starred') {
      if (mail.is_starred !== 1) return false;
    } else if (filterCategory !== 'all') {
      if (mail.category !== filterCategory) return false;
    }

    // Search match
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchSub = (mail.subject || '').toLowerCase().includes(term);
      const matchFrom = (mail.from_name || mail.from_address || '').toLowerCase().includes(term);
      const matchBody = (mail.text_body || '').toLowerCase().includes(term);
      if (!matchSub && !matchFrom && !matchBody) return false;
    }

    return true;
  });

  const handleCopyResi = (resi) => {
    if (!resi) return;
    navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    playClick();
    setTimeout(() => setCopiedResi(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatRupiah = (num) => {
    if (!num) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px', height: '100%' }}>
      {/* Left List Pane */}
      <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', minHeight: '600px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="glass-input"
            style={{ paddingLeft: '36px', paddingRight: '12px', fontSize: '0.85rem' }}
            placeholder="Cari email, resi, pengirim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                playClick();
                setFilterCategory(cat.id);
              }}
              className={`glass-pill ${filterCategory === cat.id ? 'active' : ''}`}
              style={{ fontSize: '0.78rem', padding: '5px 10px', whiteSpace: 'nowrap' }}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Email Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {filteredEmails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <Mail size={36} color="#ffd1dc" style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Tidak ada email</p>
              <p style={{ fontSize: '0.75rem' }}>Gunakan simulator di sidebar untuk tes email masuk</p>
            </div>
          ) : (
            filteredEmails.map((mail) => {
              const isSelected = selectedEmail?.id === mail.id;
              const isRead = currentUser?.role === 'boy' ? mail.is_read_by_boy : mail.is_read_by_girl;

              let badgeBg = '#f0f5ff';
              let badgeColor = '#3a86ff';
              let badgeText = 'General';

              if (mail.category === 'shopping') {
                badgeBg = '#fff0eb';
                badgeColor = '#ee4d2d';
                badgeText = '🛍️ Belanja';
              } else if (mail.category === 'love') {
                badgeBg = '#fff0f5';
                badgeColor = '#ff5c8a';
                badgeText = '💌 Surat Cinta';
              } else if (mail.category === 'personal') {
                badgeBg = '#f6f0ff';
                badgeColor = '#8338ec';
                badgeText = '👤 Personal';
              }

              return (
                <div
                  key={mail.id}
                  onClick={() => {
                    playClick();
                    onSelectEmail(mail);
                  }}
                  className="glass-card"
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    position: 'relative',
                    borderColor: isSelected ? 'rgba(255, 92, 138, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                    background: isSelected 
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 240, 246, 0.95) 100%)' 
                      : !isRead ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)',
                    boxShadow: isSelected ? '0 6px 20px rgba(255, 92, 138, 0.18)' : 'none'
                  }}
                >
                  {!isRead && (
                    <span style={{
                      position: 'absolute',
                      left: '4px',
                      top: '14px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#ff5c8a'
                    }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: !isRead ? 800 : 600,
                      color: 'var(--text-main)',
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {mail.from_name || mail.from_address}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatDate(mail.created_at)}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: !isRead ? 700 : 500,
                    color: !isRead ? '#000' : 'var(--text-secondary)',
                    marginBottom: '6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {mail.subject}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{
                      background: badgeBg,
                      color: badgeColor,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      fontWeight: 700
                    }}>
                      {badgeText}
                    </span>

                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.03)', padding: '2px 6px', borderRadius: '4px' }}>
                      to: {mail.alias_name}@
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Detail Pane */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
        {selectedEmail ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
            {/* Header / Actions */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginBottom: '6px' }}>
                  {selectedEmail.subject}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <div>
                    Dari: <b>{selectedEmail.from_name || selectedEmail.from_address}</b> &lt;{selectedEmail.from_address}&gt;
                  </div>
                  <span>•</span>
                  <div>
                    Kepada: <code style={{ background: '#fff0f5', color: '#ff5c8a', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{selectedEmail.to_address}</code>
                  </div>
                  <span>•</span>
                  <span>{formatDate(selectedEmail.created_at)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    playHeartPop();
                    onToggleStar(selectedEmail.id);
                  }}
                  className="glass-btn"
                  style={{ padding: '8px', width: '36px', height: '36px' }}
                  title="Tandai Bintang"
                >
                  <Star size={18} color={selectedEmail.is_starred === 1 ? '#ffb703' : '#888'} fill={selectedEmail.is_starred === 1 ? '#ffb703' : 'none'} />
                </button>
                <button
                  onClick={() => {
                    playClick();
                    onDeleteMail(selectedEmail.id);
                  }}
                  className="glass-btn"
                  style={{ padding: '8px', width: '36px', height: '36px' }}
                  title="Hapus / Arsipkan"
                >
                  <Trash2 size={18} color="#e63946" />
                </button>
              </div>
            </div>

            {/* Smart Shopping Breakout Card (If Detected) */}
            {shoppingItem && (
              <div className="glass-card" style={{
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(255, 245, 240, 0.85) 0%, rgba(255, 255, 255, 0.95) 100%)',
                border: '1px solid rgba(255, 122, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 8px 24px rgba(255, 122, 0, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img
                    src={shoppingItem.item_image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=150'}
                    alt="Product"
                    style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ background: '#ee4d2d', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                        {shoppingItem.platform}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Order {shoppingItem.order_id}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {shoppingItem.item_title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#ee4d2d', fontWeight: 800, marginTop: '2px' }}>
                      {formatRupiah(shoppingItem.total_price)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Kurir: <b>{shoppingItem.courier}</b>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                      {shoppingItem.tracking_number}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyResi(shoppingItem.tracking_number)}
                    className="glass-btn"
                    style={{ padding: '8px 12px', fontSize: '0.78rem', background: copiedResi ? '#ecfdf5' : '#fff', color: copiedResi ? '#059669' : 'var(--text-main)' }}
                  >
                    {copiedResi ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedResi ? 'Disalin!' : 'Salin Resi'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Email Body Content */}
            <div style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.75)',
              borderRadius: '16px',
              padding: '20px',
              overflowY: 'auto',
              border: '1px solid rgba(0,0,0,0.04)',
              lineHeight: 1.6
            }}>
              {selectedEmail.html_body ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }} 
                  style={{ color: 'var(--text-main)' }}
                />
              ) : (
                <pre style={{ fontFamily: 'var(--font-sans)', whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
                  {selectedEmail.text_body}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(255, 240, 246, 0.8) 0%, rgba(240, 245, 255, 0.8) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(220, 180, 205, 0.2)'
            }}>
              <Mail size={38} color="#ff5c8a" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
              Pilih Email untuk Membaca
            </h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '320px', lineHeight: 1.5 }}>
              Semua email belanja Shopee/Tokped/TikTok dan surat cinta akan tampil estetik di sini ✨
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
