import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Prevent text selection on single tap (mobile only)
// Allow selection on long press
if (typeof window !== 'undefined' && window.innerWidth < 1024) {
  let touchStartTime = 0;
  let touchStartTarget: EventTarget | null = null;

  document.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
    touchStartTarget = e.target;
    
    // Allow selection in input fields, textareas, and contenteditable
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.getAttribute('contenteditable') === 'true' ||
      target.closest('input, textarea, [contenteditable="true"]')
    ) {
      return;
    }

    // Prevent selection on interactive elements
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.getAttribute('role') === 'button' ||
      target.closest('button, a, [role="button"]')
    ) {
      e.preventDefault();
      return;
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    const touchDuration = Date.now() - touchStartTime;
    const target = e.target as HTMLElement;

    // If tap was less than 300ms, prevent selection (single tap)
    // If longer than 300ms, allow selection (long press)
    if (touchDuration < 300 && touchStartTarget === e.target) {
      // Allow selection in input fields, textareas
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true' ||
        target.closest('input, textarea, [contenteditable="true"]')
      ) {
        return;
      }

      // Prevent selection on interactive elements
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.getAttribute('role') === 'button' ||
        target.closest('button, a, [role="button"]')
      ) {
        // Clear any selection
        if (window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
        return;
      }

      // For text content, clear selection if it was a quick tap
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        // Only clear if it was a very quick tap (less than 200ms)
        if (touchDuration < 200) {
          selection.removeAllRanges();
        }
      }
    }
  });

  // Also prevent selection on mouse events for mobile devices
  document.addEventListener('selectstart', (e) => {
    const target = e.target as HTMLElement;
    
    // Allow in input fields
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.getAttribute('contenteditable') === 'true' ||
      target.closest('input, textarea, [contenteditable="true"]')
    ) {
      return;
    }

    // Prevent on interactive elements
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.getAttribute('role') === 'button' ||
      target.closest('button, a, [role="button"]')
    ) {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
