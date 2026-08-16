import DOMPurify from 'dompurify';

/**
 * Sanitize inbound email HTML before rendering it.
 *
 * Anyone on the internet can send mail to us@ / shopping@ / acell@. That HTML
 * was previously passed straight into dangerouslySetInnerHTML, so a single
 * crafted email could run script in the couple's session and read their
 * token — a full account takeover from an address anyone can guess.
 */

// Strip anything that could phone home or execute.
const CONFIG = {
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'style', 'link', 'meta', 'base'],
  FORBID_ATTR: ['srcdoc', 'formaction', 'ping', 'autofocus'],
  ALLOW_DATA_ATTR: false,
  // Block javascript:, vbscript:, data: (except images handled below).
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
};

let hooked = false;
function installHooks() {
  if (hooked || typeof window === 'undefined') return;
  hooked = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Links open in a new tab and can never reach back into this window.
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
    // Remote images are tracking pixels by default. Keep them visible but
    // never let them leak the referrer.
    if (node.tagName === 'IMG') {
      node.setAttribute('referrerpolicy', 'no-referrer');
      node.setAttribute('loading', 'lazy');
    }
  });
}

export function sanitizeEmailHtml(html) {
  if (!html) return '';
  installHooks();
  return DOMPurify.sanitize(String(html), CONFIG);
}
