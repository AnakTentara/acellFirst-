import React, { useState, useEffect, useMemo } from 'react';
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
  AlertOctagon,
  RotateCcw,
  Send,
  Paperclip,
  Download
} from 'lucide-react';
import { playClick, playHeartPop } from '../utils/sound';
import { sanitizeEmailHtml } from '../utils/sanitize';
import { mailApi } from '../services/api';

export default function MailView({
  emails,
  selectedEmail,
  activeMailFolder,
  onSelectEmail,
  onBackToList,
  onToggleStar,
  onMoveToTrash,
  onRestoreMail,
  onMarkSpam,
  onPermanentDelete,
  currentUser,
  shoppingItem,
  onSearch
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedResi, setCopiedResi] = useState(false);
  const [downloadingAtt, setDownloadingAtt] = useState(null);

  // Email HTML comes from strangers on the internet. Clean it once per email
  // instead of on every keystroke in the search box.
  const safeHtml = useMemo(
    () => sanitizeEmailHtml(selectedEmail?.html_body),
    [selectedEmail?.id, selectedEmail?.html_body]
  );

  // The list only holds the 150 newest mails, so filtering it locally can
  // never find an older one. Ask the server too — debounced, because every
  // keystroke would otherwise be a query.
  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(() => onSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

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

  const filteredEmails = emails.filter((mail) => {
    // Search match
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchSub = (mail.subject || '').toLowerCase().includes(term);
      const matchFrom = (mail.from_name || mail.from_address || '').toLowerCase().includes(term);
      const matchBody = (mail.text_body || '').toLowerCase().includes(term);
      const matchTag = (mail.ai_tags || []).some(t => t.toLowerCase().includes(term));
      if (!matchSub && !matchFrom && !matchBody && !matchTag) return false;
    }

    return true;
  });

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleDownloadAttachment = async (att) => {
    if (!att.available || !selectedEmail) return;
    playClick();
    setDownloadingAtt(att.index);
    try {
      await mailApi.downloadAttachment(selectedEmail.id, att.index, att.filename);
    } catch (e) {
      alert(e.message || 'Lampiran gagal diunduh.');
    } finally {
      setDownloadingAtt(null);
    }
  };

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

  const getFolderTitle = () => {
    switch (activeMailFolder) {
      case 'starred': return '⭐ Berbintang';
      case 'shopping': return '🛍️ Belanja & Resi';
      case 'love': return '💌 Surat Cinta';
      case 'personal': return '👤 Personal Acell & Haikal';
      case 'sent': return '📤 Terkirim';
      case 'trash': return '🗑️ Sampah';
      case 'spam': return '🚫 Spam';
      default: return '📥 Kotak Masuk';
    }
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
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 280px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
              {getFolderTitle()}
            </h3>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Cari email, pengirim, produk, atau tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: '36px', fontSize: '0.84rem' }}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <span>{filteredEmails.length} Pesan</span>
          </div>
        </div>

        {/* Email Cards List */}
        <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredEmails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Inbox size={48} color="#93c5fd" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>Folder Ini Kosong</h4>
              <p style={{ fontSize: '0.82rem' }}>Tidak ada email dalam {getFolderTitle()}.</p>
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
                  className="glass-card mail-row"
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
                      type="button"
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: isUnread ? 800 : 600, color: 'var(--text-main)' }}>
                          {mail.from_name || mail.from_address}
                        </span>

                        {mail.alias_name && (
                          <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {mail.alias_name}@
                          </span>
                        )}

                        {/* AI Smart Tags Preview */}
                        {(mail.ai_tags || []).slice(0, 2).map((t, idx) => (
                          <span key={idx} style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: isUnread ? 700 : 500, color: isUnread ? 'var(--text-main)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mail.subject}
                        </span>
                        <span className="mail-snippet" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

            {/* Actions: Star, Trash, Spam, Restore, Delete */}
            <div className="mail-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

              {selectedEmail.is_trash === 1 || selectedEmail.is_spam === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      if (onRestoreMail) onRestoreMail(selectedEmail.id);
                      onBackToList();
                    }}
                    className="glass-btn"
                    style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#059669' }}
                    title="Kembalikan ke Kotak Masuk"
                  >
                    <RotateCcw size={15} />
                    <span>Pulihkan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      if (onPermanentDelete) onPermanentDelete(selectedEmail.id);
                      onBackToList();
                    }}
                    className="glass-btn"
                    style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#dc2626' }}
                    title="Hapus Permanen"
                  >
                    <Trash2 size={15} />
                    <span>Hapus Permanen</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      if (onMoveToTrash) onMoveToTrash(selectedEmail.id);
                      onBackToList();
                    }}
                    className="glass-btn"
                    style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#dc2626' }}
                    title="Pindahkan ke Sampah"
                  >
                    <Trash2 size={15} />
                    <span>Sampah</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      if (onMarkSpam) onMarkSpam(selectedEmail.id);
                      onBackToList();
                    }}
                    className="glass-btn"
                    style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#64748b' }}
                    title="Tandai sebagai Spam"
                  >
                    <AlertOctagon size={15} />
                    <span>Spam</span>
                  </button>
                </>
              )}
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

            {/* AI Tags Display */}
            {selectedEmail.ai_tags && selectedEmail.ai_tags.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                <Tag size={13} color="var(--brand-blue)" />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tag AI:</span>
                {selectedEmail.ai_tags.map((t, idx) => (
                  <span key={idx} style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
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
                className="mail-html-body"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {selectedEmail.text_body}
              </div>
            )}

            {/* Attachments were saved to disk on arrival but never shown.
                They are fetched with the session token, not a plain link. */}
            {(selectedEmail.attachments || []).length > 0 && (
              <div className="mail-attachments">
                <div className="field-label" style={{ marginBottom: '8px' }}>
                  <Paperclip size={13} style={{ verticalAlign: '-2px' }} /> {selectedEmail.attachments.length} Lampiran
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedEmail.attachments.map((att) => (
                    <button
                      key={att.index}
                      type="button"
                      className="glass-card attachment-chip"
                      disabled={!att.available || downloadingAtt === att.index}
                      title={att.available ? `Unduh ${att.filename}` : (att.skipped || 'File tidak tersimpan di server')}
                      onClick={() => handleDownloadAttachment(att)}
                    >
                      <Paperclip size={14} />
                      <span className="attachment-name">{att.filename}</span>
                      <span className="attachment-size">{formatBytes(att.size)}</span>
                      {att.available && <Download size={13} />}
                    </button>
                  ))}
                </div>
                {selectedEmail.attachments.some(a => !a.available) && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Lampiran abu-abu tidak tersimpan di server (biasanya lebih dari 15 MB).
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
