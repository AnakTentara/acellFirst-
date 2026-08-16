import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import MailView from './components/MailView';
import ShoppingTracker from './components/ShoppingTracker';
import LoveLetters from './components/LoveLetters';
import Wishlist from './components/Wishlist';
import SettingsModal from './components/SettingsModal';
import ComposeMailModal from './components/ComposeMailModal';
import LoginModal from './components/LoginModal';

import { 
  authApi, 
  mailApi, 
  shoppingApi, 
  loveApi, 
  wishlistApi, 
  systemApi, 
  subscribeToEvents 
} from './services/api';
import { playChime, playHeartPop } from './utils/sound';
import confetti from 'canvas-confetti';

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('inbox');
  const [showSettings, setShowSettings] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [toast, setToast] = useState(null);

  // Data States
  const [profiles, setProfiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [daysTogether, setDaysTogether] = useState('...');
  const [systemConfig, setSystemConfig] = useState(null);
  const [activeDomain, setActiveDomain] = useState('acellimut.my.id');

  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailShoppingItem, setEmailShoppingItem] = useState(null);
  const [mailStats, setMailStats] = useState({});

  const [shoppingItems, setShoppingItems] = useState([]);
  const [shoppingStats, setShoppingStats] = useState({});

  const [loveLetters, setLoveLetters] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistStats, setWishlistStats] = useState({});

  // Show floating toast
  const showToast = (title, message, type = 'info') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Real-time SSE Subscription
  useEffect(() => {
    const unsubscribe = subscribeToEvents((eventType, data) => {
      console.log('⚡ Live Event Received:', eventType, data);

      if (eventType === 'new_email') {
        playChime();
        loadEmails();
        loadShopping();
        showToast('📬 Email Baru Masuk!', `${data.email?.from_name || data.email?.from_address}: ${data.email?.subject}`);
      } else if (eventType === 'new_love_letter') {
        playChime();
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } catch (e) {}
        loadLoveLetters();
        showToast('💌 Surat Cinta Baru!', `Ada surat romantis baru yang masuk ✨`);
      } else if (eventType === 'shopping_update' || eventType === 'shopping_deleted') {
        loadShopping();
      } else if (eventType === 'wishlist_update' || eventType === 'wishlist_deleted') {
        loadWishlist();
      } else if (eventType === 'domain_switch') {
        setActiveDomain(data.activeDomain);
        showToast('🌐 Domain Berganti', `Domain aktif sekarang: ${data.activeDomain}`);
      } else if (eventType === 'profile_update') {
        loadProfiles();
      }
    }, (connected) => {
      setIsLiveConnected(connected);
    });

    return () => unsubscribe();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadProfiles(),
        loadSystemConfig(),
        loadCounter(),
        loadEmails(),
        loadShopping(),
        loadLoveLetters(),
        loadWishlist()
      ]);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const loadProfiles = async () => {
    try {
      const res = await authApi.getProfiles();
      if (res.success && res.users.length > 0) {
        setProfiles(res.users);
        if (!currentUser) {
          // Default to Haikal or stored preference
          const savedId = localStorage.getItem('acel_user_id');
          const found = res.users.find(u => u.id === savedId) || res.users[0];
          setCurrentUser(found);
        } else {
          const updated = res.users.find(u => u.id === currentUser.id);
          if (updated) setCurrentUser(updated);
        }
      }
    } catch (e) {}
  };

  const loadSystemConfig = async () => {
    try {
      const res = await systemApi.getConfig();
      if (res.success) {
        setSystemConfig(res.config);
        setActiveDomain(res.config.activeDomain);
      }
    } catch (e) {}
  };

  const loadCounter = async () => {
    try {
      const res = await loveApi.getCounter();
      if (res.success) {
        setDaysTogether(res.togetherString);
      }
    } catch (e) {}
  };

  const loadEmails = async () => {
    try {
      const res = await mailApi.getInbox();
      if (res.success) {
        setEmails(res.emails);
        setMailStats(res.stats);
      }
    } catch (e) {}
  };

  const handleSelectEmail = async (mail) => {
    setSelectedEmail(mail);
    try {
      const detail = await mailApi.getMail(mail.id);
      if (detail.success) {
        setEmailShoppingItem(detail.shoppingItem || null);
      }
      // Mark as read
      await mailApi.markRead(mail.id, currentUser?.role || 'boy');
    } catch (e) {}
  };

  const loadShopping = async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        shoppingApi.getItems(),
        shoppingApi.getStats()
      ]);
      if (itemsRes.success) setShoppingItems(itemsRes.items);
      if (statsRes.success) setShoppingStats(statsRes.stats);
    } catch (e) {}
  };

  const loadLoveLetters = async () => {
    try {
      const res = await loveApi.getLetters();
      if (res.success) setLoveLetters(res.letters);
    } catch (e) {}
  };

  const loadWishlist = async () => {
    try {
      const res = await wishlistApi.getItems();
      if (res.success) {
        setWishlistItems(res.items);
        setWishlistStats(res.stats);
      }
    } catch (e) {}
  };

  // Actions
  const handleSimulateMail = async (type) => {
    try {
      playChime();
      const res = await mailApi.simulateTestMail(type);
      showToast('⚡ Simulasi Berhasil!', res.message);
      loadEmails();
      loadShopping();
    } catch (err) {
      alert('Gagal simulasi: ' + err.message);
    }
  };

  const handleToggleStar = async (id) => {
    await mailApi.toggleStar(id);
    loadEmails();
  };

  const handleDeleteMail = async (id) => {
    await mailApi.deleteMail(id);
    setSelectedEmail(null);
    setEmailShoppingItem(null);
    loadEmails();
  };

  const handleSendMail = async (data) => {
    await mailApi.sendMail(data);
    showToast('✨ Email Terkirim!', `Pesan berhasil dikirim ke ${data.to}`);
    loadEmails();
  };

  const handleUpdateShoppingStatus = async (id, status) => {
    await shoppingApi.updateStatus(id, { status });
    loadShopping();
  };

  const handleDeleteShoppingItem = async (id) => {
    await shoppingApi.deleteItem(id);
    loadShopping();
  };

  const handleAddManualShopping = async (data) => {
    await shoppingApi.addManual(data);
    loadShopping();
  };

  const handleSendLoveLetter = async (data) => {
    await loveApi.sendLetter(data);
    loadLoveLetters();
  };

  const handleOpenLoveLetter = async (id, reaction) => {
    await loveApi.openLetter(id, reaction);
    loadLoveLetters();
  };

  const handleAddWishlist = async (data) => {
    await wishlistApi.addItem(data);
    loadWishlist();
  };

  const handleToggleWishlistBought = async (id, boughtBy) => {
    await wishlistApi.toggleBought(id, boughtBy);
    loadWishlist();
  };

  const handleDeleteWishlist = async (id) => {
    await wishlistApi.deleteItem(id);
    loadWishlist();
  };

  const handleSwitchUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('acel_user_id', user.id);
    setShowLogin(false);
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <TopBar
        currentUser={currentUser}
        onSwitchUser={() => setShowLogin(true)}
        profiles={profiles}
        daysTogether={daysTogether}
        activeDomain={activeDomain}
        onOpenSettings={() => setShowSettings(true)}
        onSimulateMail={handleSimulateMail}
        onRefresh={loadInitialData}
      />

      {/* Main Grid: Sidebar + Viewport */}
      <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenCompose={() => setShowCompose(true)}
          unreadStats={{
            unreadShopping: mailStats?.unreadShopping || 0,
            unreadLove: mailStats?.unreadLove || 0,
            activePackages: shoppingStats?.activePackages || 0
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <section style={{ height: '100%' }}>
          {activeTab === 'inbox' && (
            <MailView
              emails={emails}
              selectedEmail={selectedEmail}
              onSelectEmail={handleSelectEmail}
              onBackToList={() => setSelectedEmail(null)}
              onToggleStar={handleToggleStar}
              onDeleteMail={handleDeleteMail}
              currentUser={currentUser}
              shoppingItem={emailShoppingItem}
            />
          )}

          {activeTab === 'shopping' && (
            <ShoppingTracker
              items={shoppingItems}
              stats={shoppingStats}
              onUpdateStatus={handleUpdateShoppingStatus}
              onDeleteItem={handleDeleteShoppingItem}
              onAddManual={handleAddManualShopping}
              activeDomain={activeDomain}
            />
          )}

          {activeTab === 'love' && (
            <LoveLetters
              letters={loveLetters}
              currentUser={currentUser}
              onSendLetter={handleSendLoveLetter}
              onOpenLetter={handleOpenLoveLetter}
            />
          )}

          {activeTab === 'wishlist' && (
            <Wishlist
              items={wishlistItems}
              stats={wishlistStats}
              onAddItem={handleAddWishlist}
              onToggleBought={handleToggleWishlistBought}
              onDeleteItem={handleDeleteWishlist}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'settings' && (
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginBottom: '8px' }}>
                ⚙️ Pengaturan Ekosistem & Domain
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Kelola domain kustom, webhook Cloudflare, dan sinkronisasi server.
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="glass-btn glass-btn-primary"
                style={{ padding: '12px 24px' }}
              >
                Buka Panel Pengaturan Domain & Cloudflare 🌐
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Floating Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        systemConfig={systemConfig}
        onDomainUpdated={(newDom) => {
          setActiveDomain(newDom);
          loadInitialData();
        }}
      />

      <ComposeMailModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onSend={handleSendMail}
        activeDomain={activeDomain}
        currentUser={currentUser}
      />

      <LoginModal
        isOpen={showLogin}
        profiles={profiles}
        onLoginSuccess={handleSwitchUser}
      />

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 92, 138, 0.3)',
          boxShadow: '0 12px 36px rgba(220, 160, 190, 0.25)',
          borderRadius: '16px',
          padding: '14px 20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          maxWidth: '360px',
          animation: 'floatSoft 0.3s ease'
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ff5c8a' }}>{toast.title}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}
