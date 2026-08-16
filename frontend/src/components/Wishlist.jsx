import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  ExternalLink, 
  Trash2, 
  DollarSign, 
  Heart, 
  Check, 
  Tag, 
  Gift
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playHeartPop, playClick } from '../utils/sound';

export default function Wishlist({
  items,
  stats,
  onAddItem,
  onToggleBought,
  onDeleteItem,
  currentUser
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterPriority, setFilterPriority] = useState('all');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newCategory, setNewCategory] = useState('Gadget & Hobi');
  const [newNotes, setNewNotes] = useState('');

  const formatRupiah = (num) => {
    if (!num) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const handleToggleBought = async (item) => {
    playHeartPop();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#06d6a0', '#38bdf8', '#818cf8', '#ffffff']
      });
    } catch (e) {}

    await onToggleBought(item.id, currentUser?.id || 'user_haikal');
  };

  const handleSaveWish = async (e) => {
    e.preventDefault();
    if (!newTitle) return;

    await onAddItem({
      title: newTitle,
      price: newPrice ? parseFloat(newPrice) : 0,
      url: newUrl,
      imageUrl: newImage || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80',
      category: newCategory,
      priority: newPriority,
      addedBy: currentUser?.id || 'user_acel',
      notes: newNotes
    });

    setShowAddModal(false);
    setNewTitle('');
    setNewPrice('');
    setNewUrl('');
    setNewImage('');
    setNewNotes('');
    playHeartPop();
  };

  const filteredItems = items.filter(item => {
    if (filterPriority === 'all') return true;
    if (filterPriority === 'bought') return item.is_bought === 1;
    if (filterPriority === 'pending') return item.is_bought === 0;
    return item.priority === filterPriority;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✨ Shared Wishlist & Bucket List</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Daftar barang impian & hal yang mau kita wujudkan berdua 💖
          </p>
        </div>

        <button
          onClick={() => {
            playClick();
            setShowAddModal(true);
          }}
          className="glass-btn glass-btn-primary"
          style={{ padding: '10px 18px', fontSize: '0.88rem' }}
        >
          <Plus size={16} />
          <span>Tambah Impian Baru</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Sudah Terwujud</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{stats?.boughtItems || 0} / {stats?.totalItems || 0} Impian</span>
            <Gift size={20} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(255, 240, 245, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Estimasi Tabungan Menunggu</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ff5c8a', fontFamily: 'var(--font-heading)' }}>
            {formatRupiah(stats?.pendingBudget)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '10px' }}>
        {[
          { id: 'all', label: 'Semua Impian' },
          { id: 'pending', label: '⏳ Belum Terwujud' },
          { id: 'bought', label: '🎉 Sudah Dibeli' },
          { id: 'high', label: '🔥 Prioritas Utama' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              playClick();
              setFilterPriority(tab.id);
            }}
            className={`glass-pill ${filterPriority === tab.id ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Sparkles size={48} color="#ffd1dc" style={{ marginBottom: '10px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Belum Ada Impian di Kategori Ini</h4>
            <p style={{ fontSize: '0.8rem' }}>Yuk tambahkan barang atau tempat yang pengen kamu beli/kunjungi bareng!</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isBought = item.is_bought === 1;

            return (
              <div
                key={item.id}
                className="glass-card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  opacity: isBought ? 0.85 : 1,
                  background: isBought 
                    ? 'linear-gradient(135deg, rgba(240, 253, 244, 0.7) 0%, rgba(255, 255, 255, 0.85) 100%)' 
                    : 'rgba(255, 255, 255, 0.75)'
                }}
              >
                <div>
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300'}
                      alt={item.title}
                      style={{ width: '100%', height: '140px', borderRadius: '12px', objectFit: 'cover' }}
                    />
                    {isBought && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#059669',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)'
                      }}>
                        ✓ Sudah Terwujud 🎉
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
                      {item.title}
                    </h4>
                    <button
                      onClick={() => {
                        playClick();
                        onDeleteItem(item.id);
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#aaa' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ff5c8a', marginBottom: '6px' }}>
                    {formatRupiah(item.price)}
                  </div>

                  {item.notes && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '8px' }}>
                      "{item.notes}"
                    </p>
                  )}

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ditambahkan oleh: <b>{item.added_by_name || 'Acel'}</b>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-btn"
                      style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1 }}
                    >
                      <ExternalLink size={13} />
                      <span>Lihat Toko</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleToggleBought(item)}
                    className="glass-btn"
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                      flex: 1,
                      background: isBought ? '#f3f4f6' : '#ecfdf5',
                      color: isBought ? '#666' : '#059669',
                      borderColor: isBought ? '#ddd' : '#a7f3d0'
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{isBought ? 'Batal Beli' : 'Sudah Beli 💕'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Wish Modal */}
      {showAddModal && (
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
          <form onSubmit={handleSaveWish} className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>✨ Tambah Barang Impian Kita</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Masukkan barang atau kado yang pengen dibeli bareng!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Nama Barang *</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  placeholder="Contoh: Instax Mini Camera Pink"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Estimasi Harga (Rp)</label>
                  <input
                    type="number"
                    className="glass-input"
                    placeholder="1500000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Prioritas</label>
                  <select
                    className="glass-input"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  >
                    <option value="high">🔥 Prioritas Utama</option>
                    <option value="medium">✨ Sedang / Mau Banget</option>
                    <option value="low">🌸 Santai / Suatu Hari Nanti</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Link Pembelian (Shopee / Tokped)</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>URL Foto Produk</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="https://images.unsplash.com/..."
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Alasan / Catatan Lucu</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Biar kita bisa foto date bareng! 📸"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="glass-btn"
              >
                Batal
              </button>
              <button
                type="submit"
                className="glass-btn glass-btn-primary"
              >
                Simpan Impian ✨
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
