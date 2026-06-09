/**
 * Lucide stroke icons — Linear / Raycast-style minimal SVG glyphs
 * https://lucide.dev
 */
import { createElement } from 'lucide';
import { WEEKDAY_PICKER } from './habit-schedule.js';
import { escapeAttr } from './html.js';
import {
  Activity,
  AlarmClock,
  Apple,
  Bed,
  Bell,
  Bike,
  BookOpen,
  Brain,
  Brush,
  Calendar,
  Calculator,
  Camera,
  Cat,
  Clapperboard,
  Clock,
  Code2,
  Coffee,
  Disc3,
  Dog,
  Dumbbell,
  Droplets,
  Flame,
  Flower2,
  Folder,
  Footprints,
  Gamepad2,
  GlassWater,
  Globe,
  GraduationCap,
  Headphones,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  Languages,
  Leaf,
  Lightbulb,
  MessageCircle,
  Mic,
  Moon,
  Music,
  Notebook,
  Palette,
  PenLine,
  PersonStanding,
  Phone,
  Pill,
  Puzzle,
  Rocket,
  Salad,
  Smartphone,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Target,
  Terminal,
  Timer,
  TreePine,
  Trophy,
  Utensils,
  Video,
  Wallet,
  Waves,
  Weight,
  Zap,
} from 'lucide';

/** Curated Lucide icons for habit picker (key → component) */
const HABIT_ICONS = {
  star: Star,
  dumbbell: Dumbbell,
  book: BookOpen,
  droplets: Droplets,
  brain: Brain,
  flame: Flame,
  activity: Activity,
  moon: Moon,
  coffee: Coffee,
  music: Music,
  heart: Heart,
  zap: Zap,
  sun: Sun,
  flower: Flower2,
  bike: Bike,
  footprints: Footprints,
  'person-standing': PersonStanding,
  waves: Waves,
  weight: Weight,
  'heart-pulse': HeartPulse,
  apple: Apple,
  salad: Salad,
  utensils: Utensils,
  'glass-water': GlassWater,
  bed: Bed,
  pill: Pill,
  pen: PenLine,
  notebook: Notebook,
  'graduation-cap': GraduationCap,
  target: Target,
  code: Code2,
  disc: Disc3,
  terminal: Terminal,
  journal: Notebook,
  languages: Languages,
  laptop: Laptop,
  clock: Clock,
  'alarm-clock': AlarmClock,
  calendar: Calendar,
  calculator: Calculator,
  home: Home,
  dog: Dog,
  cat: Cat,
  sprout: Sprout,
  'tree-pine': TreePine,
  headphones: Headphones,
  camera: Camera,
  gamepad: Gamepad2,
  puzzle: Puzzle,
  sparkles: Sparkles,
  wallet: Wallet,
  phone: Phone,
  palette: Palette,
  clapperboard: Clapperboard,
  globe: Globe,
  message: MessageCircle,
  folder: Folder,
  trophy: Trophy,
  video: Video,
  timer: Timer,
  bell: Bell,
  brush: Brush,
  leaf: Leaf,
  lightbulb: Lightbulb,
  mic: Mic,
  rocket: Rocket,
  smartphone: Smartphone,
};

const ICON_COMPONENTS = {
  ...HABIT_ICONS,
  'book-open': BookOpen,
};

/** Icons available when creating a habit */
export const HABIT_ICON_OPTIONS = Object.keys(HABIT_ICONS);

const LEGACY_EMOJI_MAP = {
  '⌨️': 'code',
  '💬': 'message',
  '🌐': 'globe',
  '🎨': 'palette',
  '✍️': 'pen',
  '🎬': 'clapperboard',
  '📁': 'folder',
  '🏋️': 'dumbbell',
  '📖': 'book',
  '🧘': 'flower',
  '💧': 'droplets',
  '🔥': 'flame',
  '⭐': 'star',
  '🏃': 'activity',
  '✦': 'star',
};

/** Normalize stored icon value (legacy emoji → lucide key) */
export function normalizeIconKey(value) {
  if (!value) return 'star';
  if (ICON_COMPONENTS[value]) return value;
  return LEGACY_EMOJI_MAP[value] || 'star';
}

/** Render a Lucide icon as an HTML string */
export function iconHtml(name, { size = 16, className = 'ui-icon', strokeWidth = 1.5 } = {}) {
  const key = normalizeIconKey(name);
  const Icon = ICON_COMPONENTS[key] || Star;
  const el = createElement(Icon, {
    width: size,
    height: size,
    class: className,
    'stroke-width': strokeWidth,
  });
  return el.outerHTML;
}

/** Lucide icon picker markup for forms */
export function iconPickerHtml(selected = 'star') {
  const active = normalizeIconKey(selected);
  return `
    <div class="icon-picker icon-picker--scroll" role="group" aria-label="Choose icon">
      ${HABIT_ICON_OPTIONS.map((key) => `
        <button type="button" class="icon-picker-btn ${key === active ? 'active' : ''}" data-icon="${escapeAttr(key)}" aria-label="${escapeAttr(key.replace(/-/g, ' '))}">
          ${iconHtml(key, { size: 16, className: 'ui-icon' })}
        </button>
      `).join('')}
    </div>
    <input type="hidden" id="habit-icon" value="${escapeAttr(active)}" />
  `;
}

export function bindIconPicker(container, onChange) {
  const hidden = container.querySelector('#habit-icon');
  container.querySelectorAll('.icon-picker-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.icon-picker-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (hidden) hidden.value = btn.dataset.icon;
      onChange?.(btn.dataset.icon);
    });
  });
}

export function dayPickerHtml(selectedDays = [0, 1, 2, 3, 4, 5, 6]) {
  const active = new Set(selectedDays);
  return `
    <div class="day-picker" role="group" aria-label="Active days">
      ${WEEKDAY_PICKER.map(({ day, label, short }) => `
        <button
          type="button"
          class="day-picker-btn ${active.has(day) ? 'is-active' : ''}"
          data-day="${day}"
          aria-label="${label}"
          aria-pressed="${active.has(day) ? 'true' : 'false'}"
        >${short}</button>
      `).join('')}
    </div>
    <input type="hidden" id="habit-days" value="${[...active].sort((a, b) => a - b).join(',')}" />
  `;
}

export function bindDayPicker(container) {
  const hidden = container.querySelector('#habit-days');

  const sync = () => {
    const days = [...container.querySelectorAll('.day-picker-btn.is-active')]
      .map((btn) => Number(btn.dataset.day));
    if (hidden) hidden.value = days.sort((a, b) => a - b).join(',');
    return days;
  };

  container.querySelectorAll('.day-picker-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const active = container.querySelectorAll('.day-picker-btn.is-active');
      if (btn.classList.contains('is-active') && active.length <= 1) return;
      btn.classList.toggle('is-active');
      btn.setAttribute('aria-pressed', btn.classList.contains('is-active') ? 'true' : 'false');
      sync();
    });
  });

  return () => sync();
}

export function readSelectedDays(container) {
  const raw = container.querySelector('#habit-days')?.value || '';
  const days = raw.split(',').filter(Boolean).map(Number);
  return days.length ? days : [0, 1, 2, 3, 4, 5, 6];
}
