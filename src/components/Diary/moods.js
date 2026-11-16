import { Laugh, Smile, Meh, Frown, Angry } from 'lucide-react';

export const MOODS = [
  { id: 'great', label: 'Great', icon: Laugh, cls: 'text-emerald-500' },
  { id: 'good', label: 'Good', icon: Smile, cls: 'text-lime-600 dark:text-lime-400' },
  { id: 'okay', label: 'Okay', icon: Meh, cls: 'text-amber-500' },
  { id: 'low', label: 'Low', icon: Frown, cls: 'text-orange-500' },
  { id: 'bad', label: 'Bad', icon: Angry, cls: 'text-rose-500' },
];
