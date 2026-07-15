import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UtensilsCrossed, Star } from 'lucide-react';
import type { Student } from '@/lib/dummy-data';
import {
  useDiningHalls, useMeals, useCanteenReviews, addReview,
  type MealSlot,
} from '@/lib/canteen-store';

const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function PortalCanteen() {
  const { student } = useOutletContext<{ student: Student }>();
  const halls = useDiningHalls().filter(h => h.active);
  const meals = useMeals();
  const reviews = useCanteenReviews();

  const [hallId, setHallId] = useState<string>(halls[0]?.id ?? '');
  const [rating, setRating] = useState(5);
  const [slot, setSlot] = useState<MealSlot>('Lunch');
  const [mealName, setMealName] = useState('');
  const [comment, setComment] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallId) return;
    addReview({
      hallId,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      rating, mealSlot: slot, mealName, comment,
    });
    setComment(''); setMealName('');
  };

  const mine = reviews.filter(r => r.studentId === student.id);
  const todaysMeals = meals.filter(m => m.hallId === hallId && m.available);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><UtensilsCrossed size={22}/> Canteen</h1>
        <p className="text-sm text-muted-foreground">View meals and share your feedback</p>
      </div>

      {halls.length === 0 ? (
        <p className="text-sm text-muted-foreground">No dining halls available.</p>
      ) : (
        <>
          <div className="flex gap-2 items-end">
            <label className="text-sm">Dining hall
              <select value={hallId} onChange={e => setHallId(e.target.value)}
                className="mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm block min-w-[220px]">
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <h3 className="font-display font-semibold mb-3">Available Meals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {SLOTS.map(sl => (
                <div key={sl} className="border border-border rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{sl}</p>
                  <ul className="mt-1 space-y-1">
                    {todaysMeals.filter(m => m.slot === sl).map(m => (
                      <li key={m.id} className="text-sm">{m.name} <span className="text-xs text-muted-foreground">{m.day}</span></li>
                    ))}
                    {todaysMeals.filter(m => m.slot === sl).length === 0 && <li className="text-xs text-muted-foreground">—</li>}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="bg-card border border-border rounded-xl p-4 shadow-card space-y-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><Star size={16}/> Share a Review</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="text-sm">Slot
                <select value={slot} onChange={e => setSlot(e.target.value as MealSlot)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  {SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-sm">Meal
                <input value={mealName} onChange={e => setMealName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </label>
              <label className="text-sm">Rating
                <div className="mt-1 flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button type="button" key={n} onClick={() => setRating(n)}>
                      <Star size={22} className={n <= rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'} />
                    </button>
                  ))}
                </div>
              </label>
            </div>
            <label className="block text-sm">Comment
              <textarea value={comment} onChange={e => setComment(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" rows={3} />
            </label>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">Submit Review</button>
            </div>
          </form>

          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <h3 className="font-display font-semibold mb-3">My Reviews</h3>
            <div className="space-y-2">
              {mine.map(r => (
                <div key={r.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-500 text-sm">{'★'.repeat(r.rating)}<span className="text-muted-foreground">{'★'.repeat(5-r.rating)}</span></span>
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.mealSlot} · {r.mealName || '—'}</p>
                  {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
                </div>
              ))}
              {mine.length === 0 && <p className="text-sm text-muted-foreground">You haven't left any reviews.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
