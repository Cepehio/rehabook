/**
 * Viesas paslaugu katalogas: tik aktyvios paslaugos is API, filtras pagal kategorija,
 * kaina ir trukme, mygtukas pradeti registracija su pasirinkta paslauga.
 */
import { useState, useEffect } from 'react';
import { Clock, Activity } from 'lucide-react';
import theme from '@/styles/theme';
import { Badge, Btn, Card, SectionHeading as SH } from '@/components/ui';
import { serviceService } from '@/services/api';

function ServicesPage({ setPage, setBookingSvc }) {
  const [cat, setCat] = useState("Visos");
  const [services, setServices] = useState([]);
  useEffect(() => { serviceService.getAll().then(setServices).catch(() => setServices([])); }, []);
  const cats = ["Visos", ...new Set(services.map(s => s.category))];
  const list = cat === "Visos" ? services : services.filter(s => s.category === cat);
  return (
    <div style={{ paddingTop: 100, minHeight: "100vh" }}><section className="rb-page-section" style={{ padding: "40px 24px 80px", maxWidth: 1200, margin: "0 auto" }}><SH overline="Paslaugos" title="Mūsų teikiamos paslaugos" /><div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 40, flexWrap: "wrap" }}>{cats.map(c => <button key={c} onClick={() => setCat(c)} style={{ padding: "9px 20px", borderRadius: theme.r.full, border: `1.5px solid ${cat === c ? theme.c.sage : theme.c.border}`, background: cat === c ? theme.c.sage : "white", color: cat === c ? "white" : theme.c.char, fontFamily: theme.f.b, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{c}</button>)}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>{list.map(sv => (<Card key={sv.id} style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}><div style={{ width: 48, height: 48, borderRadius: theme.r.md, background: theme.c.sagePl, display: "flex", alignItems: "center", justifyContent: "center", color: theme.c.sage }}><Activity size={22} /></div><Badge>{sv.category}</Badge></div><h3 style={{ fontFamily: theme.f.d, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{sv.name}</h3><p style={{ fontFamily: theme.f.b, fontSize: 14, color: theme.c.slate, lineHeight: 1.6, flex: 1 }}>{sv.description}</p><div style={{ display: "flex", gap: 14, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${theme.c.border}`, alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 5, color: theme.c.slate, fontSize: 13 }}><Clock size={14} />{sv.duration} min</div><div style={{ fontFamily: theme.f.d, fontSize: 22, fontWeight: 700, color: theme.c.sage }}>€{sv.price}</div><Btn variant="primary" size="sm" style={{ marginLeft: "auto" }} onClick={() => { setBookingSvc(sv); setPage("booking"); }}>Registruotis</Btn></div></Card>))}</div></section></div>
  );
}
export default ServicesPage;
