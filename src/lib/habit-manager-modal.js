/**
 * Body-global habit manager modal — add and delete habits.
 */
import { habitStore } from './habit-store.js';
import { escapeAttr, escapeHtml } from './html.js';
import {
  iconHtml,
  iconPickerHtml,
  bindIconPicker,
  dayPickerHtml,
  bindDayPicker,
  readSelectedDays,
} from './icons.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDays(days = []) {
  if (!days.length || days.length === 7) return 'Every day';
  return days.map((day) => DAY_LABELS[day]).join(', ');
}

function habitListHtml() {
  const habits = habitStore.getHabits();
  if (!habits.length) {
    return '<div class="habit-manager-empty">No habits yet.</div>';
  }

  return habits.map((habit) => `
    <div class="habit-manager-row">
      <div class="habit-manager-icon">${iconHtml(habit.icon, { size: 15 })}</div>
      <div class="habit-manager-copy">
        <div class="habit-manager-name">${escapeHtml(habit.name)}</div>
        <div class="habit-manager-days">${escapeHtml(formatDays(habit.days))}</div>
      </div>
      <button
        type="button"
        class="habit-manager-delete"
        data-habit-id="${escapeAttr(habit.id)}"
        data-habit-name="${escapeAttr(habit.name)}"
        aria-label="Delete ${escapeAttr(habit.name)}"
      >
        Delete
      </button>
    </div>
  `).join('');
}

export function openHabitManagerModal({ onSave } = {}) {
  let modalHost = document.getElementById('habit-manager-modal-root');
  if (!modalHost) {
    modalHost = document.createElement('div');
    modalHost.id = 'habit-manager-modal-root';
    document.body.appendChild(modalHost);
  }

  const closeModal = () => { modalHost.innerHTML = ''; };

  const renderHabitList = () => {
    const list = modalHost.querySelector('#habit-manager-list');
    if (!list) return;
    list.innerHTML = habitListHtml();
    bindDeleteButtons();
  };

  const bindDeleteButtons = () => {
    modalHost.querySelectorAll('.habit-manager-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        const name = button.dataset.habitName || 'habit';
        if (!confirm(`Delete "${name}"?`)) return;

        button.disabled = true;
        try {
          await habitStore.removeHabit(button.dataset.habitId);
          renderHabitList();
          onSave?.();
        } catch (err) {
          console.error('Failed to delete habit:', err);
          button.disabled = false;
        }
      });
    });
  };

  modalHost.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal modal--habit" role="dialog" aria-labelledby="habit-modal-title">
        <div>
          <div class="modal-title" id="habit-modal-title">Habits</div>
          <p class="form-hint">Add a habit or remove one from your dashboard.</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="habit-name">Name</label>
          <input class="form-input" id="habit-name" placeholder="e.g. Morning Run" autofocus />
        </div>
        <div class="form-group">
          <label class="form-label">Icon</label>
          ${iconPickerHtml('star')}
        </div>
        <div class="form-group">
          <label class="form-label">Active days</label>
          <p class="form-hint">Streaks only count on selected days.</p>
          ${dayPickerHtml()}
        </div>
        <div class="habit-manager">
          <div class="habit-manager-head">
            <span class="form-label">Current habits</span>
          </div>
          <div class="habit-manager-list" id="habit-manager-list">
            ${habitListHtml()}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel" type="button">Done</button>
          <button class="btn btn-primary" id="modal-save" type="button">Add Habit</button>
        </div>
      </div>
    </div>
  `;

  bindIconPicker(modalHost);
  bindDayPicker(modalHost);

  const saveButton = modalHost.querySelector('#modal-save');

  modalHost.querySelector('#modal-cancel').addEventListener('click', closeModal);
  modalHost.querySelector('#modal-backdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  saveButton.addEventListener('click', async () => {
    const name = modalHost.querySelector('#habit-name').value.trim();
    const icon = modalHost.querySelector('#habit-icon').value || 'star';
    const days = readSelectedDays(modalHost);
    if (!name) return;

    saveButton.disabled = true;
    try {
      await habitStore.addHabit({ name, icon, days });
      modalHost.querySelector('#habit-name').value = '';
      renderHabitList();
      onSave?.();
    } catch (err) {
      console.error('Failed to add habit:', err);
    } finally {
      saveButton.disabled = false;
    }
  });

  modalHost.querySelector('#habit-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveButton.click();
    if (e.key === 'Escape') closeModal();
  });

  bindDeleteButtons();
}

/** @deprecated use openHabitManagerModal */
export const openAddHabitModal = openHabitManagerModal;
