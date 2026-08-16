import React from 'react';
import { 
  Inbox, 
  ShoppingBag, 
  Heart, 
  Sparkles, 
  Settings, 
  PlusCircle, 
  Send, 
  Package, 
  Mail,
  Zap,
  Tag
} from 'lucide-react';
import { playClick } from '../utils/sound';

export default function Sidebar({
  activeTab,
  onSelectTab,
  onOpenCompose,
  unreadStats,
  onSimulateMail
}) {
  const navItems = [
    {
      id: 'inbox',
      label: 'AcellMail Inbox',
      icon: Inbox,
      badge: unreadStats?.unreadShopping || unreadStats?.unreadLove ? (unreadStats?.unreadShopping + unreadStats?.unreadLove) : null,
      badgeColor: '#2563eb',
      color: '#2563eb'
    },
    {
      id: 'shopping',
      label: 'Shopping & Resi',
      icon: ShoppingBag,
      badge: unreadStats?.activePackages || null,
      badgeColor: '#0284c7',
      color: '#0284c7'
    },
    {
      id: 'love',
      label: 'Surat & Kapsul',
      icon: Heart,
      badge: unreadStats?.unreadLove || null,
      badgeColor: '#4f46e5',
      color: '#4f46e5'
    },
    {
      id: 'wishlist',
      label: 'Shared Wishlist',
      icon: Sparkles,
      badge: null,
      color: '#0ea5e9'
    },
    {
      id: 'settings',
      label: 'Domain & SMTP',
      icon: Settings,
      badge: null,
      color: '#1d4ed8'
    }
  ];

  return (
    <aside className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
      {/* Compose Button */}
      <button 
        onClick={() => {
          playClick();
          onOpenCompose();
        }}
        className="glass-btn glass-btn-primary" 
        style={{ width: '100%', padding: '12px 18px', fontSize: '0.95rem', borderRadius: '16px' }}
      >
        <Send size={18} />
        <span>Tulis Pesan / Surat</span>
      </button>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                playClick();
                onSelectTab(item.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '14px',
                border: '1px solid',
                borderColor: isActive ? 'rgba(37, 99, 235, 0.35)' : 'transparent',
                background: isActive 
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(239, 246, 255, 0.95) 100%)' 
                  : 'transparent',
                color: isActive ? 'var(--brand-blue-deep)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 16px rgba(37, 99, 235, 0.12)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? `${item.color}15` : 'rgba(0,0,0,0.03)',
                  color: item.color
                }}>
                  <Icon size={18} />
                </div>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span style={{
                  background: item.badgeColor,
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '999px',
                  boxShadow: `0 2px 8px ${item.badgeColor}60`
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Simulator Box (For Testing Inbound Mail Instant) */}
      <div className="glass-card" style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.5)', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Zap size={15} color="#ff7a00" />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Simulator Email Masuk
          </span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
          Klik untuk tes otomatis parser resi e-commerce & surat tanpa kirim email sungguhan:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button 
            onClick={() => onSimulateMail('shopee')}
            className="glass-pill" 
            style={{ fontSize: '0.72rem', padding: '6px 8px', justifyContent: 'center', background: '#fff5f0', color: '#ee4d2d', borderColor: '#ffd8cc' }}
          >
            📦 Shopee
          </button>
          <button 
            onClick={() => onSimulateMail('tokopedia')}
            className="glass-pill" 
            style={{ fontSize: '0.72rem', padding: '6px 8px', justifyContent: 'center', background: '#f0fdf4', color: '#03ac0e', borderColor: '#bbf7d0' }}
          >
            🛍️ Tokped
          </button>
          <button 
            onClick={() => onSimulateMail('tiktok')}
            className="glass-pill" 
            style={{ fontSize: '0.72rem', padding: '6px 8px', justifyContent: 'center', background: '#fdf2f8', color: '#db2777', borderColor: '#fbcfe8' }}
          >
            🎶 TikTok
          </button>
          <button 
            onClick={() => onSimulateMail('love_letter')}
            className="glass-pill" 
            style={{ fontSize: '0.72rem', padding: '6px 8px', justifyContent: 'center', background: '#faf5ff', color: '#9333ea', borderColor: '#e9d5ff' }}
          >
            💌 Surat Cinta
          </button>
        </div>
      </div>

      {/* Aliases List Info */}
      <div style={{ padding: '8px 10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: 700 }}>
          <Tag size={12} />
          <span>Email Alias Aktif:</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {['us@', 'shopping@', 'etall@', 'acell@', 'haikal@'].map(a => (
            <span key={a} style={{ background: '#fff0f5', color: '#ff5c8a', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
              {a}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
