// File: src/ui/Modals.js

export function openOrderModal() {
  const modal = document.getElementById('orderModal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

export function closeOrderModal() {
  const modal = document.getElementById('orderModal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.classList.remove('modal-open');
  modal.innerHTML = ''; 
}
