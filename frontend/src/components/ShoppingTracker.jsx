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
  MapPin, 
  Navigation, 
  Sparkles, 
  X, 
  Package, 
  Layers,
  ChevronRight,
  ShieldCheck
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
  const [selectedMapItem, setSelectedMapItem] = useState(null);

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
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛍️ Shopping & Delivery Radar</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Otomatis teranalisis oleh AI saat belanja menggunakan <code style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>shopping@{activeDomain}</code> atau <code style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>etall@{activeDomain}</code>
          </p>
        </div>

        <button
          onClick={() => {
            playClick();
            setShowAddModal(true);
          }}
          className="glass-btn glass-btn-primary"
          style={{ padding: '9px 18px', fontSize: '0.86rem' }}
        >
          <Plus size={16} />
          <span>Tambah Paket Manual</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%)', borderColor: '#bfdbfe' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Total Belanja Bersama</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-blue-deep)', fontFamily: 'var(--font-heading)' }}>
            {formatRupiah(stats?.totalSpent)}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%)', borderColor: '#bae6fd' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Dalam Perjalanan Kurir</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{stats?.activePackages || 0}</span>
            <Truck size={20} className="float-soft" />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%)', borderColor: '#bbf7d0' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Paket Telah Sampai</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{stats?.deliveredCount || 0}</span>
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid rgba(219, 234, 254, 0.6)', paddingBottom: '10px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <Package size={48} color="#93c5fd" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>Belum Ada Paket Belanja</h4>
            <p style={{ fontSize: '0.82rem' }}>Semua pembelian Shopee, Tokopedia, dan TikTok Shop otomatis terlacak di sini saat email resi masuk.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            let statusColor = '#2563eb';
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

            const trackingUrl = item.tracking_url || `https://cekresi.com/?noresi=${encodeURIComponent(item.tracking_number || '')}`;

            return (
              <div key={item.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                {/* Header Badge & Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: item.platform === 'Shopee' ? '#ee4d2d' : item.platform === 'Tokopedia' ? '#03ac0e' : item.platform === 'TikTok Shop' ? '#0f172a' : '#2563eb',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      {item.platform}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {item.order_id}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      playClick();
                      onDeleteItem(item.id);
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
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
                    style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(219, 234, 254, 0.8)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.35, marginBottom: '4px' }}>
                      {item.item_title}
                    </h4>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--brand-blue)' }}>
                      {formatRupiah(item.total_price)}
                    </div>
                  </div>
                </div>

                {/* AI Summary Pill (if available) */}
                {item.ai_summary && (
                  <div style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1e40af', padding: '6px 10px', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} color="#2563eb" />
                    <span>{item.ai_summary}</span>
                  </div>
                )}

                {/* Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '6px' }}>
                    <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{item.estimated_delivery}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(219, 234, 254, 0.5)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: progressWidth, height: '100%', background: statusColor, borderRadius: '999px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Resi, Official Link & Map Trigger */}
                <div style={{
                  background: 'rgba(248, 250, 252, 0.9)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(226, 232, 240, 0.9)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Kurir: <b>{item.courier}</b>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                      {item.tracking_number}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleCopyResi(item.id, item.tracking_number)}
                      className="glass-btn"
                      style={{ padding: '5px 8px', fontSize: '0.72rem', background: copiedId === item.id ? '#eff6ff' : '#fff', color: copiedId === item.id ? '#2563eb' : '#333' }}
                      title="Salin Resi"
                    >
                      {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                    </button>

                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-btn"
                      style={{ padding: '5px 10px', fontSize: '0.72rem', color: '#2563eb', textDecoration: 'none' }}
                      title="Cek Resi di Website Resmi Kurir"
                    >
                      <ExternalLink size={13} />
                      <span>Cek Resi</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedMapItem(item);
                      }}
                      className="glass-btn"
                      style={{ padding: '5px 10px', fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8' }}
                      title="Lihat Peta Radar Pengiriman"
                    >
                      <MapPin size={13} />
                      <span>Peta</span>
                    </button>
                  </div>
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

      {/* Live Map & Step Timeline Modal */}
      {selectedMapItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#ffffff', boxShadow: '0 25px 50px rgba(37,99,235,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Navigation size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Radar Pengiriman: {selectedMapItem.item_title}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {selectedMapItem.courier} • Resi: <code>{selectedMapItem.tracking_number}</code>
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedMapItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Simulated Live Apple Map Radar */}
            <div style={{
              background: 'linear-gradient(180deg, #f0f7ff 0%, #e0f2fe 100%)',
              borderRadius: '16px',
              padding: '24px 20px',
              border: '1px solid #bfdbfe',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '20px'
            }}>
              {/* Radar Grid Overlay */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                {/* Origin Hub */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fff', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px auto', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>
                    <Package size={20} color="#2563eb" />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {selectedMapItem.origin_city || 'Jakarta (Hub)'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Warehouse Asal</div>
                </div>

                {/* Animated Courier Pin in Transit */}
                <div style={{ textAlign: 'center', flex: 1, padding: '0 12px', position: 'relative' }}>
                  <div style={{ height: '3px', background: 'linear-gradient(90deg, #2563eb 0%, #0284c7 100%)', width: '100%', position: 'absolute', top: '20px', left: 0, zIndex: 1 }} />
                  <div style={{ position: 'relative', zIndex: 2, display: 'inline-block' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px auto', boxShadow: '0 0 16px rgba(37,99,235,0.6)' }} className="pulse-cosmic">
                      <Truck size={18} />
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', background: '#fff', padding: '2px 8px', borderRadius: '999px', border: '1px solid #bfdbfe' }}>
                      {selectedMapItem.status === 'delivered' ? 'Tiba di Tujuan' : 'Dalam Perjalanan'}
                    </div>
                  </div>
                </div>

                {/* Destination Sanctuary */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fff', border: '2px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px auto', boxShadow: '0 4px 12px rgba(5,150,105,0.2)' }}>
                    <MapPin size={20} color="#059669" />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {selectedMapItem.destination_city || 'Bandung (Sanctuary)'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>Rumah Acell & Haikal</div>
                </div>
              </div>
            </div>

            {/* Checkpoint Step Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                📍 Riwayat & Estimasi Pengiriman
              </div>

              {(selectedMapItem.timeline && selectedMapItem.timeline.length > 0 ? selectedMapItem.timeline : [
                { step: 1, title: 'Pesanan Dibuat', desc: 'Pesanan telah dibuat di ' + selectedMapItem.platform, time: 'Hari ini', completed: true },
                { step: 2, title: 'Sedang Dikemas Penjual', desc: 'Barang sedang dipersiapkan', time: 'Hari ini', completed: true },
                { step: 3, title: 'Diserahkan ke ' + selectedMapItem.courier, desc: 'Nomor Resi: ' + selectedMapItem.tracking_number, time: 'Hari ini', completed: selectedMapItem.status !== 'processing', current: selectedMapItem.status === 'shipping' },
                { step: 4, title: 'Menuju Alamat', desc: 'Kurir sedang membawa paket ke alamat tujuan', time: selectedMapItem.estimated_delivery || '1-2 Hari', completed: selectedMapItem.status === 'delivered' },
                { step: 5, title: 'Paket Diterima', desc: 'Paket sampai di tangan Acell & Haikal', time: selectedMapItem.estimated_delivery || 'Estimasi Selesai', completed: selectedMapItem.status === 'delivered', current: selectedMapItem.status === 'delivered' }
              ]).map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: step.completed ? '#2563eb' : '#e2e8f0',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginTop: '2px'
                  }}>
                    {step.completed ? <Check size={12} /> : idx + 1}
                  </div>
                  <div style={{ flex: 1, paddingBottom: '10px', borderBottom: idx === 4 ? 'none' : '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: step.completed ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {step.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {step.time}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Official Tracking Link Button */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              <a
                href={selectedMapItem.tracking_url || `https://cekresi.com/?noresi=${encodeURIComponent(selectedMapItem.tracking_number || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-btn glass-btn-primary"
                style={{ flex: 1, textDecoration: 'none', padding: '10px', fontSize: '0.85rem' }}
              >
                <ExternalLink size={15} />
                <span>Buka Cek Resi Resmi {selectedMapItem.courier}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <form onSubmit={handleSaveManual} className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>Tambah Paket Manual</h3>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nama Barang</label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Contoh: Skincare Glow Set / Baju Lucu"
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Platform</label>
                  <select
                    value={manualPlatform}
                    onChange={(e) => setManualPlatform(e.target.value)}
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="Tokopedia">Tokopedia</option>
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Lazada">Lazada</option>
                    <option value="Lion Parcel">Lion Parcel</option>
                    <option value="Apple Store">Apple Store</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Kurir</label>
                  <select
                    value={manualCourier}
                    onChange={(e) => setManualCourier(e.target.value)}
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="SPX Express">SPX Express</option>
                    <option value="J&T Express">J&T Express</option>
                    <option value="JNE">JNE</option>
                    <option value="SiCepat">SiCepat</option>
                    <option value="Lion Parcel">Lion Parcel</option>
                    <option value="Anteraja">Anteraja</option>
                    <option value="Ninja Xpress">Ninja Xpress</option>
                    <option value="POS Indonesia">POS Indonesia</option>
                    <option value="Kurir Lain">Kurir Lain</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nomor Resi (AWB)</label>
                  <input
                    type="text"
                    value={manualResi}
                    onChange={(e) => setManualResi(e.target.value)}
                    placeholder="Contoh: SPX12345678"
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Total Harga (Rp)</label>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="150000"
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Catatan / Keterangan</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Kado manis untuk Princess Acell"
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                className="glass-btn glass-btn-primary"
                style={{ width: '100%', marginTop: '6px', padding: '12px' }}
              >
                Simpan Paket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
