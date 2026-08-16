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
  Info
} from 'lucide-react';
import { systemApi } from '../services/api';
import { playClick, playHeartPop } from '../utils/sound';

export default function SettingsModal({
  isOpen,
  onClose,
  systemConfig,
  onDomainUpdated
}) {
  const [activeDomainInput, setActiveDomainInput] = useState(systemConfig?.activeDomain || '');
  const [dnsGuide, setDnsGuide] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

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

  const handlePresetSwitch = (domain) => {
    setActiveDomainInput(domain);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 252, 255, 0.98) 100%)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3a86ff 0%, #00b4d8 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Globe size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>
                Pengaturan Domain & Cloudflare
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Fleksibel ganti domain kapan saja antara staging dan domain utama
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

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '18px',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#059669' : '#dc2626',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`
          }}>
            {message.text}
          </div>
        )}

        {/* 1. Dynamic Domain Switcher */}
        <form onSubmit={handleSaveDomain} className="glass-card" style={{ padding: '20px', marginBottom: '20px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Zap size={16} color="#3a86ff" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Ganti Domain Aktif Seketika</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
            Semua alamat email (<code>shopping@</code>, <code>love@</code>, <code>acel@</code>, <code>haikal@</code>) akan langsung otomatis berganti ke domain yang kamu set di sini tanpa perlu rebuild/restart!
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              required
              className="glass-input"
              style={{ fontWeight: 700 }}
              value={activeDomainInput}
              onChange={(e) => setActiveDomainInput(e.target.value)}
              placeholder="acellimut.haikaldev.my.id atau acellimut.net"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="glass-btn glass-btn-primary"
              style={{ whiteSpace: 'nowrap', padding: '10px 20px' }}
            >
              {isSaving ? 'Menyimpan...' : 'Ganti Domain'}
            </button>
          </div>

          {/* Quick preset buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pilihan Cepat:</span>
            <button
              type="button"
              onClick={() => handlePresetSwitch('acellimut.haikaldev.my.id')}
              className="glass-pill"
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            >
              🛠️ Staging: acellimut.haikaldev.my.id
            </button>
            <button
              type="button"
              onClick={() => handlePresetSwitch('acellimut.net')}
              className="glass-pill"
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            >
              💎 Utama: acellimut.net
            </button>
          </div>
        </form>

        {/* 2. Cloudflare Worker Webhook Info */}
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldCheck size={16} color="#059669" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Webhook Endpoint Cloudflare Worker</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Masukkan URL dan Secret ini ke Cloudflare Worker (<code>cloudflare/worker.js</code>) untuk meneruskan email masuk:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              background: '#f8fafc',
              padding: '10px 14px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>WEBHOOK_URL:</div>
                <code style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                  https://{activeDomainInput || 'acellimut.haikaldev.my.id'}/api/mail/inbound
                </code>
              </div>
              <button
                onClick={() => handleCopy('webhook', `https://${activeDomainInput || 'acellimut.haikaldev.my.id'}/api/mail/inbound`)}
                className="glass-btn"
                style={{ padding: '6px 10px', fontSize: '0.72rem' }}
              >
                {copiedKey === 'webhook' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                <span>{copiedKey === 'webhook' ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              padding: '10px 14px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>WEBHOOK_SECRET:</div>
                <code style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                  {systemConfig?.webhookSecret || 'couple_secret_token_123'}
                </code>
              </div>
              <button
                onClick={() => handleCopy('secret', systemConfig?.webhookSecret || 'couple_secret_token_123')}
                className="glass-btn"
                style={{ padding: '6px 10px', fontSize: '0.72rem' }}
              >
                {copiedKey === 'secret' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                <span>{copiedKey === 'secret' ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. DNS Records Guide */}
        {dnsGuide && dnsGuide.dnsRecords && (
          <div className="glass-card" style={{ padding: '20px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Server size={16} color="#8338ec" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>DNS Record Cloudflare untuk {activeDomainInput}</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Salin record ini ke tab <b>DNS</b> di Cloudflare Dashboard kamu:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dnsGuide.dnsRecords.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f9f9fb',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem'
                  }}
                >
                  <div>
                    <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, marginRight: '8px', fontSize: '0.7rem' }}>
                      {rec.type}
                    </span>
                    <span style={{ fontWeight: 700 }}>{rec.name}</span> &rarr; <code>{rec.content}</code> {rec.priority ? `(Priority: ${rec.priority})` : ''}
                    <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>{rec.purpose}</div>
                  </div>

                  <button
                    onClick={() => handleCopy(`dns_${idx}`, rec.content)}
                    className="glass-btn"
                    style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                  >
                    {copiedKey === `dns_${idx}` ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
