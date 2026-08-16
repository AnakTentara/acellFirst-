import React, { useState, useEffect, useCallback } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import MailView from './components/MailView';
import ShoppingTracker from './components/ShoppingTracker';
import LoveLetters from './components/LoveLetters';
import Wishlist from './components/Wishlist';
import SettingsModal from './components/SettingsModal';
import ComposeMailModal from './components/ComposeMailModal';
import LoginModal from './components/LoginModal';

import ErrorBoundary from './components/ErrorBoundary';

import {
  authApi,
  mailApi,
  shoppingApi,
  loveApi,
  wishlistApi,
  systemApi,
  subscribeToEvents,
  getToken,
  getStoredUser,
  clearSession,
  setUnauthorizedHandler
} from './services/api';
import { playChime, playHeartPop } from './utils/sound';
import confetti from 'canvas-confetti';

const ANNIVERSARY = '2025-06-23';

function computeDaysTogether(dateStr) {
  const start = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '...';
  const today = new Date();
  const days = Math.floor((today - start) / 86_400_000);
  return days >= 0 ? String(days) : '0';
}

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('inbox');
  const [activeMailFolder, setActiveMailFolder] = useState('inbox');
  const [mailSearch, setMailSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  // Start locked. The session check below opens the app only if a stored
  // token is still valid, so no data is ever fetched before authentication.
  const [isBooting, setIsBooting] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
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

  // Any 401 anywhere in the app drops straight back to the lock screen
  // instead of leaving a half-loaded UI behind.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCurrentUser(null);
    });
  }, []);

  // Boot: restore an existing session, or show the lock screen.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setDaysTogether(computeDaysTogether(ANNIVERSARY));
      await loadProfiles();

      if (!getToken()) {
        if (!cancelled) setIsBooting(false);
        return;
      }

      try {
        const res = await authApi.me();
        if (cancelled) return;
        setCurrentUser(res.user || getStoredUser());
        await loadInitialData();
      } catch {
        // Token expired or revoked.
        clearSession();
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // SSE only runs while logged in — it needs the token in the URL.
  useEffect(() => {
    if (!currentUser) return undefined;

    const unsubscribe = subscribeToEvents((event, data) => {
      if (event === 'new_email') {
        playChime();
        showToast('📬 Email Baru Masuk!', `${data.email?.subject} (${data.email?.from_name || data.email?.from_address})`);
        loadEmails();
        loadShopping();
      } else if (
        event === 'mail_read_update' || event === 'mail_trash' ||
        event === 'mail_restore' || event === 'mail_spam' ||
        event === 'mail_deleted' || event === 'outbound_email_sent'
      ) {
        if (data?.stats) setMailStats(data.stats);
        loadEmails();
      } else if (event === 'new_love_letter' || event === 'letter_opened') {
        playHeartPop();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        if (event === 'new_love_letter') {
          showToast('💌 Surat Cinta!', 'Ada surat baru untuk kamu 💙');
        }
        loadLoveLetters();
      } else if (event === 'shopping_update' || event === 'shopping_deleted') {
        loadShopping();
      } else if (event === 'wishlist_update' || event === 'wishlist_deleted') {
        loadWishlist();
      } else if (event === 'profile_update') {
        loadProfiles();
      }
    }, setIsLiveConnected);

    return () => { if (unsubscribe) unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Re-query whenever the (already debounced) search term changes.
  useEffect(() => {
    if (!currentUser) return;
    loadEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailSearch]);

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
      // The endpoint returns `users`, not `profiles` — reading the wrong key
      // meant the profile list was permanently empty.
      const res = await authApi.getProfiles();
      if (res.success && Array.isArray(res.users)) {
        setProfiles(res.users);
      }
    } catch { /* offline: lock screen still renders */ }
  };

  const loadSystemConfig = async () => {
    try {
      const res = await systemApi.getConfig();
      if (res.success && res.config) {
        setSystemConfig(res.config);
        if (res.config.activeDomain) setActiveDomain(res.config.activeDomain);
        if (res.config.anniversaryDate) {
          setDaysTogether(computeDaysTogether(res.config.anniversaryDate));
        }
      }
    } catch { /* non-fatal */ }
  };

  const loadEmails = async (folderOverride, searchOverride) => {
    try {
      const folder = folderOverride || activeMailFolder || 'inbox';
      const role = currentUser?.role || 'boy';
      const search = searchOverride !== undefined ? searchOverride : mailSearch;
      const params = { folder, role };
      // Only send the key when there is a term — an empty `search=` would still
      // add a LIKE '%%' to the query for nothing.
      if (search) params.search = search;
      const res = await mailApi.getInbox(params);
      if (res.success) {
        setEmails(res.emails);
        setMailStats(res.stats);
      }
    } catch (e) {}
  };

  // Called (debounced) by MailView so search reaches the whole mailbox, not
  // just the 150 rows already loaded.
  const handleMailSearch = useCallback((term) => {
    setMailSearch(prev => (prev === term ? prev : term));
  }, []);

  const handleSelectMailFolder = (folder) => {
    setActiveMailFolder(folder);
    setSelectedEmail(null);
    setEmailShoppingItem(null);
    // A term left over from the previous folder makes the new one look empty.
    setMailSearch('');
    loadEmails(folder, '');
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
        // The row from /inbox is a list summary; only the detail response
        // carries attachments. Upgrade the open email so the reader sees them.
        if (detail.email) {
          setSelectedEmail(prev => (prev && prev.id === mail.id ? { ...prev, ...detail.email } : prev));
        }
      }
      // 2. Mark as read on backend and sync exact stats
      const readRes = await mailApi.markRead(mail.id, currentUser?.role || 'boy');
      if (readRes?.stats) {
        setMailStats(readRes.stats);
      }
    } catch (e) {}
  };

  const handleToggleStar = async (id) => {
    // 1. Instant optimistic update
    setEmails(prev => prev.map(m => m.id === id ? { ...m, is_starred: m.is_starred === 1 ? 0 : 1 } : m));
    setSelectedEmail(prev => prev && prev.id === id ? { ...prev, is_starred: prev.is_starred === 1 ? 0 : 1 } : prev);

    try {
      const res = await mailApi.toggleStar(id);
      if (res?.stats) setMailStats(res.stats);
    } catch (e) {}
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

  // Called by LoginModal after a real, server-verified login.
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    loadInitialData();
  };

  // Switching user now requires the other person's PIN — it can't silently
  // reuse the current session, which is what made the role check meaningless.
  const handleSwitchUser = () => {
    clearSession();
    setCurrentUser(null);
    setEmails([]);
    setSelectedEmail(null);
  };

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
  };

  const handleRefreshShopping = async (id) => {
    try {
      const res = await shoppingApi.refresh(id);
      showToast(
        res.updated ? '🚚 Tracking Diperbarui' : 'ℹ️ Belum Ada Update',
        res.updated ? `${res.checkpointCount} checkpoint asli tersinkron.` : res.message
      );
      loadShopping();
    } catch (err) {
      showToast('⚠️ Gagal Sinkron', err.message);
    }
  };

  // Locked: render nothing but the lock screen. No data request is made and
  // no couple content can flash on screen before authentication.
  if (isBooting) {
    return (
      <div className="boot-screen">
        <div className="boot-heart">💙</div>
        <p>Membuka sanctuary…</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginModal
        isOpen={true}
        profiles={profiles}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <TopBar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        profiles={profiles}
        daysTogether={daysTogether}
        activeDomain={activeDomain}
        isLiveConnected={isLiveConnected}
        onOpenSettings={() => setShowSettings(true)}
        onSimulateMail={handleSimulateMail}
        onRefresh={loadInitialData}
        onToggleMobileNav={() => setIsMobileNavOpen((v) => !v)}
      />

      {/* Main Grid: Sidebar + Viewport */}
      <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobileNavOpen ? 'mobile-nav-open' : ''}`}>
        {isMobileNavOpen && (
          <div className="mobile-nav-scrim" onClick={() => setIsMobileNavOpen(false)} />
        )}

        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          activeMailFolder={activeMailFolder}
          onSelectMailFolder={(folder) => { handleSelectMailFolder(folder); setIsMobileNavOpen(false); }}
          onOpenCompose={() => { setShowCompose(true); setIsMobileNavOpen(false); }}
          mailStats={mailStats}
          shoppingStats={shoppingStats}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        <section className="viewport">
          <ErrorBoundary key={activeTab}>
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
              onSearch={handleMailSearch}
            />
          )}

          {activeTab === 'shopping' && (
            <ShoppingTracker
              items={shoppingItems}
              stats={shoppingStats}
              onUpdateStatus={handleUpdateShoppingStatus}
              onDeleteItem={handleDeleteShoppingItem}
              onAddManual={handleAddManualShopping}
              onRefreshItem={handleRefreshShopping}
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
          </ErrorBoundary>
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

      {/* Toast Notification */}
      {toast && (
        <div className="app-toast">
          <div className="app-toast-title">{toast.title}</div>
          <div className="app-toast-body">{toast.message}</div>
        </div>
      )}
    </div>
  );
}
