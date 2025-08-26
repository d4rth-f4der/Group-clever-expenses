export function defaultRenderer(log) {
  const wrap = document.createElement('div');
  wrap.classList.add('history-wrap');

  const heading = document.createElement('div');
  heading.classList.add('history-title-sm');
  heading.textContent = log?.title || log?.message || log?.action || 'History item';

  const meta = document.createElement('div');
  meta.classList.add('history-meta');
  const ts = new Date(log?.timestamp);
  const when = isNaN(+ts) ? '' : ts.toLocaleString();
  const who = log?.actorName || log?.actor || 'Unknown';
  meta.textContent = [who, when].filter(Boolean).join(' • ');

  const details = document.createElement('pre');
  details.classList.add('history-pre');
  details.textContent = JSON.stringify(log?.details ?? {}, null, 2);

  wrap.appendChild(heading);
  wrap.appendChild(meta);
  wrap.appendChild(details);
  return wrap;
}
