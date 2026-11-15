import { useState } from 'react';
import { Activity, Briefcase, User, Menu, X } from 'lucide-react';
import theme from '@/styles/theme';

const navLinks = [
  { id: 'home', label: 'Pradžia' },
  { id: 'services', label: 'Paslaugos' },
  { id: 'specialists', label: 'Specialistai' },
  { id: 'booking', label: 'Registruotis vizitui' },
];

/**
 * Viršutinė navigacija. Staliniame vaizde nuorodos rodomos eilute (kaip iki šiol);
 * siauruose ekranuose (≤768px, žr. globals.css) jos sudedamos į išskleidžiamą meniu,
 * atidaromą „hamburger“ mygtuku. Pasirinkus nuorodą meniu užsidaro.
 */
export default function Navbar({ currentPage, setPage, scrolled, setAppMode }) {
  // open - ar isskleistas mobilusis meniu.
  const [open, setOpen] = useState(false);
  const go = (fn) => (value) => {
    setOpen(false);
    fn(value);
  };
  const goPage = go(setPage);
  const goMode = go(setAppMode);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: scrolled || open ? 'rgba(250,247,242,0.95)' : 'transparent',
        backdropFilter: scrolled || open ? 'blur(20px)' : 'none',
        borderBottom: scrolled || open ? `1px solid ${theme.c.border}` : 'none',
        transition: 'all 0.4s',
        padding: scrolled ? '10px 0' : '18px 0',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logotipas */}
        <button
          onClick={() => goPage('home')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          aria-label="Pradžia"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.r.md,
              background: `linear-gradient(135deg,${theme.c.sage},${theme.c.sageDk})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={18} color="white" />
          </div>
          <span
            style={{
              fontFamily: theme.f.display,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '-.5px',
            }}
          >
            Reha<span style={{ color: theme.c.sage }}>Book</span>
          </span>
        </button>

        {/* Mobilus meniu mygtukas (rodomas tik siauruose ekranuose — globals.css) */}
        <button
          type="button"
          className="rb-nav-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="rb-nav-menu"
          aria-label={open ? 'Uždaryti meniu' : 'Atidaryti meniu'}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.c.warmWh,
            border: `1.5px solid ${theme.c.border}`,
            borderRadius: theme.r.md,
            color: theme.c.charLt,
            cursor: 'pointer',
          }}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Navigacija */}
        <div
          id="rb-nav-menu"
          className={'rb-nav-links' + (open ? ' is-open' : '')}
          style={{ display: 'flex', gap: 3, alignItems: 'center' }}
        >
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => goPage(link.id)}
              style={{
                background: currentPage === link.id ? theme.c.sagePl : 'none',
                border: 'none',
                padding: '7px 14px',
                borderRadius: theme.r.full,
                fontFamily: theme.f.body,
                fontSize: 14,
                fontWeight: currentPage === link.id ? 600 : 400,
                color: currentPage === link.id ? theme.c.sageDk : theme.c.charLt,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {link.label}
            </button>
          ))}

          <div
            className="rb-nav-divider"
            style={{ width: 1, height: 20, background: theme.c.border, margin: '0 6px' }}
          />

          <button
            onClick={() => goMode('specAuth')}
            style={{
              background: 'none',
              border: `1.5px solid ${theme.c.border}`,
              padding: '7px 14px',
              borderRadius: theme.r.full,
              fontFamily: theme.f.body,
              fontSize: 13,
              fontWeight: 500,
              color: theme.c.charLt,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Briefcase size={14} />
            Specialistams
          </button>

          <button
            onClick={() => goMode('patientAuth')}
            style={{
              background: 'none',
              border: `1.5px solid ${theme.c.border}`,
              padding: '7px 14px',
              borderRadius: theme.r.full,
              fontFamily: theme.f.body,
              fontSize: 13,
              fontWeight: 500,
              color: theme.c.charLt,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <User size={14} />
            Pacientams
          </button>
        </div>
      </div>
    </nav>
  );
}
