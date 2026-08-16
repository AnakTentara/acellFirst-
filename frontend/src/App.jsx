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
  const [activeMailFolder, setActiveMailFolder] = useState('inbox');
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

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadInitialData();

    // Subscribe to SSE
    const unsubscribe = subscribeToEvents((event, data) => {
      if (event === 'new_email') {
        playChime();
        showToast('📬 Email Baru Masuk!', `${data.email?.subject} (${data.email?.from_name || data.email?.from_address})`);
        loadEmails();
        loadShopping();
      } else if (event === 'mail_read_update' || event === 'mail_trash' || event === 'mail_restore' || event === 'mail_deleted') {
        if (data?.stats) setMailStats(data.stats);
        loadEmails();
      } else if (event === 'love_letter_received') {
        playHeartPop();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        showToast('💌 Surat Cinta!', `${data.letter?.sender_name} mengirimkan surat baru 💙`);
        loadLoveLetters();
      } else if (event === 'shopping_update') {
        loadShopping();
      }
    }, (connected) => {
      setIsLiveConnected(connected);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadProfiles(),
      loadEmails(),
      loadShopping(),
      loadLoveLetters(),
      loadWishlist(),
      loadSystemConfig()
    ]);
  };

  const loadProfiles = async () => {
    try {
      const res = await authApi.getProfiles();
      if (res.success && res.profiles) {
        setProfiles(res.profiles);
        // Default to Haikal or Acell
        if (!currentUser && res.profiles.length > 0) {
          const boy = res.profiles.find(p => p.role === 'boy') || res.profiles[0];
          setCurrentUser(boy);
        }
      }
    } catch (e) {}
  };

  const loadEmails = async (folderOverride) => {
    try {
      const folder = folderOverride || activeMailFolder || 'inbox';
      const res = await mailApi.getInbox({ folder });
      if (res.success) {
        setEmails(res.emails);
        setMailStats(res.stats);
      }
    } catch (e) {}
  };

  const handleSelectMailFolder = (folder) => {
    setActiveMailFolder(folder);
    setSelectedEmail(null);
    setEmailShoppingItem(null);
    loadEmails(folder);
  };

  const handleSelectEmail = async (mail) => {
    setSelectedEmail(mail);
    
    // 1. Optimistically reduce unread count in frontend state immediately
    setEmails(prev => prev.map(m => m.id === mail.id ? { ...m, is_read_by_boy: 1, is_read_by_girl: 1 } : m));
    setMailStats(prev => ({
      ...prev,
      unreadTotal: Math.max(0, (prev.unreadTotal || 1) - 1),
      unreadShopping: mail.category === 'shopping' ? Math.max(0, (prev.unreadShopping || 1) - 1) : prev.unreadShopping,
      unreadLove: mail.category === 'love' ? Math.max(0, (prev.unreadLove || 1) - 1) : prev.unreadLove
    }));

    try {
      const detail = await mailApi.getMail(mail.id);
      if (detail.success) {
        setEmailShoppingItem(detail.shoppingItem || null);
      }
      // 2. Mark as read on backend and sync exact stats
      const readRes = await mailApi.markRead(mail.id, currentUser?.role || 'boy');
      if (readRes?.stats) {
        setMailStats(readRes.stats);
      }
    } catch (e) {}
  };

  const handleToggleStar = async (id) => {
    const res = await mailApi.toggleStar(id);
    if (res?.stats) setMailStats(res.stats);
    loadEmails();
  };

  const handleMoveToTrash = async (id) => {
    const res = await mailApi.moveToTrash(id);
    setSelectedEmail(null);
    setEmailShoppingItem(null);
    if (res?.stats) setMailStats(res.stats);
    loadEmails();
    showToast('🗑️ Email Dibuang', 'Pesan dipindahkan ke Sampah.');
  };

  const handleRestoreMail = async (id) => {
    const res = await mailApi.restoreMail(id);
    setSelectedEmail(null);
    setEmailShoppingItem(null);
    if (res?.stats) setMailStats(res.stats);
    loadEmails();
    showToast('♻️ Email Dipulihkan', 'Pesan dikembalikan ke Kotak Masuk.');
  };

  const handleMarkSpam = async (id) => {
    const res = await mailApi.markSpam(id);
    setSelectedEmail(null);
    setEmailShoppingItem(null);
    if (res?.stats) setMailStats(res.stats);
    loadEmails();
    showToast('🚫 Ditandai Spam', 'Pesan dipindahkan ke Spam.');
  };

  const handlePermanentDelete = async (id) => {
    const res = await mailApi.deleteMail(id);
    setSelectedEmail(null);
    setEmailShoppingItem(null);
    if (res?.stats) setMailStats(res.stats);
    loadEmails();
    showToast('💥 Email Terhapus', 'Pesan dihapus permanen.');
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
          activeMailFolder={activeMailFolder}
          onSelectMailFolder={handleSelectMailFolder}
          onOpenCompose={() => setShowCompose(true)}
          mailStats={mailStats}
          shoppingStats={shoppingStats}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <section style={{ height: '100%' }}>
          {activeTab === 'inbox' && (
            <MailView
              emails={emails}
              selectedEmail={selectedEmail}
              activeMailFolder={activeMailFolder}
              onSelectEmail={handleSelectEmail}
              onBackToList={() => setSelectedEmail(null)}
              onToggleStar={handleToggleStar}
              onMoveToTrash={handleMoveToTrash}
              onRestoreMail={handleRestoreMail}
              onMarkSpam={handleMarkSpam}
              onPermanentDelete={handlePermanentDelete}
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
