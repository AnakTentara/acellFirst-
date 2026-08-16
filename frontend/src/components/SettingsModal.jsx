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
  Play
} from 'lucide-react';
import { systemApi, mailApi } from '../services/api';
import { playClick, playHeartPop } from '../utils/sound';

export default function SettingsModal({
  isOpen,
  onClose,
  systemConfig,
  onDomainUpdated
}) {
  const [activeTab, setActiveTab] = useState('domain'); // 'domain', 'smtp', 'ai', 'apidocs'
  const [activeDomainInput, setActiveDomainInput] = useState(systemConfig?.activeDomain || 'acellimut.my.id');
  const [dnsGuide, setDnsGuide] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

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
    if (systemConfig?.activeDomain) {
      setActiveDomainInput(systemConfig.activeDomain);
      fetchDnsGuide();
    }
  }, [systemConfig]);

  const fetchDnsGuide = async () => {
    try {
      const data = await systemApi.getDnsGuide();
      setDnsGuide(data);
    } catch (e) {}
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
        maxWidth: '720px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '28px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 250, 255, 0.98) 100%)',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(219, 234, 254, 0.8)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0284c7 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}>
              <Globe size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>
                Sistem & Pengaturan Acell Sanctuary
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Konfigurasi Domain, SMTP Outbound, AI OhhMyAgent, dan API Tester
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
            style={{ fontSize: '0.82rem', padding: '6px 14px', background: activeTab === 'ai' ? '#2563eb' : 'transparent', color: activeTab === 'ai' ? '#fff' : 'inherit' }}
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
            Dokumentasi & API Tester
          </button>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '18px',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: message.type === 'success' ? '#eff6ff' : '#fef2f2',
            color: message.type === 'success' ? '#2563eb' : '#dc2626',
            border: `1px solid ${message.type === 'success' ? '#bfdbfe' : '#fecaca'}`
          }}>
            {message.text}
          </div>
        )}

        {/* TAB 1: DOMAIN & ZERO TRUST */}
        {activeTab === 'domain' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card" style={{ padding: '18px', background: 'rgba(255, 255, 255, 0.9)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-main)' }}>
                🌐 Domain Aktif
              </h3>
              <form onSubmit={handleSaveDomain} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={activeDomainInput}
                  onChange={(e) => setActiveDomainInput(e.target.value.toLowerCase().trim())}
                  placeholder="acellimut.my.id"
                  className="glass-input"
                  style={{ flex: 1, fontSize: '0.9rem' }}
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="glass-btn glass-btn-primary"
                  style={{ whiteSpace: 'nowrap', padding: '0 20px' }}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Domain'}
                </button>
              </form>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Domain utama: <code style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>acellimut.my.id</code>
              </div>
            </div>

            {/* Zero Trust & Webhook Guide */}
            <div className="glass-card" style={{ padding: '18px', background: 'rgba(255, 255, 255, 0.9)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={18} color="#2563eb" />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Konfigurasi Cloudflare Zero Trust & Email Routing
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                    1. Cloudflare Zero Trust Tunnel (Port 23625):
                  </div>
                  <p style={{ color: '#3b82f6', margin: 0 }}>
                    Arahkan Public Hostname <b>acellimut.my.id</b> &rarr; Service: <code>HTTP://localhost:23625</code>
                  </p>
                </div>

                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>2. Webhook Inbound Endpoint:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('webhook_url', `https://${activeDomainInput}/api/mail/inbound`)}
                      className="glass-pill"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    >
                      {copiedKey === 'webhook_url' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      Salin URL
                    </button>
                  </div>
                  <code style={{ fontSize: '0.78rem', color: '#2563eb' }}>
                    https://{activeDomainInput}/api/mail/inbound
                  </code>
                </div>

                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>3. Webhook Secret:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('secret', 'Senin23062025')}
                      className="glass-pill"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    >
                      {copiedKey === 'secret' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      Salin Secret
                    </button>
                  </div>
                  <code style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 700 }}>
                    Senin23062025
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SMTP OUTBOUND */}
        {activeTab === 'smtp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="glass-card" style={{ padding: '18px', background: 'rgba(255, 255, 255, 0.9)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Mail size={18} color="#2563eb" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Pengaturan & Uji Koneksi SMTP Outbound
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Gunakan SMTP gratis seperti <b>Resend</b>, <b>Brevo</b>, atau <b>Gmail App Password</b> untuk mengirim email nyata ke luar (ke Gmail/Yahoo dll). Jika belum diisi, pengiriman email berjalan dalam <b>Mode Simulasi Preview</b> yang aman.
              </p>

              <form onSubmit={handleTestSmtp} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    SMTP Host (contoh: smtp.resend.com / smtp.gmail.com)
                  </label>
                  <input
                    type="text"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    placeholder="smtp.resend.com"
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Port
                  </label>
                  <input
                    type="text"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })}
                    placeholder="587"
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    SMTP Username / Email
                  </label>
                  <input
                    type="text"
                    value={smtpForm.user}
                    onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                    placeholder="resend"
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    SMTP Password / API Key
                  </label>
                  <input
                    type="password"
                    value={smtpForm.pass}
                    onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                    placeholder="re_..."
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={smtpForm.secure}
                      onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                    />
                    <span>Gunakan SSL/TLS (Port 465)</span>
                  </label>

                  <button
                    type="submit"
                    disabled={smtpTesting}
                    className="glass-btn glass-btn-primary"
                    style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                  >
                    <Zap size={14} />
                    {smtpTesting ? 'Menguji...' : 'Uji Koneksi SMTP'}
                  </button>
                </div>
              </form>

              {smtpResult && (
                <div style={{
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  background: smtpResult.connected ? '#eff6ff' : '#fef2f2',
                  border: `1px solid ${smtpResult.connected ? '#bfdbfe' : '#fecaca'}`,
                  color: smtpResult.connected ? '#1e40af' : '#dc2626'
                }}>
                  <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                    {smtpResult.connected ? '🎉 SMTP Terkoneksi!' : '⚠️ Info SMTP'}
                  </div>
                  <div>{smtpResult.message}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AI INTELLIGENCE & OHHMYAGENT */}
        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.95)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    AI Email & Courier Intelligence
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Powered by <b>OhhMyAgent.com</b> (Model: <code>ohh/gpt-5.6</code>) / OpenAI
                  </p>
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px', fontSize: '0.8rem', color: '#166534', marginBottom: '16px' }}>
                ✨ <b>Fitur Cerdas Aktif:</b> AI menganalisis otomatis setiap email masuk ke <code>shopping@</code>, <code>etall@</code>, atau <code>us@</code> untuk mengekstrak ekspedisi (SPX, JNE, J&T, SiCepat, Lion Parcel), nomor resi, total harga, estimasi tiba, serta koordinat radar peta pengiriman!
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    OhhMyAgent / OpenAI API Key (<code>sk-mvx-...</code> atau <code>sk-...</code>)
                  </label>
                  <input
                    type="password"
                    value={aiForm.apiKey}
                    onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })}
                    placeholder="sk-mvx-your-api-key"
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    * Jika dikosongkan, sistem tetap berjalan normal menggunakan Heuristic Regex Courier Parser lokal.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      AI Base URL
                    </label>
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
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      AI Model
                    </label>
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
                  style={{ padding: '10px 18px', fontSize: '0.85rem', marginTop: '4px' }}
                >
                  <Zap size={14} />
                  {aiTesting ? 'AI Sedang Menganalisis...' : '⚡ Uji AI Analisis Resi (OhhMyAgent / GPT-5.6)'}
                </button>
              </div>

              {/* AI Test Result Display */}
              {aiResult && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  background: aiResult.success ? '#f8fafc' : '#fef2f2',
                  border: `1px solid ${aiResult.success ? '#cbd5e1' : '#fecaca'}`,
                  color: '#0f172a'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, color: '#2563eb' }}>
                      Hasil Analisis AI ({aiResult.modelUsed || 'Heuristic Fallback'}):
                    </span>
                    <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>
                      {aiResult.hasApiKey ? 'API Key Terpasang' : 'Local Fallback Mode'}
                    </span>
                  </div>
                  <pre style={{ margin: 0, padding: '10px', background: '#0f172a', color: '#38bdf8', borderRadius: '8px', overflowX: 'auto', fontSize: '0.75rem' }}>
                    {JSON.stringify(aiResult.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: API DOCUMENTATION & TESTER */}
        {activeTab === 'apidocs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.9)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Code size={18} color="#2563eb" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Interactive API Explorer
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Pilih endpoint di bawah untuk uji respons JSON secara langsung:
              </p>

              {/* Endpoint Preset Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {[
                  { m: 'GET', url: '/api/love/counter', label: '💕 Love Counter' },
                  { m: 'GET', url: '/api/auth/profiles', label: '👥 User Profiles' },
                  { m: 'GET', url: '/api/mail/inbox', label: '📬 Mail Inbox' },
                  { m: 'GET', url: '/api/shopping/items', label: '🛍️ Shopping Items' },
                  { m: 'GET', url: '/api/wishlist/items', label: '✨ Wishlist' },
                  { m: 'GET', url: '/api/system/config', label: '⚙️ System Config' }
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

              {/* Runner Bar */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
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

              {/* Response Viewer */}
              {apiResponse && (
                <div style={{ background: '#0f172a', borderRadius: '12px', padding: '14px', color: '#38bdf8', fontSize: '0.78rem', fontFamily: 'monospace', maxHeight: '220px', overflowY: 'auto' }}>
                  <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
