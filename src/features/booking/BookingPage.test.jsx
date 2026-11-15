import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import BookingPage from './BookingPage';
import { serviceService, visitService, getStoredSession } from '@/services/api';
vi.mock('@/services/api', () => ({
  serviceService: { getAll: vi.fn() },
  visitService: { getAvailability: vi.fn(), create: vi.fn() },
  getStoredSession: vi.fn(),
}));
const draft = { service: 1, specialist: 2, date: '2099-01-05', time: '09:00' };
const specialists = [{ id: 2, name: 'Testo specialistas', available: true, photo: 'TS' }];
/** API dienos laikų lentelė: laisvi, užimti ir persidengiantys su savais vizitais laikai. */
const table = (available, taken = [], own = []) => ({
  slots: [...available, ...taken, ...own].sort(),
  taken,
  own,
  available,
});
function Location() {
  const value = useLocation();
  return <output aria-label="Kelias">{value.pathname + value.search}</output>;
}
function mount() {
  return render(
    <MemoryRouter initialEntries={['/registracija']}>
      <BookingPage specialists={specialists} />
      <Location />
    </MemoryRouter>
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem('rehabook_booking_draft', JSON.stringify(draft));
  serviceService.getAll.mockResolvedValue([
    { id: 1, name: 'Kineziterapija', duration: 60, price: 40 },
  ]);
  visitService.getAvailability.mockResolvedValue(table(['09:00', '10:00']));
  getStoredSession.mockReturnValue({ user: { role: 'patient', id: 1 } });
});
afterEach(cleanup);
async function ready() {
  await screen.findByText('Kineziterapija');
  const button = screen.getByRole('button', { name: 'Patvirtinti vizitą' });
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
}
it('patvirtinimas rodomas tik gavus API rezervaciją ir pakartotinis pateikimas blokuojamas', async () => {
  let resolve;
  visitService.create.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  mount();
  fireEvent.click(await ready());
  expect(visitService.create).toHaveBeenCalledWith({
    serviceId: 1,
    specialistId: 2,
    date: draft.date,
    time: draft.time,
  });
  expect(screen.queryByText('Vizitas užregistruotas')).toBeNull();
  expect(screen.getByRole('button', { name: 'Registruojama…' }).disabled).toBe(true);
  await act(async () => {
    resolve({ id: 321, date: draft.date, time: draft.time, duration: 60 });
  });
  expect(await screen.findByText('Vizitas užregistruotas')).toBeTruthy();
  expect(screen.getByText('#321')).toBeTruthy();
  expect(sessionStorage.getItem('rehabook_booking_draft')).toBeNull();
});
it('409 konfliktas grąžina į laiko parinkimą ir atnaujina užimtumą', async () => {
  visitService.create.mockRejectedValue(
    Object.assign(new Error('Šis laikas užimtas.'), { status: 409 })
  );
  mount();
  const button = await ready();
  visitService.getAvailability.mockResolvedValue(table(['10:00'], ['09:00']));
  fireEvent.click(button);
  expect(await screen.findByRole('heading', { name: 'Data ir laikas' })).toBeTruthy();
  await waitFor(() => expect(visitService.getAvailability).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('Vizitas užregistruotas')).toBeNull();
  expect(await screen.findByText('Šis laikas užimtas.')).toBeTruthy();
});
it('neprisijungęs pacientas nukreipiamas prisijungti, pasirinkimai išlieka', async () => {
  getStoredSession.mockReturnValue(null);
  mount();
  await screen.findByText('Kineziterapija');
  const button = screen.getByRole('button', { name: 'Prisijungti ir tęsti' });
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
  expect(screen.getByLabelText('Kelias').textContent).toBe('/prisijungimas?next=/registracija');
  expect(JSON.parse(sessionStorage.getItem('rehabook_booking_draft'))).toEqual(draft);
  expect(visitService.create).not.toHaveBeenCalled();
});
it('„bet kuris laisvas specialistas“ siunčiamas be specialistId ir rodo priskirtą specialistą', async () => {
  sessionStorage.setItem('rehabook_booking_draft', JSON.stringify({ ...draft, specialist: 'any' }));
  visitService.create.mockResolvedValue({
    id: 55,
    date: draft.date,
    time: draft.time,
    duration: 60,
    specialistId: 2,
    specialist: { id: 2, name: 'Testo specialistas' },
    autoAssigned: true,
  });
  mount();
  expect(await screen.findByText('Bet kuris laisvas specialistas')).toBeTruthy();
  fireEvent.click(await ready());
  // Laisvi laikai tikrinti be specialisto (sąjunga per visus), o rezervacija – be specialistId
  expect(visitService.getAvailability).toHaveBeenCalledWith(undefined, draft.date, 1);
  expect(visitService.create).toHaveBeenCalledWith({
    serviceId: 1,
    date: draft.date,
    time: draft.time,
  });
  expect(visitService.create.mock.calls[0][0]).not.toHaveProperty('specialistId');
  expect(await screen.findByText('Vizitas užregistruotas')).toBeTruthy();
  expect(screen.getByText('Testo specialistas')).toBeTruthy();
  expect(screen.getByText(/parinktas automatiškai/)).toBeTruthy();
});
it('nepavykus patikrinti laisvų laikų, rezervacija nesiunčiama', async () => {
  visitService.getAvailability.mockRejectedValue(new Error('Nepavyko pasiekti serverio.'));
  mount();
  fireEvent.click(await ready());
  expect(await screen.findByText('Nepavyko pasiekti serverio.')).toBeTruthy();
  expect(visitService.create).not.toHaveBeenCalled();
  expect(screen.queryByText('Vizitas užregistruotas')).toBeNull();
});
it('užimti ir su savais vizitais persidengiantys laikai rodomi pritemdyti ir nepasirenkami', async () => {
  sessionStorage.setItem('rehabook_booking_draft', JSON.stringify({ ...draft, time: '' }));
  visitService.getAvailability.mockResolvedValue(table(['09:00'], ['09:30'], ['10:00']));
  mount();
  await screen.findByText('Kineziterapija');
  fireEvent.click(screen.getByRole('button', { name: /Toliau/ }));
  fireEvent.click(screen.getByRole('button', { name: /Toliau/ }));
  expect(await screen.findByRole('heading', { name: 'Data ir laikas' })).toBeTruthy();
  const taken = await screen.findByRole('button', { name: '09:30 – Užimta' });
  const own = screen.getByRole('button', { name: '10:00 – Užrezervuotas jūsų laikas' });
  const free = screen.getByRole('button', { name: '09:00' });
  expect(taken.disabled).toBe(true);
  expect(own.disabled).toBe(true);
  expect(free.disabled).toBe(false);
  expect(screen.getByText(/Pritemdyti laikai užimti/).textContent).toMatch(
    /brūkšniuoti – užrezervuoti jūsų laikai/
  );
  fireEvent.click(taken);
  fireEvent.click(screen.getByRole('button', { name: /Toliau/ }));
  expect(await screen.findByText('Pasirinkite patikrintą laisvą laiką.')).toBeTruthy();
  fireEvent.click(free);
  fireEvent.click(screen.getByRole('button', { name: /Toliau/ }));
  expect(await screen.findByRole('heading', { name: 'Vizito santrauka' })).toBeTruthy();
  expect(screen.getByText('09:00')).toBeTruthy();
});
