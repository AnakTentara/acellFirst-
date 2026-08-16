import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2,
  DollarSign,
  Package,
  Layers
} from 'lucide-react';
import { playClick, playHeartPop } from '../utils/sound';

export default function ShoppingTracker({
  items,
  stats,
  onUpdateStatus,
  onDeleteItem,
  onAddManual,
  activeDomain
}) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for manual order
  const [manualTitle, setManualTitle] = useState('');
  const [manualPlatform, setManualPlatform] = useState('Shopee');
  const [manualCourier, setManualCourier] = useState('SPX Express');
  const [manualResi, setManualResi] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const formatRupiah = (num) => {
    if (!num) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const handleCopyResi = (id, resi) => {
    navigator.clipboard.writeText(resi);
    setCopiedId(id);
    playClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    if (!manualTitle) return;

    await onAddManual({
      itemTitle: manualTitle,
      platform: manualPlatform,
      courier: manualCourier,
      trackingNumber: manualResi || 'Belum Ada Resi',
      totalPrice: manualPrice ? parseFloat(manualPrice) : 0,
      notes: manualNotes,
      status: 'shipping'
    });

    setShowAddModal(false);
    setManualTitle('');
    setManualResi('');
    setManualPrice('');
    setManualNotes('');
    playHeartPop();
  };

  const filteredItems = items.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Stats Cards */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛍️ Shopping & Delivery Tracker</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Otomatis terisi saat belanja pakai email <code style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>shopping@{activeDomain}</code> atau <code style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>etall@{activeDomain}</code>
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
          <span>Tambah Paket Manual</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%)', borderColor: '#bfdbfe' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Total Belanja Bareng</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-heading)' }}>
            {formatRupiah(stats?.totalSpent)}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(240, 245, 255, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Sedang Dalam Perjalanan</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3a86ff', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{stats?.activePackages || 0}</span>
            <Truck size={20} className="float-soft" />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Paket Telah Sampai</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{stats?.deliveredCount || 0}</span>
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '10px' }}>
        {[
          { id: 'all', label: 'Semua Paket' },
          { id: 'shipping', label: '🚚 Sedang Dikirim' },
          { id: 'processing', label: '⏳ Diproses' },
          { id: 'delivered', label: '✅ Telah Sampai' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              playClick();
              setFilterStatus(tab.id);
            }}
            className={`glass-pill ${filterStatus === tab.id ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Package size={48} color="#ffd1dc" style={{ marginBottom: '10px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Belum Ada Paket di Kategori Ini</h4>
            <p style={{ fontSize: '0.8rem' }}>Semua pembelian Shopee/Tokped akan otomatis terlacak di sini</p>
          </div>
        ) : (
          filteredItems.map(item => {
            let statusColor = '#3a86ff';
            let statusLabel = 'Dalam Perjalanan';
            let progressWidth = '65%';

            if (item.status === 'delivered') {
              statusColor = '#059669';
              statusLabel = 'Telah Sampai';
              progressWidth = '100%';
            } else if (item.status === 'processing') {
              statusColor = '#d97706';
              statusLabel = 'Sedang Diproses';
              progressWidth = '30%';
            }

            return (
              <div key={item.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      background: item.platform === 'Shopee' ? '#ee4d2d' : item.platform === 'Tokopedia' ? '#03ac0e' : item.platform === 'TikTok Shop' ? '#db2777' : '#3a86ff',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      {item.platform}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.order_id}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      playClick();
                      onDeleteItem(item.id);
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#aaa' }}
                    title="Hapus"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Main Product Info */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <img
                    src={item.item_image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=150'}
                    alt={item.item_title}
                    style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.06)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3, marginBottom: '4px' }}>
                      {item.item_title}
                    </h4>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ff5c8a' }}>
                      {formatRupiah(item.total_price)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                    <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{item.estimated_delivery}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: progressWidth, height: '100%', background: statusColor, borderRadius: '999px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Resi & Tracking Action */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(0,0,0,0.04)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Kurir: <b>{item.courier}</b>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                      {item.tracking_number}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyResi(item.id, item.tracking_number)}
                    className="glass-btn"
                    style={{ padding: '6px 10px', fontSize: '0.72rem', background: copiedId === item.id ? '#ecfdf5' : '#fff', color: copiedId === item.id ? '#059669' : '#333' }}
                  >
                    {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedId === item.id ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>

                {/* Status Toggle Action */}
                {item.status !== 'delivered' && (
                  <button
                    onClick={() => {
                      playHeartPop();
                      onUpdateStatus(item.id, 'delivered');
                    }}
                    className="glass-btn"
                    style={{ width: '100%', padding: '8px', fontSize: '0.8rem', background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Tandai Sudah Sampai di Rumah 💕</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manual Order Modal */}
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
          <form onSubmit={handleSaveManual} className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>📦 Tambah Paket Belanja Manual</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Untuk pembelian offline, jastip, atau pesanan yang mau dilacak bareng.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Nama Barang *</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  placeholder="Contoh: Kado Sepatu Lucu Acel"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Platform</label>
                  <select
                    className="glass-input"
                    value={manualPlatform}
                    onChange={(e) => setManualPlatform(e.target.value)}
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="Tokopedia">Tokopedia</option>
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Lazada">Lazada</option>
                    <option value="Apple Store">Apple Store</option>
                    <option value="Jastip / Offline">Jastip / Offline</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Kurir</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="SPX / J&T / SiCepat"
                    value={manualCourier}
                    onChange={(e) => setManualCourier(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Nomor Resi</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="SPXID..."
                    value={manualResi}
                    onChange={(e) => setManualResi(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Harga (Rp)</label>
                  <input
                    type="number"
                    className="glass-input"
                    placeholder="150000"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Catatan</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Catatan manis / buat apa"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
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
                Simpan Paket 📦
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
