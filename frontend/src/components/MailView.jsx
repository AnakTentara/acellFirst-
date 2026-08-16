import React, { useState, useEffect } from 'react';
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
  ArrowLeft,
  Sparkles,
  Inbox,
  Clock,
  Tag,
  ShieldCheck,
  Send
} from 'lucide-react';
import { playClick, playHeartPop } from '../utils/sound';

export default function MailView({
  emails,
  selectedEmail,
  onSelectEmail,
  onBackToList,
  onToggleStar,
  onDeleteMail,
  currentUser,
  shoppingItem
}) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedResi, setCopiedResi] = useState(false);

  // Keyboard shortcut: ESC to go back to list
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedEmail) {
        onBackToList();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEmail, onBackToList]);

  const categories = [
    { id: 'all', label: 'Semua', icon: Inbox },
    { id: 'shopping', label: '🛍️ Belanja & Resi', icon: ShoppingBag },
    { id: 'love', label: '💌 Surat Cinta', icon: Heart },
    { id: 'personal', label: '👤 Personal', icon: User },
    { id: 'sent', label: '📤 Terkirim', icon: Mail },
    { id: 'starred', label: '⭐ Berbintang', icon: Star }
  ];

  const filteredEmails = emails.filter((mail) => {
    // Category match
    if (filterCategory === 'starred') {
      if (mail.is_starred !== 1) return false;
    } else if (filterCategory === 'sent') {
      if (mail.is_outbound !== 1) return false;
    } else if (filterCategory !== 'all') {
      if (mail.is_outbound === 1) return false;
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
    <div style={{ position: 'relative', width: '100%', minHeight: '600px', overflow: 'hidden' }}>
      {/* 1. LIST VIEW (Sliding out to the left when email is opened) */}
      <div style={{
        width: '100%',
        display: selectedEmail ? 'none' : 'flex',
        flexDirection: 'column',
        gap: '16px',
        animation: 'fadeIn 0.2s ease'
      }}>
        {/* Top Search & Filter Bar */}
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Cari email, pengirim, produk, atau nomor resi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: '40px', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <span>{filteredEmails.length} Pesan</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSel = filterCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    playClick();
                    setFilterCategory(cat.id);
                  }}
                  className={`glass-pill ${isSel ? 'active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  <Icon size={13} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Email Cards List */}
        <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredEmails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Inbox size={48} color="#93c5fd" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>Kotak Masuk Bersih</h4>
              <p style={{ fontSize: '0.82rem' }}>Tidak ada email di kategori ini.</p>
            </div>
          ) : (
            filteredEmails.map((mail) => {
              const isUnread = currentUser?.role === 'girl' ? mail.is_read_by_girl === 0 : mail.is_read_by_boy === 0;

              return (
                <div
                  key={mail.id}
                  onClick={() => {
                    playClick();
                    onSelectEmail(mail);
                  }}
                  className="glass-card"
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    cursor: 'pointer',
                    borderRadius: '14px',
                    background: isUnread ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                    borderLeft: isUnread ? '4px solid var(--brand-blue)' : '1px solid rgba(219, 234, 254, 0.7)',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {/* Left: Star + Sender + Subject + Snippet */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClick();
                        onToggleStar(mail.id);
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                      title={mail.is_starred ? 'Hapus Bintang' : 'Beri Bintang'}
                    >
                      <Star
                        size={17}
                        color={mail.is_starred ? '#eab308' : '#cbd5e1'}
                        fill={mail.is_starred ? '#eab308' : 'none'}
                      />
                    </button>

                    {/* Sender Avatar */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: mail.category === 'shopping' ? '#eff6ff' : mail.category === 'love' ? '#f0f9ff' : '#f8fafc',
                      color: mail.category === 'shopping' ? '#2563eb' : mail.category === 'love' ? '#0284c7' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      flexShrink: 0,
                      border: '1px solid rgba(219, 234, 254, 0.8)'
                    }}>
                      {mail.category === 'shopping' ? <ShoppingBag size={17} /> : mail.category === 'love' ? <Heart size={17} /> : (mail.from_name || mail.from_address || 'M')[0].toUpperCase()}
                    </div>

                    {/* Content Preview */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: isUnread ? 800 : 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mail.from_name || mail.from_address}
                        </span>

                        {mail.alias_name && (
                          <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {mail.alias_name}@
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: isUnread ? 700 : 500, color: isUnread ? 'var(--text-main)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mail.subject}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          — {(mail.text_body || '').slice(0, 70)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Date */}
                  <div style={{ fontSize: '0.74rem', color: isUnread ? 'var(--brand-blue)' : 'var(--text-muted)', fontWeight: isUnread ? 700 : 500, flexShrink: 0 }}>
                    {formatDate(mail.created_at)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. FULL EMAIL READER (Sliding in smoothly with Back button) */}
      {selectedEmail && (
        <div className="glass-panel" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          minHeight: '650px',
          background: '#ffffff',
          animation: 'slideInFromRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Top Action Toolbar with Back Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onBackToList();
                }}
                className="glass-btn glass-btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px' }}
                title="Kembali ke Kotak Masuk (Tekan Esc)"
              >
                <ArrowLeft size={16} />
                <span>Kembali</span>
              </button>

              <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '8px', fontWeight: 700, textTransform: 'uppercase' }}>
                {selectedEmail.category === 'shopping' ? '🛍️ Resi Belanja' : selectedEmail.category === 'love' ? '💌 Surat Cinta' : '📬 Pesan Masuk'}
              </span>
            </div>

            {/* Actions: Star, Delete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onToggleStar(selectedEmail.id);
                }}
                className="glass-btn"
                style={{ padding: '7px 12px', fontSize: '0.8rem', color: selectedEmail.is_starred ? '#eab308' : 'var(--text-secondary)' }}
                title="Beri Bintang"
              >
                <Star size={15} fill={selectedEmail.is_starred ? '#eab308' : 'none'} />
                <span>{selectedEmail.is_starred ? 'Berbintang' : 'Bintang'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  onDeleteMail(selectedEmail.id);
                  onBackToList();
                }}
                className="glass-btn"
                style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#dc2626' }}
                title="Hapus Email"
              >
                <Trash2 size={15} />
                <span>Hapus</span>
              </button>
            </div>
          </div>

          {/* Email Subject Heading */}
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', lineHeight: 1.3, marginBottom: '12px' }}>
              {selectedEmail.subject}
            </h2>

            {/* Sender & Recipient Meta Card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                  {(selectedEmail.from_name || selectedEmail.from_address || 'M')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {selectedEmail.from_name || selectedEmail.from_address}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Dari: <code>{selectedEmail.from_address}</code> • Tujuan: <code>{selectedEmail.to_address}</code>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>{formatDate(selectedEmail.created_at)}</span>
              </div>
            </div>
          </div>

          {/* AI Intelligence Summary Pill */}
          {selectedEmail.ai_summary && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} color="#2563eb" />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>
                  ✨ Analisis AI OhhMyAgent (GPT-5.6)
                </div>
                <div style={{ fontSize: '0.84rem', color: '#1e293b', marginTop: '2px' }}>
                  {selectedEmail.ai_summary}
                </div>
              </div>
            </div>
          )}

          {/* Shopping Order Highlight Box (if receipt) */}
          {shoppingItem && (
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #bae6fd',
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} color="#0284c7" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0369a1' }}>
                    Informasi Pengiriman ({shoppingItem.platform})
                  </span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7' }}>
                  {formatRupiah(shoppingItem.total_price)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #bfdbfe', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Kurir: <b>{shoppingItem.courier}</b> • Estimasi: <b>{shoppingItem.estimated_delivery}</b>
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                    {shoppingItem.tracking_number}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyResi(shoppingItem.tracking_number)}
                    className="glass-btn"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', background: copiedResi ? '#ecfdf5' : '#fff', color: copiedResi ? '#059669' : '#1e40af' }}
                  >
                    {copiedResi ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedResi ? 'Disalin' : 'Salin Resi'}</span>
                  </button>

                  <a
                    href={shoppingItem.tracking_url || `https://cekresi.com/?noresi=${encodeURIComponent(shoppingItem.tracking_number || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-btn glass-btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} />
                    <span>Cek Resi</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Email Content Body */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            minHeight: '280px',
            lineHeight: 1.65,
            fontSize: '0.92rem',
            color: '#1e293b'
          }}>
            {selectedEmail.html_body ? (
              <div
                dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
                style={{ overflowX: 'auto' }}
              />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {selectedEmail.text_body}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
