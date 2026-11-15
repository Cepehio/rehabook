/**
 * Admin analitikos kontroleris.
 * GET /api/stats/admin grąžina suvestinę admin skydelio diagramoms:
 *  - revenueByMonth: pajamos pagal mėnesį (neatšaukti vizitai);
 *  - visitsByStatus: vizitų skaičius pagal statusą;
 *  - specialistWorkload: specialistų užimtumas (vizitų sk.);
 *  - topServices: populiariausios paslaugos (top 5 pagal vizitų sk.).
 *
 * Skaičiavimai atliekami JS pusėje (duomenų kiekis nedidelis), kad nereikėtų
 * priklausyti nuo DB specifinių datų funkcijų. Atšaukti vizitai į pajamas/
 * užimtumą neįskaičiuojami; „vizitai pagal statusą“ rodo visus.
 */
import { prisma } from '../lib/prisma.js';

// Fiksuota statusų tvarka (su lietuviškomis raidėmis — kaip visoje sistemoje)
const STATUS_ORDER = ['laukiamas', 'patvirtintas', 'įvykęs', 'atšauktas'];

export async function getAdminStats(req, res, next) {
  try {
    const visits = await prisma.visit.findMany({
      include: { service: true, specialist: true },
    });

    // ─── Pajamos pagal mėnesį (neatšaukti) ───
    const revenueMap = new Map(); // 'YYYY-MM' -> suma
    for (const v of visits) {
      if (v.status === 'atšauktas') continue;
      const month = (v.date || '').slice(0, 7); // 'YYYY-MM'
      if (!month) continue;
      revenueMap.set(month, (revenueMap.get(month) || 0) + (v.price || 0));
    }
    const revenueByMonth = [...revenueMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, revenue]) => ({ month, revenue }));

    // ─── Vizitai pagal statusą ───
    const statusMap = new Map();
    for (const v of visits) {
      statusMap.set(v.status, (statusMap.get(v.status) || 0) + 1);
    }
    const visitsByStatus = STATUS_ORDER.filter((s) => statusMap.has(s)).map((status) => ({
      status,
      count: statusMap.get(status),
    }));

    // ─── Specialistų užimtumas (neatšaukti vizitai) ───
    const specMap = new Map(); // id -> { name, count }
    for (const v of visits) {
      if (v.status === 'atšauktas') continue;
      const id = v.specialistId;
      const name = v.specialist?.name || `#${id}`;
      const cur = specMap.get(id) || { specialistId: id, name, count: 0 };
      cur.count += 1;
      specMap.set(id, cur);
    }
    const specialistWorkload = [...specMap.values()].sort((a, b) => b.count - a.count);

    // ─── Populiariausios paslaugos (top 5) ───
    const svcMap = new Map(); // name -> { name, count, revenue }
    for (const v of visits) {
      if (v.status === 'atšauktas') continue;
      const name = v.service?.name || '—';
      const cur = svcMap.get(name) || { name, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += v.price || 0;
      svcMap.set(name, cur);
    }
    const topServices = [...svcMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    // ─── Bendros suvestinės reikšmės ───
    const totalRevenue = revenueByMonth.reduce((sum, r) => sum + r.revenue, 0);
    const totals = {
      visits: visits.length,
      revenue: totalRevenue,
      patients: await prisma.patient.count({ where: { deletedAt: null } }),
      specialists: await prisma.specialist.count({ where: { deletedAt: null } }),
    };

    res.json({ revenueByMonth, visitsByStatus, specialistWorkload, topServices, totals });
  } catch (err) {
    next(err);
  }
}
