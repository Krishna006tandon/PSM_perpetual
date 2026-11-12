/**
 * Prints a specific DOM container inside an isolated hidden iframe so fixed overlays,
 * flex 100vh wrappers, and background dashboard content never clip or overlap print output.
 */
export function printElementIsolated(element, title = 'PSM Report') {
  if (!element) {
    window.print();
    return;
  }

  const clone = element.cloneNode(true);

  // Sync live form values into cloned controls so printed snapshots reflect user inputs
  const origInputs = element.querySelectorAll('input, textarea, select');
  const clonedInputs = clone.querySelectorAll('input, textarea, select');
  origInputs.forEach((orig, idx) => {
    const target = clonedInputs[idx];
    if (!target) return;
    if (orig.tagName === 'SELECT') {
      const selectedOpt = orig.options[orig.selectedIndex];
      const span = document.createElement('span');
      span.textContent = selectedOpt ? selectedOpt.text : orig.value;
      span.style.cssText = 'display:block;font-weight:700;font-size:0.78rem;color:#0f172a;background:#ffffff;border:1px solid #cbd5e1;border-radius:5px;padding:6px 8px;';
      target.parentNode.replaceChild(span, target);
    } else if (orig.type === 'checkbox' || orig.type === 'radio') {
      if (orig.checked) target.setAttribute('checked', 'checked');
      else target.removeAttribute('checked');
    } else {
      target.setAttribute('value', orig.value || '');
      if (orig.tagName === 'TEXTAREA') {
        target.textContent = orig.value || '';
      }
    }
  });

  clone.querySelectorAll('.pa-no-print, .cr-no-print').forEach((el) => el.remove());

  const styleNodes = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
  const headStyles = styleNodes
    .map((node) => {
      if (node.tagName === 'LINK') {
        return `<link rel="stylesheet" href="${node.href}" />`;
      }
      return `<style>${node.textContent}</style>`;
    })
    .join('\n');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-15000px';
  iframe.style.top = '0';
  iframe.style.width = '1120px';
  iframe.style.height = '900px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${headStyles}
  <style>
    @page { size: auto; margin: 9mm; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }
    :root, html, body {
      --bg-paper: #ffffff !important;
      --bg-default: #f8fafc !important;
      --text-primary: #0f172a !important;
      --text-secondary: #475569 !important;
      --divider: #cbd5e1 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      height: auto !important;
      overflow: visible !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    /* Override global @media print { body * { visibility: hidden; } } from unrelated components */
    body, body * {
      visibility: visible !important;
    }
    @media print {
      body, body * {
        visibility: visible !important;
      }
      .pa-no-print, .cr-no-print {
        display: none !important;
      }
    }
    .pa-modal-overlay,
    .pa-modal-container,
    .pa-body,
    .cr-modal-overlay,
    .cr-modal-container,
    .cr-body {
      position: static !important;
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      background: #ffffff !important;
      color: #0f172a !important;
      padding: 0 !important;
    }
    .pa-header {
      background: #0f172a !important;
      color: #ffffff !important;
      border-radius: 8px;
      padding: 12px 16px !important;
      margin-bottom: 10px !important;
    }
    .pa-header * {
      color: #ffffff !important;
    }
    .pa-eyebrow {
      color: #7dd3fc !important;
    }
    .pa-rate-box {
      display: grid !important;
      grid-template-columns: 260px 1fr !important;
      gap: 12px !important;
      padding: 10px 12px !important;
      margin-bottom: 10px !important;
      color: #0f172a !important;
    }
    .pa-rate-metrics {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 8px !important;
    }
    .pa-rate-pill {
      padding: 8px 10px !important;
    }
    .pa-kpi-grid {
      display: grid !important;
      grid-template-columns: repeat(5, 1fr) !important;
      gap: 8px !important;
      margin-bottom: 10px !important;
    }
    .pa-kpi-card {
      padding: 9px 10px !important;
    }
    .pa-kpi-value {
      font-size: 1.22rem !important;
    }
    .pa-grid-2 {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      margin-bottom: 10px !important;
    }
    .pa-card {
      padding: 11px 12px !important;
      gap: 8px !important;
      color: #0f172a !important;
    }
    .pa-card h3 {
      font-size: 0.86rem !important;
    }
    .pa-bar-head,
    .pa-kpi-label,
    .pa-kpi-sub,
    .pa-label,
    .pa-table th,
    .pa-table td {
      color: #0f172a !important;
    }
    .pa-table {
      font-size: 0.72rem !important;
    }
    .pa-table th,
    .pa-table td {
      padding: 5px 7px !important;
    }
    .pa-card,
    .pa-kpi-card,
    .pa-rate-box,
    .pa-grid-2,
    .cr-report-sheet > div {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`);
  doc.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    }
  };

  // Wait briefly for any external CSS <link> tags in production builds to finish loading
  const links = doc.querySelectorAll('link[rel="stylesheet"]');
  if (links.length === 0) {
    setTimeout(triggerPrint, 120);
  } else {
    let settled = 0;
    const onSettle = () => {
      settled++;
      if (settled >= links.length) {
        setTimeout(triggerPrint, 150);
      }
    };
    links.forEach((lnk) => {
      lnk.addEventListener('load', onSettle);
      lnk.addEventListener('error', onSettle);
    });
    setTimeout(triggerPrint, 800);
  }
}
