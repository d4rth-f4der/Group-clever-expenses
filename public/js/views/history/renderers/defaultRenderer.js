export function defaultRenderer(log) {
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gap = '10px';

  const heading = document.createElement('div');
  heading.style.fontWeight = '600';
  heading.style.color = '#111827';
  heading.textContent = log?.title || log?.message || log?.action || 'History item';

  const meta = document.createElement('div');
  meta.style.color = '#6B7280';
  meta.style.fontSize = '12px';
  const ts = new Date(log?.timestamp);
  const when = isNaN(+ts) ? '' : ts.toLocaleString();
  const who = log?.actorName || log?.actor || 'Unknown';
  meta.textContent = [who, when].filter(Boolean).join(' • ');

  const details = document.createElement('pre');
  details.style.background = '#f9fafb';
  details.style.border = '1px solid #e5e7eb';
  details.style.borderRadius = '8px';
  details.style.padding = '12px';
  details.style.margin = 0;
  details.style.whiteSpace = 'pre-wrap';
  details.style.wordBreak = 'break-word';
  details.textContent = JSON.stringify(log?.details ?? {}, null, 2);

  wrap.appendChild(heading);
  wrap.appendChild(meta);
  wrap.appendChild(details);
  return wrap;
}
