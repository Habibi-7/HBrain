/**
 * Body-global add-habit modal.
 */
import { habitStore } from './habit-store.js';
import {
  iconPickerHtml,
  bindIconPicker,
  dayPickerHtml,
  bindDayPicker,
  readSelectedDays,
} from './icons.js';

export function openAddHabitModal({ onSave } = {}) {
  let modalHost = document.getElementById('add-habit-modal-root');
  if (!modalHost) {
    modalHost = document.createElement('div');
    modalHost.id = 'add-habit-modal-root';
    document.body.appendChild(modalHost);
  }

  const closeModal = () => { modalHost.innerHTML = ''; };

  modalHost.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal modal--habit" role="dialog" aria-labelledby="habit-modal-title">
        <div class="modal-title" id="habit-modal-title">New Habit</div>
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
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel" type="button">Cancel</button>
          <button class="btn btn-primary" id="modal-save" type="button">Add Habit</button>
        </div>
      </div>
    </div>
  `;

  bindIconPicker(modalHost);
  bindDayPicker(modalHost);

  modalHost.querySelector('#modal-cancel').addEventListener('click', closeModal);
  modalHost.querySelector('#modal-backdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  modalHost.querySelector('#modal-save').addEventListener('click', () => {
    const name = modalHost.querySelector('#habit-name').value.trim();
    const icon = modalHost.querySelector('#habit-icon').value || 'star';
    const days = readSelectedDays(modalHost);
    if (name) {
      habitStore.addHabit({ name, icon, days });
      closeModal();
      onSave?.();
    }
  });
  modalHost.querySelector('#habit-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') modalHost.querySelector('#modal-save').click();
    if (e.key === 'Escape') closeModal();
  });
}
