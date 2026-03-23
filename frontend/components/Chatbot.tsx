import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, Sparkles, MessageSquare, Image as ImageIcon, MoreVertical, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { api } from '../src/lib/api';
import { useApp } from '../store';

import RoboIconUrl from './assets/logo-sym.svg';

/* ── Brand Logo Icon ── */
const RoboIcon = ({ size = 24 }: { size?: number }) => (
  <img src={RoboIconUrl} width={size} height={size} alt="Spndwisee Support Bot" style={{ objectFit: 'contain' }} />
);

/* ── Brand colors (indigo/blue from app's design system) ── */
const C = {
  bg: '#0E1116',
  card: '#161A22',
  text: '#E6EAF0',
  muted: '#9AA3B2',
  accent: '#4f46e5',       // indigo-600
  accentLight: '#6366f1',  // indigo-500
  accentBlue: '#2563eb',   // blue-600
  purple: '#b4a6ff',
  pink: '#ffb6c1',
};

interface Message { role: 'user' | 'assistant'; parts: string; }

const Chatbot: React.FC = () => {
  const { userName } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', parts: "Welcome to Spndwisee Support! I'm your AI Buddy. How may I assist you today?" }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFab, setShowFab] = useState(false);
  const timerRef = useRef<any>(null);
  const fabShownRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const threshold = Math.max(0, maxScroll * 0.8);

      const isShortPage = maxScroll <= 50;
      const isPast80 = window.scrollY >= threshold;

      if (isShortPage || isPast80) {
        if (!fabShownRef.current && !timerRef.current) {
          timerRef.current = setTimeout(() => {
            setShowFab(true);
            fabShownRef.current = true;
            timerRef.current = null;
          }, 2000);
        }
      } else {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        if (fabShownRef.current) {
          setShowFab(false);
          fabShownRef.current = false;
        }
      }
    };

    // Delay initial check to allow DOM to render
    const initialTimer = setTimeout(handleScroll, 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('scroll', handleScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    // Delay scroll to ensure suggestion chips are rendered in the DOM first
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, chatMode, suggestions]);

  /* Render formatted bot text: **bold**, • bullets, newlines */
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, li) => {
      // Bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      const rendered = parts.map((part, pi) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pi} style={{ color: C.text, fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        return <span key={pi}>{part}</span>;
      });

      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      if (isBullet) {
        const bulletText = line.trim().replace(/^[•\-]\s*/, '');
        const bParts = bulletText.split(/(\*\*[^*]+\*\*)/);
        const bRendered = bParts.map((part, pi) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={pi} style={{ color: C.text, fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
          return <span key={pi}>{part}</span>;
        });
        return <div key={li} style={{ paddingLeft: 8, margin: '3px 0', display: 'flex', gap: 6 }}><span style={{ color: C.accentLight, flexShrink: 0 }}>•</span><span>{bRendered}</span></div>;
      }
      if (!line.trim()) return <div key={li} style={{ height: 8 }} />;
      return <div key={li} style={{ margin: '2px 0' }}>{rendered}</div>;
    });
  };

  const displayName = userName || 'there';

  const handleSend = async (text?: string) => {
    const msgText = text || inputVal.trim();
    if (!msgText) return;
    if (!chatMode) setChatMode(true);

    const userMessage: Message = { role: 'user', parts: msgText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputVal('');
    setIsLoading(true);

    try {
      const res = await api.post('/chatbot/message', { messages: newMessages });
      if (res?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', parts: res.reply }]);
        setSuggestions(res.suggestions || []);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', parts: "Sorry, I couldn't process that. Please try again." }]);
        setSuggestions([]);
      }
    } catch (err: any) {
      console.error('[Chatbot]', err);
      setMessages(prev => [...prev, { role: 'assistant', parts: `Oops! ${err.message || "Something went wrong. Please try again."}` }]);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSend(); };
  const handleClose = () => { setIsOpen(false); setChatMode(false); };
  const handleBack = () => setChatMode(false);

  const historyItems = [
    { text: 'How is my privacy maintained here?', color: C.accentLight },
    { text: 'Is my bank data safe?', color: C.purple },
    { text: 'What features does Spndwisee offer?', color: C.pink },
  ];

  const portalContent = (
    <>
      {/* ── FAB ── */}
      <AnimatePresence>
        {!isOpen && showFab && (
          <div
            style={{
              position: 'fixed', bottom: '175px', left: '50%', transform: 'translateX(-50%)',
              width: '92%', maxWidth: '384px', pointerEvents: 'none',
              zIndex: 9998,
            }}
          >
            <motion.div
              key="fab-container"
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="absolute right-0 pointer-events-auto"
            >
              <div className="relative flex flex-col items-center justify-center group pointer-events-auto">

                {/* TOOLTIP PILL */}
                <span
                  className="absolute bottom-[80px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-40"
                  style={{
                    color: C.text, fontSize: 13, fontWeight: 500, background: 'rgba(0,0,0,0.8)',
                    padding: '8px 16px', borderRadius: 20, backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  💬 Need help with something?
                </span>

                <motion.button
                  onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="flex items-center justify-center bg-transparent border-none cursor-pointer p-0 focus:outline-none relative z-50 pointer-events-auto"
                >
                  <div style={{ width: 64, height: 64 }} className="pointer-events-none">
                    <RoboIcon size={64} />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Full-Screen Overlay ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', inset: 0, zIndex: 99999, background: C.bg }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{ width: '100%', height: '100%', maxWidth: 448, margin: '0 auto', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
            >
              {/* Ambient glow */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-25%', left: '-15%', width: '70%', height: '50%', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.12, background: `radial-gradient(circle, ${C.accentLight} 0%, transparent 70%)` }} />
                {/* Topography lines */}
                <svg style={{ position: 'absolute', top: -10, right: -10, opacity: 0.06 }} width="260" height="260" viewBox="0 0 100 100" fill="none" strokeWidth="0.4" stroke="white">
                  <path d="M10 20Q50 80 90 20M10 30Q50 90 90 30M10 40Q50 100 90 40M10 50Q50 110 90 50" />
                  <path d="M20 10Q80 50 20 90M30 10Q90 50 30 90M40 10Q100 50 40 90" />
                </svg>
              </div>

              {/* ── HEADER ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: chatMode ? '3rem 1.5rem 0.75rem' : '3rem 1.5rem 0', position: 'relative', zIndex: 10 }}>
                {chatMode ? (
                  <button onClick={handleBack} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, cursor: 'pointer' }}>
                    <ArrowLeft size={18} />
                  </button>
                ) : (
                  <button onClick={handleClose} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: C.text, fontSize: 14, fontWeight: 500 }}>Hi, {displayName}</span>
                  <span style={{ fontSize: 18 }}>👋</span>
                </div>
                {chatMode ? (
                  <button onClick={handleClose} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.card, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, fontSize: 11, fontWeight: 700 }}>
                    {(userName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* ─────────── HOME MENU ─────────── */}
              {!chatMode && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem', position: 'relative', zIndex: 10 }} className="hide-scrollbar">
                  {/* Title */}
                  <h1 style={{ fontSize: 36, lineHeight: 1.1, fontWeight: 300, color: C.text, letterSpacing: '-0.02em', margin: '1.5rem 0 2rem' }}>
                    How may I help<br />you today?
                  </h1>

                  {/* ── Cards Grid (exact Image 3 layout) ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', gap: 12 }}>
                    {/* Talk with Bot — LEFT, spans 2 rows */}
                    <button
                      onClick={() => setChatMode(true)}
                      style={{
                        gridColumn: '1', gridRow: '1 / 3',
                        background: `linear-gradient(135deg, ${C.accentBlue}, ${C.accent})`, borderRadius: 24, padding: '20px 18px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start',
                        textAlign: 'left', border: 'none', cursor: 'pointer', minHeight: 190,
                        boxShadow: `0 0 40px ${C.accent}25`, position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <RoboIcon size={20} />
                        </div>
                        <ArrowUpRight size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                      </div>
                      <span style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.15, color: '#fff', marginTop: 'auto' }}>Talk<br />with Bot</span>
                    </button>

                    {/* Chat with Bot — TOP RIGHT */}
                    <button
                      onClick={() => setChatMode(true)}
                      style={{
                        gridColumn: '2', gridRow: '1',
                        background: C.purple, borderRadius: 20, padding: '16px 14px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start',
                        textAlign: 'left', border: 'none', cursor: 'pointer', minHeight: 86,
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MessageSquare size={14} color="#000" />
                        </div>
                        <ArrowUpRight size={14} style={{ color: 'rgba(0,0,0,0.25)' }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#000', marginTop: 8 }}>Chat with Bot</span>
                    </button>

                    {/* Search by Image — BOTTOM RIGHT */}
                    <button
                      style={{
                        gridColumn: '2', gridRow: '2',
                        background: C.pink, borderRadius: 20, padding: '16px 14px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start',
                        textAlign: 'left', border: 'none', cursor: 'pointer', minHeight: 86,
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={14} color="#000" />
                        </div>
                        <ArrowUpRight size={14} style={{ color: 'rgba(0,0,0,0.25)' }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#000', marginTop: 8 }}>Search by Image</span>
                    </button>
                  </div>

                  {/* ── History ── */}
                  <div style={{ marginTop: 28, paddingBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ color: C.text, fontSize: 17, fontWeight: 600, margin: 0 }}>History</h3>
                      <button style={{ color: C.muted, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>See all</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {historyItems.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(item.text)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                            background: C.card, border: `1px solid rgba(255,255,255,0.04)`,
                            borderRadius: 16, cursor: 'pointer', width: '100%', textAlign: 'left',
                          }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MessageSquare size={14} color="#000" />
                          </div>
                          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</p>
                          <MoreVertical size={14} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────── CHAT VIEW ─────────── */}
              {chatMode && (
                <>
                  <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 120px', position: 'relative', zIndex: 10 }} className="hide-scrollbar">
                    {/* Date chip */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '5px 14px', borderRadius: 20, color: C.muted, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Today</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {messages.map((msg, i) => {
                        const isBot = msg.role === 'assistant';
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end' }}>
                            {isBot && (
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10, marginTop: 4 }}>
                                <RoboIcon size={16} />
                              </div>
                            )}
                            <div style={{
                              maxWidth: '78%', padding: '14px 18px', fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word',
                              ...(isBot
                                ? { background: C.card, color: 'rgba(255,255,255,0.88)', borderRadius: '20px 20px 20px 6px', border: '1px solid rgba(255,255,255,0.04)' }
                                : { background: `linear-gradient(135deg, ${C.accentBlue}, ${C.accent})`, color: '#fff', fontWeight: 500, borderRadius: '20px 6px 20px 20px', boxShadow: `0 0 25px ${C.accent}25` }
                              ),
                            }}>
                              {isBot ? renderFormattedText(msg.parts) : msg.parts}
                            </div>
                          </div>
                        );
                      })}

                      {/* Clickable suggestion chips */}
                      {!isLoading && suggestions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 40, paddingTop: 4 }}>
                          {suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => { setSuggestions([]); handleSend(s); }}
                              style={{
                                padding: '8px 14px', borderRadius: 20,
                                background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.accentLight}30`,
                                color: C.accentLight, fontSize: 12, fontWeight: 500,
                                cursor: 'pointer', textAlign: 'left', lineHeight: 1.3,
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { (e.target as HTMLElement).style.background = `${C.accent}20`; }}
                              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}

                      {isLoading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10, marginTop: 4 }}>
                            <RoboIcon size={16} />
                          </div>
                          <div style={{ background: C.card, borderRadius: '20px 20px 20px 6px', border: '1px solid rgba(255,255,255,0.04)', padding: '16px 22px', display: 'flex', gap: 6 }}>
                            <div className="animate-bounce" style={{ width: 6, height: 6, borderRadius: '50%', background: C.muted, animationDelay: '0ms' }} />
                            <div className="animate-bounce" style={{ width: 6, height: 6, borderRadius: '50%', background: C.muted, animationDelay: '150ms' }} />
                            <div className="animate-bounce" style={{ width: 6, height: 6, borderRadius: '50%', background: C.muted, animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input bar */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '12px 16px 28px', zIndex: 20, background: `linear-gradient(to top, ${C.bg} 65%, transparent)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.card, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 999, padding: '4px 6px 4px 16px' }}>
                      <button style={{ width: 36, height: 36, borderRadius: '50%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, cursor: 'pointer', flexShrink: 0 }}>
                        <Mic size={18} />
                      </button>
                      <input
                        type="text"
                        value={inputVal}
                        onChange={e => setInputVal(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 0', fontSize: 15, color: C.text, outline: 'none', minWidth: 0, fontFamily: 'inherit' }}
                      />
                      <button
                        onClick={() => handleSend()}
                        disabled={!inputVal.trim() || isLoading}
                        style={{
                          width: 40, height: 40, borderRadius: '50%', border: 'none',
                          background: `linear-gradient(135deg, ${C.accentBlue}, ${C.accent})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: (!inputVal.trim() || isLoading) ? 'not-allowed' : 'pointer',
                          opacity: (!inputVal.trim() || isLoading) ? 0.3 : 1,
                          boxShadow: `0 0 20px ${C.accent}30`, flexShrink: 0,
                        }}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return ReactDOM.createPortal(portalContent, document.body);
};

export default Chatbot;
