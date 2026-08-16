import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Copy, 
  Check, 
  RefreshCw, 
  Server, 
  ShieldCheck, 
  ExternalLink, 
  Calendar, 
  Mail,
  Zap,
  Info,
  Code,
  CheckCircle2,
  AlertTriangle,
  Play,
  Home,
  MapPin,
  Plus,
  Trash2,
  Star,
  X
} from 'lucide-react';
import { systemApi, mailApi, addressApi } from '../services/api';
import { playClick, playHeartPop } from '../utils/sound';

export default function SettingsModal({
  isOpen,
  onClose,
  systemConfig,
  onDomainUpdated
}) {
  const [activeTab, setActiveTab] = useState('address'); // 'address', 'domain', 'smtp', 'ai', 'apidocs'
  const [activeDomainInput, setActiveDomainInput] = useState(systemConfig?.activeDomain || 'acellimut.my.id');
  const [dnsGuide, setDnsGuide] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Address states
  const [addresses, setAddresses] = useState([]);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    label: '',
    recipient_name: 'Princess Acell & Prince Haikal',
    phone_number: '0812-2306-2025',
    full_address: '',
    city: 'Bandung',
    is_primary: false,
    notes: ''
  });

  // SMTP Testing state
  const [smtpForm, setSmtpForm] = useState({
    host: '',
    port: '587',
    user: '',
    pass: '',
    secure: false
  });
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpResult, setSmtpResult] = useState(null);

  // AI & OhhMyAgent State
  const [aiForm, setAiForm] = useState({
    apiKey: '',
    baseUrl: 'https://ohhmyagent.com/v1',
    model: 'ohh/gpt-5.6'
  });
  const [aiTesting, setAiTesting] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // API Tester state
  const [apiEndpoint, setApiEndpoint] = useState('/api/love/counter');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiPayload, setApiPayload] = useState('{}');
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAddresses();
      if (systemConfig?.activeDomain) {
        setActiveDomainInput(systemConfig.activeDomain);
        fetchDnsGuide();
      }
    }
  }, [isOpen, systemConfig]);

  const fetchAddresses = async () => {
    try {
      const res = await addressApi.getAddresses();
      if (res.success) setAddresses(res.addresses);
    } catch (e) {}
  };

  const fetchDnsGuide = async () => {
    try {
      const data = await systemApi.getDnsGuide();
      setDnsGuide(data);
    } catch (e) {}
  };

  const handleSetPrimaryAddress = async (id) => {
    try {
      playClick();
      await addressApi.setPrimary(id);
      fetchAddresses();
      playHeartPop();
    } catch (err) {
      alert('Gagal mengganti alamat utama: ' + err.message);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Hapus alamat ini dari daftar Sanctuary?')) return;
    try {
      playClick();
      await addressApi.deleteAddress(id);
      fetchAddresses();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    try {
      await addressApi.addAddress(newAddressForm);
      setShowAddAddressForm(false);
      setNewAddressForm({
        label: '',
        recipient_name: 'Princess Acell & Prince Haikal',
        phone_number: '0812-2306-2025',
        full_address: '',
        city: 'Bandung',
        is_primary: false,
        notes: ''
      });
      fetchAddresses();
      playHeartPop();
    } catch (err) {
      alert('Gagal menambah alamat: ' + err.message);
    }
  };

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    playClick();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveDomain = async (e) => {
    e.preventDefault();
    if (!activeDomainInput) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await systemApi.switchDomain(activeDomainInput);
      playHeartPop();
      setMessage({ type: 'success', text: `✨ Domain berhasil diganti ke ${res.activeDomain}!` });
      onDomainUpdated(res.activeDomain);
      fetchDnsGuide();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSmtp = async (e) => {
    e.preventDefault();
    setSmtpTesting(true);
    setSmtpResult(null);
    try {
      const res = await mailApi.verifySmtp(smtpForm.host ? smtpForm : {});
      setSmtpResult(res);
      playClick();
    } catch (err) {
      setSmtpResult({ connected: false, message: err.message });
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/mail/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiForm.apiKey,
          baseUrl: aiForm.baseUrl,
          model: aiForm.model
        })
      });
      const data = await res.json();
      setAiResult(data);
      playClick();
    } catch (err) {
      setAiResult({ success: false, error: err.message });
    } finally {
      setAiTesting(false);
    }
  };

  const handleRunApiTest = async () => {
    setApiLoading(true);
    setApiResponse(null);
    try {
      const options = {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' }
      };
      if (apiMethod !== 'GET') {
        options.body = apiPayload;
      }
      const res = await fetch(apiEndpoint, options);
      const data = await res.json();
      setApiResponse(data);
      playClick();
    } catch (err) {
      setApiResponse({ error: err.message });
    } finally {
      setApiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
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
      zIndex: 999,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '760px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        background: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}>
              <Home size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>
                Sistem & Pengaturan Acell Sanctuary
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Kelola Alamat Pengiriman, Domain, SMTP, AI OhhMyAgent, dan API Tester
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="glass-btn"
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            Tutup
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(219, 234, 254, 0.6)', paddingBottom: '10px', overflowX: 'auto' }}>
          <button
            onClick={() => setActiveTab('address')}
            className={`glass-pill ${activeTab === 'address' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <Home size={14} />
            Alamat Pengiriman (Sanctuary)
          </button>
          <button
            onClick={() => setActiveTab('domain')}
            className={`glass-pill ${activeTab === 'domain' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <Globe size={14} />
            Domain & Zero Trust
          </button>
          <button
            onClick={() => setActiveTab('smtp')}
            className={`glass-pill ${activeTab === 'smtp' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <Mail size={14} />
            SMTP Outbound Mail
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`glass-pill ${activeTab === 'ai' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <Zap size={14} />
            AI & OhhMyAgent
          </button>
          <button
            onClick={() => setActiveTab('apidocs')}
            className={`glass-pill ${activeTab === 'apidocs' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <Code size={14} />
            Dokumentasi & API
          </button>
        </div>

        {/* TAB 1: ALAMAT PENGIRIMAN (COUPLE SANCTUARY ADDRESSES) */}
        {activeTab === 'address' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Alamat Pengiriman Acell & Haikal
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Alamat tujuan pengiriman paket belanja (Shopee, Tokopedia, TikTok Shop) & titik radar maps.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddAddressForm(true)}
                className="glass-btn glass-btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} />
                <span>Tambah Alamat</span>
              </button>
            </div>

            {/* Address Cards List */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {addresses.map((addr) => {
                const isPrimary = addr.is_primary === 1;

                return (
                  <div
                    key={addr.id}
                    className="glass-card"
                    style={{
                      padding: '16px 20px',
                      borderRadius: '14px',
                      background: isPrimary ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : '#ffffff',
                      border: isPrimary ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {addr.label}
                        </span>
                        {isPrimary && (
                          <span style={{ fontSize: '0.68rem', background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                            ⭐ ALAMAT UTAMA (RADAR MAP)
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>
                        {addr.recipient_name} • <span style={{ color: '#64748b' }}>{addr.phone_number}</span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.4 }}>
                        {addr.full_address} (<b>{addr.city}</b>)
                      </div>

                      {addr.notes && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                          Catatan: {addr.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryAddress(addr.id)}
                          className="glass-btn glass-btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          title="Jadikan Alamat Utama"
                        >
                          <Star size={13} fill="#fff" />
                          <span>Pilih Utama</span>
                        </button>
                      )}

                      {addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="glass-btn"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#dc2626' }}
                          title="Hapus Alamat"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Address Modal Form */}
            {showAddAddressForm && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.5)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px'
              }}>
                <form onSubmit={handleSaveNewAddress} className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>Tambah Alamat Baru</h3>
                    <button type="button" onClick={() => setShowAddAddressForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Label Alamat</label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.label}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, label: e.target.value })}
                        placeholder="Contoh: Rumah Haikal Jakarta / Villa Bandung"
                        className="glass-input"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nama Penerima</label>
                        <input
                          type="text"
                          required
                          value={newAddressForm.recipient_name}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, recipient_name: e.target.value })}
                          className="glass-input"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>No. Handphone</label>
                        <input
                          type="text"
                          required
                          value={newAddressForm.phone_number}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, phone_number: e.target.value })}
                          className="glass-input"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Alamat Lengkap</label>
                      <textarea
                        required
                        rows={2}
                        value={newAddressForm.full_address}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, full_address: e.target.value })}
                        placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kode pos"
                        className="glass-input"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Kota / Kabupaten</label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.city}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, city: e.target.value })}
                        placeholder="Bandung / Jakarta Selatan / Tangerang / Surabaya / dll"
                        className="glass-input"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <input
                        type="checkbox"
                        id="is_primary_checkbox"
                        checked={newAddressForm.is_primary}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, is_primary: e.target.checked })}
                      />
                      <label htmlFor="is_primary_checkbox" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                        Jadikan Alamat Utama Pengiriman
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="glass-btn glass-btn-primary"
                      style={{ width: '100%', marginTop: '6px', padding: '12px' }}
                    >
                      Simpan Alamat
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DOMAIN MANAGEMENT */}
        {activeTab === 'domain' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <form onSubmit={handleSaveDomain} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  Domain Aktif Aplikasi
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={activeDomainInput}
                    onChange={(e) => setActiveDomainInput(e.target.value)}
                    className="glass-input"
                    placeholder="acellimut.my.id"
                    style={{ flex: 1, fontSize: '0.9rem' }}
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="glass-btn glass-btn-primary"
                    style={{ padding: '0 20px', whiteSpace: 'nowrap' }}
                  >
                    {isSaving ? 'Menyimpan...' : 'Ganti Domain'}
                  </button>
                </div>
              </div>

              {message && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: message.type === 'success' ? '#059669' : '#dc2626',
                  border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                }}>
                  {message.text}
                </div>
              )}
            </form>

            {dnsGuide && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e40af', marginBottom: '10px' }}>
                  Panduan DNS Cloudflare untuk {dnsGuide.domain}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(dnsGuide.records || []).map((rec, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                      <div>
                        <b>{rec.type}</b> • <code>{rec.name}</code> &rarr; <code>{rec.content}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(`dns_${idx}`, rec.content)}
                        className="glass-btn"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                      >
                        {copiedKey === `dns_${idx}` ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SMTP OUTBOUND MAIL */}
        {activeTab === 'smtp' && (
          <form onSubmit={handleTestSmtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>SMTP Host</label>
                <input
                  type="text"
                  value={smtpForm.host}
                  onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                  placeholder="smtp.resend.com / mail.acellimut.my.id"
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Port</label>
                <input
                  type="text"
                  value={smtpForm.port}
                  onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })}
                  placeholder="587 / 465"
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Username / API Key</label>
                <input
                  type="text"
                  value={smtpForm.user}
                  onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                  placeholder="resend / email@domain"
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Password / Secret</label>
                <input
                  type="password"
                  value={smtpForm.pass}
                  onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                  placeholder="re_••••••••"
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={smtpTesting}
              className="glass-btn glass-btn-primary"
              style={{ padding: '12px', fontSize: '0.88rem' }}
            >
              {smtpTesting ? 'Menguji Koneksi SMTP...' : 'Uji Verifikasi Koneksi SMTP'}
            </button>

            {smtpResult && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: smtpResult.connected ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${smtpResult.connected ? '#a7f3d0' : '#fecaca'}`,
                fontSize: '0.84rem',
                color: smtpResult.connected ? '#059669' : '#dc2626'
              }}>
                <b>{smtpResult.connected ? '✅ Terhubung Berhasil!' : '❌ Gagal Terhubung:'}</b> {smtpResult.message || smtpResult.error}
              </div>
            )}
          </form>
        )}

        {/* TAB 4: AI & OHHMYAGENT */}
        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '14px', fontSize: '0.82rem', color: '#1e40af' }}>
              ✨ <b>OhhMyAgent.com GPT-5.6</b> otomatis membaca email receipts, mendeteksi ekspedisi pengiriman (SPX, J&T Cargo, JNE, SiCepat, Lion Parcel), menghitung estimasi tiba & titik maps.
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>AI API Key (OhhMyAgent / OpenAI)</label>
              <input
                type="password"
                value={aiForm.apiKey}
                onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })}
                placeholder="sk-•••••••• (atau set di .env server)"
                className="glass-input"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>AI Base URL</label>
                <input
                  type="text"
                  value={aiForm.baseUrl}
                  onChange={(e) => setAiForm({ ...aiForm, baseUrl: e.target.value })}
                  placeholder="https://ohhmyagent.com/v1"
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>AI Model</label>
                <input
                  type="text"
                  value={aiForm.model}
                  onChange={(e) => setAiForm({ ...aiForm, model: e.target.value })}
                  placeholder="ohh/gpt-5.6"
                  className="glass-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestAi}
              disabled={aiTesting}
              className="glass-btn glass-btn-primary"
              style={{ padding: '12px', fontSize: '0.88rem' }}
            >
              {aiTesting ? 'Memanggil OhhMyAgent GPT-5.6...' : '⚡ Jalankan Test Parsing AI'}
            </button>

            {aiResult && (
              <div style={{ background: '#0f172a', borderRadius: '12px', padding: '14px', color: '#38bdf8', fontSize: '0.78rem', fontFamily: 'monospace', maxHeight: '200px', overflowY: 'auto' }}>
                <pre>{JSON.stringify(aiResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: API TESTER */}
        {activeTab === 'apidocs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { m: 'GET', url: '/api/addresses', label: '🏠 Addresses' },
                { m: 'GET', url: '/api/love/counter', label: '💕 Love Counter' },
                { m: 'GET', url: '/api/mail/inbox', label: '📬 Mail Inbox' },
                { m: 'GET', url: '/api/shopping/items', label: '🛍️ Shopping Items' },
                { m: 'GET', url: '/api/wishlist/items', label: '✨ Wishlist' }
              ].map(ep => (
                <button
                  key={ep.url}
                  type="button"
                  onClick={() => {
                    setApiMethod(ep.m);
                    setApiEndpoint(ep.url);
                  }}
                  className="glass-pill"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <b>{ep.m}</b> {ep.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={apiMethod}
                onChange={(e) => setApiMethod(e.target.value)}
                className="glass-input"
                style={{ width: '100px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>

              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="glass-input"
                style={{ flex: 1, fontSize: '0.85rem', fontFamily: 'monospace' }}
              />

              <button
                type="button"
                onClick={handleRunApiTest}
                disabled={apiLoading}
                className="glass-btn glass-btn-primary"
                style={{ padding: '0 18px', fontSize: '0.85rem' }}
              >
                <Play size={14} />
                {apiLoading ? 'Memanggil...' : 'Send'}
              </button>
            </div>

            {apiResponse && (
              <div style={{ background: '#0f172a', borderRadius: '12px', padding: '14px', color: '#38bdf8', fontSize: '0.78rem', fontFamily: 'monospace', maxHeight: '200px', overflowY: 'auto' }}>
                <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
