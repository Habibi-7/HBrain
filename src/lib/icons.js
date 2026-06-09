/**
 * Lucide stroke icons — Linear / Raycast-style minimal SVG glyphs
 * https://lucide.dev
 */
import { createElement } from 'lucide';
import {
  Activity,
  BookOpen,
  Brain,
  Clapperboard,
  Code2,
  Coffee,
  Dumbbell,
  Droplets,
  Flame,
  Flower2,
  Folder,
  Globe,
  Heart,
  MessageCircle,
  Moon,
  Music,
  Palette,
  PenLine,
  Star,
  Sun,
  Zap,
} from 'lucide';

const ICON_COMPONENTS = {
  activity: Activity,
  book: BookOpen,
  'book-open': BookOpen,
  brain: Brain,
  clapperboard: Clapperboard,
  code: Code2,
  coffee: Coffee,
  dumbbell: Dumbbell,
  droplets: Droplets,
  flame: Flame,
  flower: Flower2,
  folder: Folder,
  globe: Globe,
  heart: Heart,
  message: MessageCircle,
  moon: Moon,
  music: Music,
  palette: Palette,
  pen: PenLine,
  star: Star,
  sun: Sun,
  zap: Zap,
};

/** Icons available when creating a habit */
export const HABIT_ICON_OPTIONS = [
  'star', 'dumbbell', 'book', 'droplets', 'brain', 'flame',
  'activity', 'moon', 'coffee', 'music', 'heart', 'zap', 'sun', 'flower',
];

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

/** Icon picker markup for forms */
export function iconPickerHtml(selected = 'star') {
  const active = normalizeIconKey(selected);
  return `
    <div class="icon-picker" role="group" aria-label="Choose icon">
      ${HABIT_ICON_OPTIONS.map((key) => `
        <button type="button" class="icon-picker-btn ${key === active ? 'active' : ''}" data-icon="${key}" aria-label="${key}">
          ${iconHtml(key, { size: 16, className: 'ui-icon' })}
        </button>
      `).join('')}
    </div>
    <input type="hidden" id="habit-icon" value="${active}" />
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
