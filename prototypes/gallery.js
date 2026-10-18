const requestedStyle = new URLSearchParams(location.search).get('style');
const style = ['gallery', 'bench', 'journal'].includes(requestedStyle) ? requestedStyle : 'journal';
document.body.classList.add(style);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const arrow = dir => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${dir === 'prev' ? 'm14 5-7 7 7 7' : 'm10 5 7 7-7 7'}"/></svg>`;

function renderVersion(c, version, index) {
  const name = escapeHtml(version.name);
  return `<article class="sample">
    <div class="sample-head"><strong>${name}</strong>${version.repo ? `<a href="${escapeHtml(version.repo)}" target="_blank" rel="noopener noreferrer" aria-label="打开 ${name} 的 GitHub 仓库">GitHub ↗</a>` : '<span>基准</span>'}</div>
    <a class="shot-link" href="${escapeHtml(version.url)}" target="_blank" rel="noopener" aria-label="在新标签页打开${escapeHtml(c.name)}的${name}完整页面">
      <img class="shot" src="${escapeHtml(version.screenshot)}" width="1440" height="960" alt="${escapeHtml(c.name)} · ${name}版本的桌面首屏" loading="${index === 0 && c.id === 'case-01' ? 'eager' : 'lazy'}">
      <span class="open-mark">打开完整页面 ↗</span>
    </a>
    <div class="sample-foot"><span>${escapeHtml(version.tool)} · ${escapeHtml(version.reasoning)} · ${escapeHtml(version.date)}</span><span>${escapeHtml(version.viewport)}</span></div>
  </article>`;
}

function renderMetadata(version) {
  return `<section class="version-info"><h4>${escapeHtml(version.name)}</h4><dl>
    <dt>模型</dt><dd>${escapeHtml(version.model)}</dd>
    <dt>提供方</dt><dd>${escapeHtml(version.provider)}</dd>
    <dt>生成工具</dt><dd>${escapeHtml(version.tool)}</dd>
    <dt>思考强度</dt><dd>${escapeHtml(version.reasoning)}</dd>
    <dt>生成日期</dt><dd>${escapeHtml(version.date)}</dd>
    ${version.skillVersion ? `<dt>技能版本</dt><dd>${escapeHtml(version.skillVersion)}</dd>` : ''}
  </dl></section>`;
}

document.querySelector('#cases').innerHTML = benchmarkCases.map(c => `<section class="case" id="${c.id}">
  <div class="case-heading"><div class="case-title"><h2>${escapeHtml(c.name)}</h2><span class="case-subtitle">${escapeHtml(c.type)} · ${escapeHtml(c.desc)}</span></div>
    <div class="case-controls" ${c.versions.length < 2 ? 'hidden' : ''}><button data-dir="prev" aria-label="查看${escapeHtml(c.name)}的前一个版本">${arrow('prev')}</button><button data-dir="next" aria-label="查看${escapeHtml(c.name)}的后一个版本">${arrow('next')}</button></div>
  </div>
  <div class="track ${c.versions.length === 1 ? 'single' : c.versions.length === 2 ? 'pair' : ''}" aria-label="${escapeHtml(c.name)}的技能版本">${c.versions.map((v, i) => renderVersion(c, v, i)).join('')}</div>
  <details class="case-info"><summary>案例提示词与生成信息</summary><div class="info-body"><div><h3>案例提示词</h3><pre class="prompt-text">${escapeHtml(c.prompt)}</pre><button class="copy" data-id="${c.id}" aria-label="复制${escapeHtml(c.name)}案例提示词">复制提示词</button><span class="copy-status" role="status"></span></div>
    <div><h3>生成信息</h3>${c.versions.map(renderMetadata).join('')}</div></div>
  </details>
</section>`).join('');

document.querySelectorAll('.case').forEach(section => {
  const track = section.querySelector('.track');
  const prev = section.querySelector('[data-dir="prev"]');
  const next = section.querySelector('[data-dir="next"]');
  const update = () => {
    prev.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  };
  [prev, next].forEach(btn => btn.addEventListener('click', () => {
    const gap = parseFloat(getComputedStyle(track).columnGap);
    track.scrollBy({left: (btn === next ? 1 : -1) * (track.querySelector('.sample').offsetWidth + gap), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }));
  track.addEventListener('scroll', () => {
    sessionStorage.setItem(`${style}-${section.id}`, track.scrollLeft);
    update();
  }, {passive: true});
  track.scrollLeft = Number(sessionStorage.getItem(`${style}-${section.id}`) || 0);
  update();
  window.addEventListener('resize', update);
});

document.querySelectorAll('.copy').forEach(btn => btn.addEventListener('click', async () => {
  const status = btn.nextElementSibling;
  try {
    await navigator.clipboard.writeText(benchmarkCases.find(c => c.id === btn.dataset.id).prompt);
    status.textContent = '已复制';
  } catch {
    status.textContent = '复制失败，请选中上方提示词手动复制。';
  }
}));
window.addEventListener('pagehide', () => sessionStorage.setItem(`${style}-scroll`, scrollY));
if (!location.hash) requestAnimationFrame(() => window.scrollTo(0, Number(sessionStorage.getItem(`${style}-scroll`) || 0)));
