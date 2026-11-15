/**
 * Dizaino žetonai (Design Tokens)
 * 
 * Centralizuota vizualinio stiliaus konfigūracija.
 * Naudojama visuose komponentuose nuosekliam vaizdui užtikrinti.
 */

export const colors = {
  sage:       '#7A8B6F',
  sageDk:     '#5C6B52',
  sageLt:     '#A8B89E',
  sagePl:     '#E8EDE4',
  cream:      '#FAF7F2',
  creamDk:    '#F0EBE3',
  warmWh:     '#FEFCF9',
  char:       '#2C2C2C',
  charLt:     '#4A4A4A',
  slate:      '#6B7280',
  coral:      '#D4856A',
  coralLt:    '#E8A990',
  gold:       '#C4A265',
  err:        '#C75050',
  ok:         '#5C8A5C',
  border:     '#E5E0D8',
  card:       'rgba(255,255,255,0.9)',
  adminBg:    '#1a1f2e',
  adminCard:  '#232839',
  adminBorder:'#2d3348',
};

export const fonts = {
  display: "'Playfair Display', serif",
  body:    "'Source Sans 3', sans-serif",
};

export const radii = {
  sm:   '8px',
  md:   '12px',
  lg:   '20px',
  xl:   '28px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.06)',
  md: '0 4px 16px rgba(0,0,0,0.08)',
  lg: '0 8px 32px rgba(0,0,0,0.10)',
  xl: '0 16px 48px rgba(0,0,0,0.12)',
};

/** Sutrumpintas objektas greitam naudojimui komponentuose */
const theme = {
  c: colors,
  f: fonts,
  r: radii,
  sh: shadows,
};

export default theme;
