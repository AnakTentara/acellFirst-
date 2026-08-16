import React from 'react';
import { 
  Inbox, 
  ShoppingBag, 
  Heart, 
  Sparkles, 
  Send, 
  Tag,
  Star,
  Trash2,
  AlertOctagon,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  X
} from 'lucide-react';
import { playClick } from '../utils/sound';

export default function Sidebar({
  activeTab,
  onSelectTab,
  activeMailFolder,
  onSelectMailFolder,
  onOpenCompose,
  mailStats,
  shoppingStats,
  isCollapsed: isCollapsedProp,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile
}) {
  // Icon-only mode is a desktop space-saver. Inside the mobile drawer there
  // is plenty of room, so labels always stay visible there.
  const isCollapsed = isMobileOpen ? false : isCollapsedProp;

  const mailFolders = [
    { id: 'inbox', label: 'Kotak Masuk', icon: Inbox, badge: mailStats?.unreadTotal || null, color: '#2563eb' },
    { id: 'starred', label: 'Berbintang', icon: Star, badge: mailStats?.starredCount || null, color: '#eab308' },
    { id: 'shopping', label: 'Belanja & Resi', icon: ShoppingBag, badge: mailStats?.unreadShopping || null, color: '#0284c7' },
    { id: 'love', label: 'Surat Cinta', icon: Heart, badge: mailStats?.unreadLove || null, color: '#4f46e5' },
    { id: 'personal', label: 'Personal Acell & Haikal', icon: User, badge: null, color: '#0ea5e9' },
    { id: 'sent', label: 'Terkirim', icon: Send, badge: null, color: '#64748b' },
    { id: 'trash', label: 'Sampah', icon: Trash2, badge: mailStats?.trashCount || null, color: '#dc2626' },
    { id: 'spam', label: 'Spam', icon: AlertOctagon, badge: mailStats?.spamCount || null, color: '#94a3b8' }
  ];

  const mainTabs = [
    {
      id: 'shopping_tab',
      targetTab: 'shopping',
      label: 'Shopping Radar & Peta',
      icon: ShoppingBag,
      badge: shoppingStats?.activePackages || null,
      color: '#0284c7'
    },
    {
      id: 'love_tab',
      targetTab: 'love',
      label: 'Kapsul Waktu & Surat',
      icon: Heart,
      badge: null,
      color: '#4f46e5'
    },
    {
      id: 'wishlist_tab',
      targetTab: 'wishlist',
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
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            AcellMail & Apps
          </span>
        )}
        {/* Collapse only makes sense on desktop; in the mobile drawer the
            same slot becomes a close button. */}
        <button
          type="button"
          onClick={() => {
            playClick();
            onToggleCollapse();
          }}
          className="glass-btn sidebar-collapse-btn"
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

        <button
          type="button"
          onClick={() => {
            playClick();
            if (onCloseMobile) onCloseMobile();
          }}
          className="glass-btn sidebar-close-btn"
          aria-label="Tutup menu"
        >
          <X size={16} />
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

      {/* 1. Folders & Smart Tags Sub-Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        {!isCollapsed && (
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px 2px 8px' }}>
            Folder Email
          </div>
        )}

        {mailFolders.map((folder) => {
          const Icon = folder.icon;
          const isSelected = activeTab === 'inbox' && (activeMailFolder || 'inbox') === folder.id;

          return (
            <button
              key={folder.id}
              onClick={() => {
                playClick();
                onSelectTab('inbox');
                if (onSelectMailFolder) onSelectMailFolder(folder.id);
              }}
              title={isCollapsed ? folder.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '9px 0' : '8px 12px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: isSelected ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
                background: isSelected 
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(239, 246, 255, 0.95) 100%)' 
                  : 'transparent',
                color: isSelected ? 'var(--brand-blue-deep)' : 'var(--text-secondary)',
                fontWeight: isSelected ? 800 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.16s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={15} color={isSelected ? folder.color : 'var(--text-muted)'} />
                {!isCollapsed && <span>{folder.label}</span>}
              </div>

              {folder.badge && Number(folder.badge) > 0 ? (
                <span style={{
                  background: isSelected ? 'var(--brand-blue)' : '#e2e8f0',
                  color: isSelected ? '#fff' : 'var(--text-main)',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  position: isCollapsed ? 'absolute' : 'static',
                  top: isCollapsed ? '2px' : 'auto',
                  right: isCollapsed ? '2px' : 'auto'
                }}>
                  {folder.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 2. Apps & Sanctuary Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', borderTop: '1px solid rgba(219, 234, 254, 0.5)', paddingTop: '10px' }}>
        {!isCollapsed && (
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px 2px 8px' }}>
            Fitur Pasangan
          </div>
        )}

        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.targetTab;

          return (
            <button
              key={tab.id}
              onClick={() => {
                playClick();
                onSelectTab(tab.targetTab);
              }}
              title={isCollapsed ? tab.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '9px 0' : '8px 12px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: isSelected ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
                background: isSelected 
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(239, 246, 255, 0.95) 100%)' 
                  : 'transparent',
                color: isSelected ? 'var(--brand-blue-deep)' : 'var(--text-secondary)',
                fontWeight: isSelected ? 800 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.16s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={15} color={isSelected ? tab.color : 'var(--text-muted)'} />
                {!isCollapsed && <span>{tab.label}</span>}
              </div>

              {tab.badge && Number(tab.badge) > 0 ? (
                <span style={{
                  background: 'var(--brand-blue)',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  position: isCollapsed ? 'absolute' : 'static',
                  top: isCollapsed ? '2px' : 'auto',
                  right: isCollapsed ? '2px' : 'auto'
                }}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Aliases List Info (Visible when expanded) */}
      {!isCollapsed && (
        <div style={{ padding: '6px 8px', fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(219, 234, 254, 0.5)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <Tag size={12} />
            <span>Alias Email Aktif:</span>
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
