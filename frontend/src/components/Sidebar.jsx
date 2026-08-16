import React from 'react';
import { 
  Inbox, 
  ShoppingBag, 
  Heart, 
  Sparkles, 
  Send, 
  Tag,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { playClick } from '../utils/sound';

export default function Sidebar({
  activeTab,
  onSelectTab,
  onOpenCompose,
  unreadStats,
  isCollapsed,
  onToggleCollapse
}) {
  const navItems = [
    {
      id: 'inbox',
      label: 'AcellMail Inbox',
      icon: Inbox,
      badge: unreadStats?.unreadShopping || unreadStats?.unreadLove ? (unreadStats?.unreadShopping + unreadStats?.unreadLove) : null,
      color: '#2563eb'
    },
    {
      id: 'shopping',
      label: 'Shopping & Resi',
      icon: ShoppingBag,
      badge: unreadStats?.activePackages || null,
      color: '#0284c7'
    },
    {
      id: 'love',
      label: 'Surat Cinta',
      icon: Heart,
      badge: unreadStats?.unreadLove || null,
      color: '#4f46e5'
    },
    {
      id: 'wishlist',
      label: 'Wishlist Bersama',
      icon: Sparkles,
      badge: null,
      color: '#0ea5e9'
    }
  ];

  return (
    <aside className="glass-panel" style={{
      padding: isCollapsed ? '12px 8px' : '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      height: 'fit-content',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      alignItems: isCollapsed ? 'center' : 'stretch'
    }}>
      {/* Header with Collapse Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        paddingBottom: '4px'
      }}>
        {!isCollapsed && (
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Menu Utama
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            playClick();
            onToggleCollapse();
          }}
          className="glass-btn"
          style={{
            padding: '6px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.6)',
            color: 'var(--text-secondary)'
          }}
          title={isCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Compose Mail Button */}
      <button 
        onClick={() => {
          playClick();
          onOpenCompose();
        }}
        className="glass-btn glass-btn-primary" 
        style={{
          width: '100%',
          padding: isCollapsed ? '10px 0' : '11px 16px',
          fontSize: '0.9rem',
          borderRadius: '14px',
          justifyContent: 'center',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        title="Tulis Pesan / Surat"
      >
        <Send size={16} />
        {!isCollapsed && <span>Tulis Surat</span>}
      </button>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
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
              title={isCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px 0' : '9px 12px',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: isActive ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
                background: isActive 
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(239, 246, 255, 0.95) 100%)' 
                  : 'transparent',
                color: isActive ? 'var(--brand-blue-deep)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.1)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? `${item.color}15` : 'rgba(0,0,0,0.02)',
                  color: isActive ? item.color : 'var(--text-muted)'
                }}>
                  <Icon size={16} />
                </div>
                {!isCollapsed && <span>{item.label}</span>}
              </div>

              {item.badge ? (
                <span style={{
                  background: 'var(--brand-blue)',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  position: isCollapsed ? 'absolute' : 'static',
                  top: isCollapsed ? '4px' : 'auto',
                  right: isCollapsed ? '4px' : 'auto'
                }}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Aliases List Info (Visible when expanded) */}
      {!isCollapsed && (
        <div style={{ padding: '6px 8px', fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(219, 234, 254, 0.5)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <Tag size={12} />
            <span>Alias Email Resmi:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {['us@', 'shopping@', 'etall@', 'acell@'].map(a => (
              <span key={a} style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
