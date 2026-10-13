const style = ['gallery','bench','journal'].includes(new URLSearchParams(location.search).get('style')) ? new URLSearchParams(location.search).get('style') : 'gallery';
document.body.classList.add(style);
const cases = [
 {id:'notes',name:'把灵感，整理成下一步',type:'产品介绍页',desc:'一款笔记工具的首页，展示产品价值、功能与使用入口。',prompt:'为笔记工具「拾页」制作产品介绍页。包含导航、产品介绍、三个主要功能和开始使用入口。采用相同文案，支持手机浏览。',title:'拾页'},
 {id:'money',name:'让日常收支，一目了然',type:'数据仪表盘',desc:'从汇总到明细，观察密集信息如何被清楚组织。',prompt:'制作个人收支仪表盘，包含月份选择、收入与支出汇总、分类图表、交易明细和分类筛选。使用固定的模拟数据，支持手机浏览。',title:'日常账本'},
 {id:'folio',name:'给作品，一个自己的位置',type:'个人作品集',desc:'用排版、色彩和空间，建立不同的个人表达。',prompt:'为视觉设计师制作作品集，包含个人介绍、三个作品、作品分类与联系入口。使用相同内容，支持手机浏览。',title:'林间工作室'}
];
// 技能名用于展示卡片长度，示意页面并非技能的生成结果。
const skills = [{name:'无技能',repo:null},{name:'frontend-design',repo:'https://github.com/anthropics/skills'},{name:'impeccable',repo:'https://github.com/pbakaus/impeccable'},{name:'oil-ui',repo:'https://github.com/oil-oil/oil-ui'}];
const arrow = dir => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${dir==='prev'?'m14 5-7 7 7 7':'m10 5 7 7-7 7'}"/></svg>`;
document.querySelector('#cases').innerHTML = cases.map(c => `<section class="case" id="case-${c.id}"><div class="case-heading"><div class="case-title"><h2>${c.name}</h2><span class="case-subtitle">${c.type} · ${c.desc}</span></div><div class="case-controls"><button data-dir="prev" aria-label="查看${c.type}的前一个版本">${arrow('prev')}</button><button data-dir="next" aria-label="查看${c.type}的后一个版本">${arrow('next')}</button></div></div><div class="track" aria-label="${c.type}的技能版本">${skills.map((s,i)=>`<article class="sample"><div class="sample-head"><strong>${s.name}</strong>${s.repo?`<a href="${s.repo}" target="_blank" rel="noopener noreferrer" aria-label="打开${s.name}的GitHub仓库">GitHub ↗</a>`:'<span>基准</span>'}</div><a class="shot-link" href="demo.html?case=${c.id}&variant=${i}" target="_blank" rel="noopener" aria-label="在新标签页打开${c.type}的${s.name}示意页面"><img class="shot" src="assets/${c.id}-${i}.png" alt="${c.title}的第${i+1}种示意布局" loading="${c.id==='notes'?'eager':'lazy'}"><span class="open-mark">打开完整页面 ↗</span></a><div class="sample-foot"><span>示意页面 · 非评测结果</span><span>1440 × 960</span></div></article>`).join('')}</div><details class="case-info"><summary>案例提示词与生成信息</summary><div class="info-body"><div><h3>案例提示词（示意）</h3><p>${c.prompt}</p><button class="copy" data-id="${c.id}">复制提示词</button></div><div><h3>生成信息</h3><p>当前内容是展示网站的设计示意。<br>真实生成模型计划：deepseek-v4.1-flash<br>技能版本与生成日期：待真实结果加入后填写。</p></div></div></details></section>`).join('');
document.querySelectorAll('.case').forEach(section=>{
 const track=section.querySelector('.track'),prev=section.querySelector('[data-dir="prev"]'),next=section.querySelector('[data-dir="next"]');
 const update=()=>{prev.disabled=track.scrollLeft<2;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2};
 [prev,next].forEach(btn=>btn.addEventListener('click',()=>track.scrollBy({left:(btn===next?1:-1)*(track.querySelector('.sample').offsetWidth+24),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})));
 track.addEventListener('scroll',()=>{sessionStorage.setItem(`${style}-${section.id}`,track.scrollLeft);update()},{passive:true});
 track.scrollLeft=Number(sessionStorage.getItem(`${style}-${section.id}`)||0);update();window.addEventListener('resize',update);
});
document.querySelectorAll('.copy').forEach(btn=>btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(cases.find(c=>c.id===btn.dataset.id).prompt);btn.textContent='已复制'}catch{btn.textContent='复制失败，请选中文本复制'}}));
window.addEventListener('pagehide',()=>sessionStorage.setItem(`${style}-scroll`,scrollY));
if(!location.hash)requestAnimationFrame(()=>window.scrollTo(0,Number(sessionStorage.getItem(`${style}-scroll`)||0)));
