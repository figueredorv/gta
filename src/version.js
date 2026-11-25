export const APP_VERSION = 'v1.7.3';
export const AUTHOR_URL = 'https://github.com/figueredorv';

export function formatStartCredit(version = APP_VERSION) {
  return `Desenvolvido por Ruan Figueiredo em 2026 — ${version}`;
}

export function renderAuthorCredit(targetEl, version = APP_VERSION) {
  if (!targetEl) return;
  const doc = targetEl.ownerDocument;
  targetEl.textContent = '';
  targetEl.appendChild(doc.createTextNode('Desenvolvido por '));
  const authorLink = doc.createElement('a');
  authorLink.href = AUTHOR_URL;
  authorLink.target = '_blank';
  authorLink.rel = 'noopener noreferrer';
  authorLink.className = 'start-credit-link';
  authorLink.textContent = 'Ruan Figueiredo';
  targetEl.appendChild(authorLink);
  targetEl.appendChild(doc.createTextNode(` em 2026 — ${version}`));
}
