
import { Recipe, DayPlan } from '../types';

/**
 * Calculates the correct date for a specific day of an ISO week.
 * ISO 8601 rule: Week 1 is the week with the first Thursday of the year.
 */
function getDateOfWeekDay(weekStr: string, dayIndex: number): Date {
  const [year, weekNum] = weekStr.split('-W').map(Number);
  
  // Start with Jan 4th (always in Week 1)
  const date = new Date(year, 0, 4);
  
  // Find the Monday of that week
  const day = date.getDay() || 7; // Sunday as 7
  date.setDate(date.getDate() - day + 1);
  
  // Move to the requested week and day
  // dayIndex 0 = Monday, 1 = Tuesday etc.
  date.setDate(date.getDate() + (weekNum - 1) * 7 + dayIndex);
  
  return date;
}

function formatTimeForICS(date: Date, hours: number, minutes: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(hours).padStart(2, '0');
  const min = String(minutes).padStart(2, '0');
  // Use local time format without 'Z' to respect device timezone
  return `${y}${m}${d}T${h}${min}00`;
}

export const generateICS = (weekIdentifier: string, plans: DayPlan[], recipes: Recipe[]) => {
  const events: string[] = [];

  plans.forEach((plan) => {
    if (plan.recipeId === null) return;
    const recipe = recipes.find(r => r.id === plan.recipeId);
    if (!recipe) return;

    const baseDate = getDateOfWeekDay(weekIdentifier, plan.dayId);
    const startStr = formatTimeForICS(baseDate, 17, 30);
    const endStr = formatTimeForICS(baseDate, 18, 30);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `plan-${weekIdentifier}-${plan.dayId}-${plan.recipeId}@matplaneraren`;

    const event = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:Middag: ${recipe.name}`,
      `DESCRIPTION:Kategori: ${recipe.category}\\nKälla: ${recipe.source || 'Okänd'}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');

    events.push(event);
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Matplaneraren//NONSGML v1.3//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `matplanering-${weekIdentifier}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
