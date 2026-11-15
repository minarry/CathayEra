(() => {
  'use strict';
  const DATA = JSON.parse(document.getElementById('library-data').textContent);
  const docs = DATA.documents;
  const byId = new Map(docs.map(d => [d.id, d]));
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uri = encodeURIComponent;
  const formatDate = value => new Date(value).toLocaleDateString('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit'});
  const bytes = n => n > 1048576 ? `${(n/1048576).toFixed(1)} MB` : `${Math.max(1,Math.round(n/1024))} KB`;
  const docRoute = (id, section='') => `#read?doc=${uri(id)}${section ? `&section=${uri(section)}` : ''}`;
  const findDoc = title => docs.find(d => d.title === title)?.id;
  const names = {rules:findDoc('规则与存在'),life:findDoc('生命与神圣存在'),law:findDoc('补天法则'),timeline:findDoc('创世与时代总表'),events:findDoc('神话与传说事件'),charter:findDoc('创作纲领')};
  const group = d => DATA.groups[d.group] || DATA.groups.overview;
  const isImage = d => ['png','jpg','jpeg','webp','svg'].includes(d.format);
  const glyphs = {
    home:'M3 10l9-7 9 7M5 9v11h14V9M9 20v-7h6v7',
    library:'M4 4h4v16H4zM10 4h4v16h-4zM17 4l4 15-3 1-4-15z',
    graph:'M5 6l7 6 7-6M12 12v8M3 3h4v5H3zM17 3h4v5h-4zM10 10h4v5h-4zM10 18h4v4h-4z',
    checklist:'M9 5h11M9 12h11M9 19h11M3 5l1 1 2-3M3 12l1 1 2-3M3 19l1 1 2-3',
    folder:'M3 6V4h6l2 2h10v14H3zM3 10h18',
    hexagon:'M12 2l9 5v10l-9 5-9-5V7zM12 7l4 2.5v5L12 17l-4-2.5v-5z',
    scroll:'M6 3h14v15c0 3-4 3-4 0V6H6c-4 0-4-3 0-3zM6 6v14h12M9 10h4M9 14h4',
    feather:'M4 20l9-9M5 16c-1-7 7-13 15-12 1 8-4 16-12 15M9 11l4 2 1 4',
    archive:'M3 4h18v4H3zM5 8v12h14V8M9 12h6',
    compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM15 9l-2 4-4 2 2-4z',
    search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM15 15l6 6',
    arrow:'M4 12h16M14 6l6 6-6 6',
    back:'M20 12H4M10 6l-6 6 6 6',
    bookmark:'M6 3h12v18l-6-4-6 4z',
    clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 6v6l4 2',
    file:'M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8',
    image:'M3 4h18v16H3zM3 17l5-6 4 4 4-6 5 7M7 8h.01',
    box:'M12 3l9 5-9 5-9-5zM3 8v9l9 5 9-5V8M12 13v9M8 5l9 5',
    link:'M9 15l6-6M7 14l-2 2c-4 4 2 10 6 6l4-4M17 10l2-2c4-4-2-10-6-6L9 6',
    share:'M8 12h12M15 7l5 5-5 5M10 4H4v16h6',
    download:'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    list:'M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1',
    menu:'M4 6h16M4 12h16M4 18h16',
    help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM9 8c0-4 7-3 6 1-1 2-3 1-3 4M12 17h.01',
    check:'M5 12l4 4L19 6',
    text:'M4 5h16M12 5v15M8 20h8',
    cross:'M5 5l14 14M19 5L5 19',
    flag:'M5 22V3M5 3h13l-3 4 3 4H5',
  };
  const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${glyphs[name] || glyphs.file}"/></svg>`;
  const fileIcon = d => isImage(d) ? 'image' : d.format==='zip' ? 'box' : group(d).icon;
  const typeLabel = d => `<span class="type-label" style="--type:${group(d).color}">${icon(fileIcon(d))}${esc(isImage(d)?'原始图像':d.format==='zip'?'版本快照':group(d).short)}</span>`;
  const typeStatus = d => d.group==='archive'?'历史资料':d.group==='source'?'创作者输入':d.id===DATA.decisionPath?'待进一步明确':d.group==='world'||d.group==='history'?'含推荐解释':'工作资料';
  const statusTag = d => `<span class="status-tag ${d.group}">${typeStatus(d)}</span>`;
  const localFile = d => d.id.split('/').map(uri).join('/');
  let bookmarks = [], recent = [], viewStyle='grid', largeType=false;
  try { bookmarks=JSON.parse(localStorage.getItem('jiuzhou-bookmarks')||'[]'); recent=JSON.parse(localStorage.getItem('jiuzhou-recent')||'[]'); viewStyle=localStorage.getItem('jiuzhou-view')||'grid'; largeType=localStorage.getItem('jiuzhou-large')==='true'; } catch {}
  if (!Array.isArray(bookmarks)) bookmarks=[];
  if (!Array.isArray(recent)) recent=[];
  bookmarks=bookmarks.filter(id=>byId.has(id)); recent=recent.filter(id=>byId.has(id));
  if(!['grid','list'].includes(viewStyle)) viewStyle='grid';
  const save = (key, value) => { try { localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));return true; } catch {return false;} };
  let activeDoc=null, searchIndex=-1, searchHits=[], scrollObserver=null, toastTimer=null;
  let graphMode='impact', graphSelection=names.rules, graphZoom=1, graphArchive=false;
  let decisionQuery='';
  let imageScale=1;

  function toast(message) { $('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,2700); }
  function routeState() {
    const value=location.hash.slice(1)||'home';
    const [page, query='']=value.split('?',2);
    return {page, params:new URLSearchParams(query)};
  }
  function navigate(href) { if(location.hash===href) renderRoute(); else location.hash=href; }
  function bookmarkButton(d, labeled=false) {
    const on=bookmarks.includes(d.id);
    return `<button class="${labeled?'button':'icon-button'} ${on?'bookmarked':''}" data-action="bookmark" data-doc="${esc(d.id)}" aria-label="${on?'取消收藏':'收藏'}${esc(d.title)}" aria-pressed="${on}">${icon('bookmark')}${labeled?(on?'已收藏':'收藏'):''}</button>`;
  }
  function updateNav(page, collection='') {
    const links=[['home','home','资料总览',''],['library','library','全部资料',docs.length],['graph','graph','关联图谱',''],['decisions','checklist','待决追踪',DATA.decisions.length]];
    $('#primary-nav').innerHTML=links.map(([id,i,title,count])=>`<a class="nav-link ${page===id?'active':''}" href="#${id}" ${page===id?'aria-current="page"':''}>${icon(i)}<span>${title}</span>${count?`<span class="nav-count">${count}</span>`:''}</a>`).join('');
    $('#collection-nav').innerHTML=Object.entries(DATA.groups).filter(([id])=>id!=='overview').map(([id,g])=>`<a class="collection-link ${collection===id?'active':''}" href="#library?group=${id}"><i class="color-dot" style="--type:${g.color}"></i>${g.name}<span>${docs.filter(d=>d.group===id).length}</span></a>`).join('');
    $('#sidebar-count').textContent='05';
    $('#bookmark-count').textContent=bookmarks.length?String(bookmarks.length).padStart(2,'0'):'';
    $('#bookmark-nav').innerHTML=bookmarks.length?bookmarks.slice(0,6).map(id=>`<a href="${esc(docRoute(id))}">${icon('bookmark')}${esc(byId.get(id).title)}</a>`).join(''):'<span class="bookmark-empty">收藏常用条目，<br>让下一次查阅更近一些。</span>';
  }
  function breadcrumb(label) { $('#breadcrumb').innerHTML=`<a href="#home">九州志</a><span>/</span><b>${esc(label)}</b>`; }
  function recentLinks(){ return recent.length?recent.slice(0,5).map(id=>`<a class="recent-item" href="${esc(docRoute(id))}">${icon(fileIcon(byId.get(id)))}${esc(byId.get(id).title)}<small>${group(byId.get(id)).short}</small></a>`).join(''):'<p class="empty-subtle">读过的篇目会留在这里。<br>不妨先从规则与存在读起。</p>'; }
  function renderHome() {
    breadcrumb('资料总览');
    const guide=[['01',names.rules,'世界的运行方式'],['02',names.life,'众生的存在与延续'],['03',names.timeline,'创世与时代次序'],['04',names.events,'神话中的选择与遗产']];
    const desc={management:'共创分工、条目模板与待定选择',world:'规则、生命与神干预的边界',history:'生成次序、时代衔接与事件',source:'追溯创作者输入与两张原图'};
    const graphCount=new Set(DATA.impacts.map(e=>e.source+'|'+e.target)).size;
    $('#workspace').innerHTML=`<div class="page dashboard"><section class="hero"><div class="eyebrow">JIUZHOU CHRONICLES · KNOWLEDGE ATLAS</div><h1>九州志 <span>· 资料总览</span></h1><p class="hero-copy">从天地初成，到众生万象。<br>循着规则、生命与历史，阅读这个仍在生长的世界。</p><div class="hero-meta"><span>壮阔 · 有烟火气 · 保留希望</span><span>文档整理版 ${esc(DATA.version)}</span><span>正典尚未完整发布</span></div><div class="hero-mark" aria-hidden="true"><b>志</b><span>万象有序</span></div></section><div class="stats-strip"><div class="stat"><strong>${docs.filter(d=>d.format==='md').length}</strong><span>份文档</span></div><div class="stat"><strong>${graphCount}</strong><span>条修改影响</span></div><div class="stat"><strong>${DATA.decisions.length}</strong><span>项待决事项</span></div><span class="stat-note">来源有据 · 关联可循</span></div><div class="dashboard-columns"><div><div class="section-heading"><h2>循序入卷<small>建议阅读路径</small></h2><a class="inline-link" href="${esc(docRoute('README.md'))}">项目总览 ${icon('arrow')}</a></div><div class="reading-path">${guide.filter(x=>x[1]).map(([n,id,note])=>`<a class="reading-step" href="${esc(docRoute(id))}"><small>${n}</small>${icon('arrow')}<b>${esc(byId.get(id).title)}</b><span>${note}</span></a>`).join('')}</div><div class="section-heading"><h2>分卷藏录</h2><a class="inline-link" href="#library">全部资料 ${icon('arrow')}</a></div><div class="group-grid">${['world','history','management','source'].map(key=>{const g=DATA.groups[key],items=docs.filter(d=>d.group===key);return `<a class="group-card" href="#library?group=${key}" style="--type:${g.color}"><div class="group-card-head"><span class="group-icon">${icon(g.icon)}</span><h3>${g.name}</h3><small>${String(items.length).padStart(2,'0')} 篇目</small></div><p>${desc[key]}</p><div class="group-card-bottom"><span>${items.filter(d=>d.format==='md').length} 份文档${items.some(isImage)?' · '+items.filter(isImage).length+' 张原图':''}</span>${icon('arrow')}</div></a>`}).join('')}</div><div class="section-heading"><h2>原图留存<small>创作者提供的关系图</small></h2><a class="inline-link" href="#library?format=image">查看原图 ${icon('arrow')}</a></div><div class="asset-grid">${docs.filter(isImage).map(d=>`<a class="asset-mini" href="${esc(docRoute(d.id))}"><div class="image-preview"><img src="${d.dataUrl}" alt="${esc(d.title)}" loading="lazy"><span class="format-label">${d.format.toUpperCase()}</span></div><div><b>${esc(d.title)}</b><small>${bytes(d.bytes)}</small></div></a>`).join('')}</div></div><aside class="dashboard-side"><section class="side-note"><div class="mini-heading">案头待议 <span>${DATA.decisions.length} 项</span></div><h3>世界的留白，<br>也是下一次创作的起点。</h3><p>区分明确输入与推荐解释，沿主条目继续完善。</p>${DATA.decisions.filter(d=>['D01','D03','D04'].includes(d.id)).map(d=>`<a class="decision-mini" href="${esc(docRoute(DATA.decisionPath,d.anchor))}"><span class="decision-id">${d.id}</span><b>${esc(d.title)}</b><small>${esc(d.status.slice(0,37))}${d.status.length>37?'…':''}</small></a>`).join('')}<a class="inline-link" href="#decisions">进入待决追踪 ${icon('arrow')}</a></section><section class="recent-box"><h3>最近翻阅</h3>${recentLinks()}<a class="inline-link" href="#graph">查看资料之间的联系 ${icon('arrow')}</a></section></aside></div></div>`;
  }

  function docCard(d) {
    return `<article class="doc-card ${d.group}" style="--type:${group(d).color}"><div class="doc-card-top">${typeLabel(d)}<span class="format-label">${d.format.toUpperCase()}</span></div><a class="doc-card-body" href="${esc(docRoute(d.id))}">${isImage(d)?`<div class="thumb"><img src="${d.dataUrl}" alt="${esc(d.title)}" loading="lazy"></div>`:''}<h3>${esc(d.title)}</h3><p>${esc(d.excerpt)}</p></a><div class="doc-card-foot">${statusTag(d)}<span>${d.format==='md'?`${d.sections.filter(s=>s.level>1).length} 章节` : bytes(d.bytes)}</span>${bookmarkButton(d)}</div></article>`;
  }
  function docRow(d) {
    return `<div class="document-row" style="--type:${group(d).color}"><a class="row-title" href="${esc(docRoute(d.id))}">${icon(fileIcon(d))}<span><b>${esc(d.title)}</b><small>${esc(d.excerpt)}</small></span></a>${typeLabel(d)}<span class="row-status">${statusTag(d)}</span><span class="row-date">${formatDate(d.modified)}</span>${bookmarkButton(d)}</div>`;
  }
  function renderLibrary(params) {
    const selected=params.get('group')||'all', format=params.get('format')||'all', onlySaved=params.get('saved')==='1';
    const label=onlySaved?'案头收藏':DATA.groups[selected]?.name||'全部资料';
    breadcrumb(label);
    const filtered=docs.filter(d=>(selected==='all'||d.group===selected)&&(format==='all'||(format==='image'?isImage(d):d.format===format))&&(!onlySaved||bookmarks.includes(d.id)));
    const url=(g,f,s=onlySaved)=>`#library?group=${g}&format=${f}${s?'&saved=1':''}`;
    $('#workspace').innerHTML=`<div class="page"><div class="page-heading"><div><div class="eyebrow">CATALOGUE · 分卷索引</div><h1 class="page-title">${esc(label)}</h1><p class="page-description">按内容归属与文件类型查阅。每份资料都保留来源、章节和关联入口。</p></div><div class="page-heading-actions"><a class="button ${onlySaved?'active':''}" href="${url(selected,format,!onlySaved)}">${icon('bookmark')}收藏 ${bookmarks.length}</a></div></div><div class="filterbar"><div class="chips"><a class="chip ${selected==='all'?'active':''}" href="${url('all',format)}">全部</a>${Object.entries(DATA.groups).filter(([id])=>id!=='overview').map(([id,g])=>`<a class="chip ${id===selected?'active':''}" href="${url(id,format)}">${g.short}</a>`).join('')}</div><select id="format-filter" class="select-control" aria-label="文件类型">${[['all','全部格式'],['md','文档 · MD'],['image','原图 · PNG'],['zip','快照 · ZIP']].map(([v,t])=>`<option value="${v}" ${v===format?'selected':''}>${t}</option>`).join('')}</select><div class="view-toggles" aria-label="资料显示方式"><button data-action="grid" class="${viewStyle==='grid'?'active':''}" aria-label="卡片视图" aria-pressed="${viewStyle==='grid'}">${icon('grid')}</button><button data-action="list" class="${viewStyle==='list'?'active':''}" aria-label="列表视图" aria-pressed="${viewStyle==='list'}">${icon('list')}</button></div></div><div class="results-caption"><span>共 ${filtered.length} 份资料${selected==='archive'?' · 历史材料不作为当前设定依据':''}</span><span>按目录顺序排列</span></div>${filtered.length?`<div class="${viewStyle==='grid'?'doc-grid':'document-list'}">${filtered.map(viewStyle==='grid'?docCard:docRow).join('')}</div>`:`<div class="empty-state">${icon('bookmark')}<h3>这里暂时没有篇目</h3><p>调整筛选条件，或在阅读时收藏常用资料。</p><a href="#library" class="button">查看全部资料</a></div>`}</div>`;
    $('#format-filter').addEventListener('change',e=>navigate(url(selected,e.target.value)));
  }

  function uniqueTargets(edges, direction='target') { return [...new Set(edges.map(e=>e[direction]))].filter(id=>byId.has(id)); }
  function relatedLinks(ids, max=99) { return ids.slice(0,max).map(id=>`<a class="related-link" href="${esc(docRoute(id))}">${icon(fileIcon(byId.get(id)))}${esc(byId.get(id).title)}</a>`).join(''); }
  function renderAside(d) {
    const incoming=uniqueTargets(DATA.links.filter(e=>e.target===d.id&&e.source!==d.id),'source');
    const outgoing=uniqueTargets(DATA.links.filter(e=>e.source===d.id&&e.target!==d.id));
    const downstream=uniqueTargets(DATA.impacts.filter(e=>e.source===d.id));
    const upstream=uniqueTargets(DATA.impacts.filter(e=>e.target===d.id),'source');
    const pending=DATA.decisions.filter(v=>v.links.some(l=>l.target===d.id));
    const sections=d.sections.filter(s=>s.level>1&&s.level<4);
    return `<aside class="reader-aside">${sections.length?`<section class="aside-section toc-section"><h3>本卷目录 <span>${sections.length}</span></h3><nav class="toc-list" aria-label="本页章节">${sections.map(s=>`<a class="toc-link ${s.level===3?'sub':''}" href="${esc(docRoute(d.id,s.id))}" data-toc="${esc(s.id)}">${esc(s.title)}</a>`).join('')}</nav></section>`:''}<section class="aside-section"><h3>本页引用 <span>${outgoing.length}</span></h3>${relatedLinks(outgoing)||'<span class="aside-empty">没有指向其他资料的引用。</span>'}</section><section class="aside-section"><h3>引用本页 <span>${incoming.length}</span></h3>${relatedLinks(incoming)||'<span class="aside-empty">尚无其他资料引用。</span>'}</section>${downstream.length?`<section class="aside-section"><h3>修改后需复查 <span>${downstream.length}</span></h3>${relatedLinks(downstream)}<a class="inline-link" href="#graph?focus=${uri(d.id)}&mode=impact">展开影响路线 ${icon('arrow')}</a></section>`:''}${upstream.length?`<section class="aside-section"><h3>需关注的上游修改 <span>${upstream.length}</span></h3>${relatedLinks(upstream)}</section>`:''}${pending.length?`<section class="aside-section"><h3>相关待决事项 <span>${pending.length}</span></h3>${pending.map(v=>`<a class="related-link" href="${esc(docRoute(DATA.decisionPath,v.anchor))}"><span class="mono">${v.id}</span>${esc(v.title)}</a>`).join('')}</section>`:''}<div class="aside-note">正文引用与修改影响分别记录。<br>具体设定以主条目及其当前状态为准。</div></aside>`;
  }
  function renderReader(params) {
    const id=params.get('doc'), d=byId.get(id);
    if(!d) {breadcrumb('未找到资料');$('#workspace').innerHTML='<div class="page"><div class="empty-state"><h3>这份资料尚未收录</h3><p>它可能已改名或需要重新生成索引。</p><a class="button" href="#library">返回资料目录</a></div></div>';return;}
    activeDoc=d.id;
    recent=[d.id,...recent.filter(x=>x!==d.id)].slice(0,8);save('jiuzhou-recent',recent);
    breadcrumb(d.title);updateNav('read',d.group);
    const sourceLink=`<a class="button source-button" href="${localFile(d)}" download>${icon('download')}源文件</a>`;
    const heading=`<div class="document-heading"><div class="heading-meta">${typeLabel(d)}<span class="format-label">${d.format.toUpperCase()}</span>${statusTag(d)}</div><h1>${esc(d.title)}</h1><div class="document-meta"><span>${icon('clock')}源文件 ${formatDate(d.modified)}</span>${d.characters?`<span>约 ${Math.round(d.characters/100)/10} 千字</span>`:''}<span>${d.format==='md'?'来源于项目正文':bytes(d.bytes)}</span></div>${d.ownership?`<div class="ownership-note"><b>本页维护</b>${esc(d.ownership.scope)}</div>`:''}</div>`;
    let content;
    if(d.format==='md') content=`<article class="document-paper">${d.group==='archive'?'<div class="archive-banner">历史归档 · 用于追溯，不作为现行世界事实。</div>':''}${heading}<div class="prose ${largeType?'large-type':''}" id="document-content">${d.html}</div></article>`;
    else if(isImage(d)) content=`<article class="asset-page">${heading}<div class="asset-view"><button class="asset-stage" data-action="zoom-image" data-doc="${esc(d.id)}" aria-label="放大查看${esc(d.title)}"><img src="${d.dataUrl}" alt="${esc(d.title)}"></button><div class="asset-caption"><span>原图保持原样 · 可放大查看细节</span><button class="button small" data-action="zoom-image" data-doc="${esc(d.id)}">${icon('search')}放大原图</button></div></div><div class="doc-source-path">${esc(d.id)}</div></article>`;
    else content=`<article>${heading}<div class="attachment-card">${icon(d.format==='zip'?'archive':'file')}<h2>${d.format==='zip'?'重组前的完整快照':'资料附件'}</h2><p>${esc(d.excerpt)}<br>文件大小 ${bytes(d.bytes)} · 保留原文件格式</p><a class="button primary" href="${localFile(d)}" download>${icon('download')}打开原始附件</a></div>${d.raw?`<div class="prose"><pre>${esc(d.raw)}</pre></div>`:''}<div class="doc-source-path">${esc(d.id)}</div></article>`;
    $('#workspace').innerHTML=`<div class="reading-progress"></div><div class="page reader-page ${d.group}" style="--type:${group(d).color}"><div class="reader-toolbar"><a class="inline-link" href="#library?group=${d.group}">${icon('back')}返回${group(d).name}</a><div class="reader-tools">${d.format==='md'?`<button class="button ${largeType?'active':''}" data-action="text-size" aria-pressed="${largeType}">${icon('text')}字号</button>`:''}${bookmarkButton(d,true)}<button class="button" data-action="copy-link">${icon('share')}复制链接</button>${sourceLink}</div></div><div class="reader-layout">${content}${renderAside(d)}</div></div>`;
    requestAnimationFrame(()=>{
      if(params.get('section')) jumpToSection(params.get('section'));
      else window.scrollTo(0,0);
      observeSections();
    });
  }
  function jumpToSection(id) {
    const target=document.getElementById(id);
    if(target&&$('#workspace').contains(target)) {
      target.scrollIntoView({block:'start',behavior:'instant'});
      const visible=target.classList.contains('anchor-target')?target.nextElementSibling:target;
      if(visible){visible.classList.add('section-highlight');setTimeout(()=>visible.classList.remove('section-highlight'),1600);}
    } else if(id) toast('此章节尚未收录，请更新资料库后重试。');
  }
  function observeSections(){
    if(scrollObserver)scrollObserver.disconnect();
    if(!('IntersectionObserver' in window))return;
    scrollObserver=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting);
      if(!visible.length)return;
      const id=visible[0].target.dataset.section;
      $$('.toc-link').forEach(a=>a.classList.toggle('active',a.dataset.toc===id));
    },{rootMargin:'-100px 0px -65% 0px',threshold:0});
    $$('.prose [data-section]').forEach(h=>scrollObserver.observe(h));
  }
  function renderDecisions(params) {
    const tab=params.get('tab')||'decisions';breadcrumb('待决追踪');
    $('#workspace').innerHTML=`<div class="page"><div class="page-heading"><div><div class="eyebrow">OPEN QUESTIONS · 共创留白</div><h1 class="page-title">待决追踪</h1><p class="page-description">明确输入继续保留，推荐解释继续推敲。所有选择状态与任务均取自《决策与待办》。</p></div><a class="button" href="${esc(docRoute(DATA.decisionPath))}">${icon('file')}阅读原文</a></div><div class="decision-tabs"><a class="decision-tab ${tab==='decisions'?'active':''}" href="#decisions">待决事项 <span>${DATA.decisions.length}</span></a><a class="decision-tab ${tab==='tasks'?'active':''}" href="#decisions?tab=tasks">创作任务 <span>${DATA.tasks.length}</span></a></div><div class="decision-filter"><input class="inline-input" id="decision-filter" placeholder="筛选关键词或编号，如 魂、D04" value="${esc(decisionQuery)}" aria-label="筛选待决与任务"><span class="page-description">${tab==='tasks'?'任务尚未实际分派':'推荐方案不等于已获批准'}</span></div><div id="decision-items"></div></div>`;
    const renderItems=()=>{
      const q=decisionQuery.trim().toLowerCase();
      const items=(tab==='tasks'?DATA.tasks:DATA.decisions).filter(d=>[d.id,d.title,d.text,d.status,d.dependencyText,d.delivery,d.destination].filter(Boolean).join(' ').toLowerCase().includes(q));
      $('#decision-items').innerHTML=items.length?`<div class="decision-grid">${items.map(d=>tab==='tasks'?`<article class="decision-card task-card" id="task-${d.id}"><div class="decision-card-header"><span class="decision-number">${d.id}</span><h3>${esc(d.title)}</h3></div><div class="decision-card-status">${esc(d.status)}</div><div class="decision-card-body"><p><b>上游条件</b> ${esc(d.dependencyText)}</p><p><b>交付与验收</b><br>${esc(d.delivery)}</p><p class="task-destination">回写位置：${esc(d.destination)}</p></div><div class="decision-card-foot">${d.dependencies.map(id=>`<a class="dependency-pill" href="${id.startsWith('D')?esc(docRoute(DATA.decisionPath,id.toLowerCase())):`#decisions?tab=tasks&task=${id}`}">${id}</a>`).join('')}<a class="inline-link" href="${esc(docRoute(DATA.decisionPath,'当前任务清单'))}">查看任务依据 ${icon('arrow')}</a></div></article>`:`<article class="decision-card"><div class="decision-card-header"><span class="decision-number">${d.id}</span><h3>${esc(d.title)}</h3></div><div class="decision-card-status">${esc(d.status)}</div><div class="decision-card-body">${d.html}</div><div class="decision-card-foot">${[...new Set(d.links.map(l=>l.target))].slice(0,2).map(id=>`<a class="dependency-pill" href="${esc(docRoute(id))}">${esc(byId.get(id)?.title||id)}</a>`).join('')}<a class="inline-link" href="${esc(docRoute(DATA.decisionPath,d.anchor))}">定位原文 ${icon('arrow')}</a></div></article>`).join('')}</div>`:'<div class="empty-state"><h3>没有匹配的事项</h3><p>试试其他关键词或清空筛选。</p></div>';
      if(params.get('task')) requestAnimationFrame(()=>document.getElementById(`task-${params.get('task')}`)?.scrollIntoView({block:'center',behavior:'instant'}));
    };
    $('#decision-filter').addEventListener('input',e=>{decisionQuery=e.target.value;renderItems();});renderItems();
  }

  function graphEdges() {
    let edges=graphMode==='impact'?DATA.impacts:graphMode==='source'?DATA.links.filter(e=>e.type==='source'):graphMode==='reference'?DATA.links:DATA.links.concat(DATA.impacts);
    const seen=new Set();
    return edges.filter(e=>{
      if(e.source===e.target||!byId.has(e.source)||!byId.has(e.target))return false;
      if(!graphArchive&&(byId.get(e.source).group==='archive'||byId.get(e.target).group==='archive'))return false;
      const key=e.source+'|'+e.target+'|'+e.type;
      if(seen.has(key))return false;seen.add(key);return true;
    });
  }
  function indirectImpact(id) {
    const seen=new Set([id]), queue=[id];
    while(queue.length){const x=queue.shift();for(const e of DATA.impacts.filter(v=>v.source===x)){if(!seen.has(e.target)){seen.add(e.target);queue.push(e.target);}}}
    const direct=new Set(DATA.impacts.filter(e=>e.source===id).map(e=>e.target));
    return [...seen].filter(x=>x!==id&&!direct.has(x));
  }
  function renderGraph(params) {
    breadcrumb('关联图谱');
    if(params.has('mode')&&['impact','reference','source','all'].includes(params.get('mode')))graphMode=params.get('mode');
    if(params.has('focus'))graphSelection=byId.has(params.get('focus'))?params.get('focus'):null;
    $('#workspace').innerHTML=`<div class="page"><div class="page-heading"><div><div class="eyebrow">RELATION ATLAS · 关联与约束</div><h1 class="page-title">看见资料之间的脉络</h1><p class="page-description">选择一份资料，查看它引用了什么、被谁引用，以及修改后需要复查哪些篇目。</p></div><a class="button" href="${esc(docRoute(DATA.governancePath,'change-impact'))}">${icon('file')}关系依据</a></div><div class="graph-toolbar"><div class="chips">${[['impact','修改影响'],['reference','正文引用'],['source','来源依据'],['all','全部关联']].map(([id,title])=>`<button class="chip ${id===graphMode?'active':''}" data-action="graph-mode" data-mode="${id}">${title}</button>`).join('')}</div><select id="graph-focus" class="select-control" aria-label="追踪指定资料"><option value="">不聚焦 · 查看全图</option>${docs.filter(d=>(graphArchive||d.group!=='archive')).map(d=>`<option value="${esc(d.id)}" ${d.id===graphSelection?'selected':''}>${esc(d.title)}</option>`).join('')}</select><label><input id="graph-archive" type="checkbox" ${graphArchive?'checked':''}>包含归档</label></div><div class="graph-layout"><div><div class="graph-canvas"><div id="graph-svg"></div><div class="graph-controls"><button data-action="graph-minus" aria-label="缩小图谱">−</button><button data-action="graph-reset">复位</button><button data-action="graph-plus" aria-label="放大图谱">＋</button></div><div class="graph-legend"><span><i class="legend-line impact"></i>修改后需复查</span><span><i class="legend-line"></i>正文引用</span><span><i class="legend-line source"></i>来源依据</span></div></div><p class="graph-notice">箭头由引用方指向被引用方；修改影响由改动入口指向需复查的资料。引用互链不代表对象互为生成前提。点击节点可聚焦，双击可阅读。</p></div><aside id="graph-inspector" class="graph-inspector"></aside></div><div class="section-heading"><h2>关系清单<small id="relation-count"></small></h2><button class="inline-link" data-action="graph-clear">取消聚焦 ${icon('cross')}</button></div><div id="relation-list" class="relation-list"></div></div>`;
    $('#graph-focus').addEventListener('change',e=>{graphSelection=e.target.value||null;drawGraph();});
    $('#graph-archive').addEventListener('change',e=>{graphArchive=e.target.checked;if(!graphArchive&&byId.get(graphSelection)?.group==='archive')graphSelection=null;renderGraph(new URLSearchParams());});
    drawGraph();
  }
  function drawGraph() {
    const edges=graphEdges();
    const present=new Set(edges.flatMap(e=>[e.source,e.target]));
    const nodes=docs.filter(d=>(d.format==='md'||present.has(d.id))&&(graphArchive||d.group!=='archive'));
    const columns=[[],[],[],[]];
    for(const d of nodes){const c=d.group==='source'||d.id===names.charter?0:d.group==='world'?1:d.group==='history'?2:3;columns[c].push(d);}
    // A stable editorial layout: evidence, world mechanisms, history, collaboration.
    const positions=new Map(), width=1040, height=Math.max(560,...columns.map(c=>c.length*93+100));
    columns.forEach((items,c)=>items.forEach((d,i)=>positions.set(d.id,{x:140+c*250,y:105+i*93})));
    const selected=graphSelection&&byId.has(graphSelection)?graphSelection:null;
    const neighbor=new Set(selected?[selected]:nodes.map(d=>d.id));
    edges.forEach(e=>{if(e.source===selected||e.target===selected){neighbor.add(e.source);neighbor.add(e.target);}});
    const viewW=width/graphZoom, viewH=height/graphZoom;
    const focus=positions.get(selected)||{x:width/2,y:height/2};
    const viewX=Math.max(0,Math.min(width-viewW,focus.x-viewW/2)),viewY=Math.max(0,Math.min(height-viewH,focus.y-viewH/2));
    let svg=`<svg viewBox="${viewX} ${viewY} ${viewW} ${viewH}" role="img" aria-label="文档关联图谱，连线的文本清单在图下方"><defs>${[['reference','#91a88b'],['source','#b7a164'],['impact','#ab7954']].map(([name,color])=>`<marker id="arrow-${name}" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="${color}"/></marker>`).join('')}</defs>`;
    svg+=['创作依据','世界机制','历史与叙事','协作与维护'].map((t,i)=>`<text x="${140+i*250}" y="38" text-anchor="middle" font-family="Microsoft YaHei,sans-serif" fill="#9da98d" font-size="12" letter-spacing="2">${t}</text>`).join('');
    for(const e of edges){
      const a=positions.get(e.source),b=positions.get(e.target);if(!a||!b)continue;
      const direct=e.source===selected||e.target===selected;
      let path;
      if(a.x===b.x){const offset=115+(e.source.localeCompare(e.target)>0?12:0);path=`M${a.x+101} ${a.y} C${a.x+offset+30} ${a.y} ${b.x+offset+30} ${b.y} ${b.x+101} ${b.y}`;}
      else{const sign=b.x>a.x?1:-1;path=`M${a.x+sign*101} ${a.y} C${a.x+sign*154} ${a.y} ${b.x-sign*154} ${b.y} ${b.x-sign*101} ${b.y}`;}
      const color=e.type==='impact'?'#ad7b52':e.type==='source'?'#b2a166':'#9aac90';
      svg+=`<path class="graph-edge ${selected&&!direct?'dim':''} ${direct?'focused':''}" d="${path}" fill="none" stroke="${color}" stroke-width="1.3" ${e.type==='impact'?'stroke-dasharray="5 4"':''} marker-end="url(#arrow-${e.type})"><title>${esc(byId.get(e.source).title)} → ${esc(byId.get(e.target).title)}</title></path>`;
    }
    for(const d of nodes){const p=positions.get(d.id),g=group(d),isSelected=d.id===selected,dim=selected?!neighbor.has(d.id):!present.has(d.id);svg+=`<g class="graph-node ${dim?'dim':''}" role="button" tabindex="0" data-node="${esc(d.id)}" aria-label="聚焦${esc(d.title)}" transform="translate(${p.x-101},${p.y-27})"><rect width="202" height="54" rx="5" fill="${isSelected?'#ecf3df':'#fffef8'}" stroke="${isSelected?'#537b45':'#d9e1cb'}" stroke-width="${isSelected?'2':'1'}"/><rect x="0" y="11" width="3" height="32" fill="${g.color}" stroke="none"/><text x="16" y="23" font-size="15" fill="#516a42">${esc(d.title)}</text><text x="16" y="41" font-size="10" fill="${g.color}">${g.name} · ${d.format.toUpperCase()}</text>${isSelected?'<circle cx="185" cy="15" r="3" fill="#6a8f56"/>':''}</g>`;}
    svg+='</svg>';$('#graph-svg').innerHTML=svg;
    $$('#graph-svg [data-node]').forEach(el=>{
      el.addEventListener('click',()=>{graphSelection=el.dataset.node;$('#graph-focus').value=graphSelection;drawGraph();});
      el.addEventListener('dblclick',()=>navigate(docRoute(el.dataset.node)));
      el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();graphSelection=el.dataset.node;$('#graph-focus').value=graphSelection;drawGraph();}});
    });
    const related=selected?edges.filter(e=>e.source===selected||e.target===selected):edges;
    $('#relation-count').textContent=`${related.length} 条${selected?' · 当前聚焦':''}`;
    $('#relation-list').innerHTML=related.length?related.map(e=>`<div class="relation-row"><span class="relation-kind ${e.type}">${e.type==='impact'?'需复查':e.type==='source'?'来源依据':'正文引用'}</span><a href="${esc(docRoute(e.source))}">${esc(byId.get(e.source).title)}</a>${icon('arrow')}<a href="${esc(docRoute(e.target,e.anchor))}">${esc(byId.get(e.target).title)}</a><a href="${esc(docRoute(e.evidence||e.source,e.evidenceAnchor||e.sourceAnchor))}">查看依据 ↗</a></div>`).join(''):'<div class="search-empty">该资料在当前关系类型下暂无关联。可切换关系类型或取消聚焦。</div>';
    if(selected){const d=byId.get(selected),out=uniqueTargets(edges.filter(e=>e.source===selected)),inc=uniqueTargets(edges.filter(e=>e.target===selected),'source'),indirect=graphMode==='impact'?indirectImpact(selected):[];
      $('#graph-inspector').innerHTML=`${typeLabel(d)}<h3>${esc(d.title)}</h3><p>${esc(d.ownership?.scope||d.excerpt)}</p><a class="button primary" href="${esc(docRoute(d.id))}">${icon('file')}阅读主文档</a><div class="inspector-count"><span>指向 ${out.length} 份</span><span>来自 ${inc.length} 份</span></div><div class="inspector-relations"><div><h4>${graphMode==='impact'?'直接需复查':'本页指向'}</h4>${relatedLinks(out)||'<span class="aside-empty">暂无对应资料</span>'}</div><div><h4>${graphMode==='impact'?'上游改动入口':'指向本页'}</h4>${relatedLinks(inc)||'<span class="aside-empty">暂无对应资料</span>'}</div>${indirect.length?`<div><h4>沿路线继续追踪</h4>${relatedLinks(indirect)}<p class="impact-note">由现有检查路线逐级推导，是否实际受影响需结合具体改动判断。</p></div>`:''}</div>`;
    }else $('#graph-inspector').innerHTML=`<span class="type-label">${icon('graph')}关系浏览</span><h3>选择一卷，<br>展开它的联系。</h3><p>点击节点或使用上方选择框。右侧会列出直接关联，修改影响视图还会追踪后续路线。</p><div class="inspector-count">${nodes.length} 份文档 · ${edges.length} 组关系</div>`;
  }

  function highlight(text,query) {
    const safe=esc(text);if(!query)return safe;
    const pattern=esc(query).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    try{return safe.replace(new RegExp(pattern,'gi'),m=>`<mark>${m}</mark>`);}catch{return safe;}
  }
  function searchDocs(query, includeArchive) {
    const q=query.trim().toLowerCase(), terms=q.split(/\s+/).filter(Boolean), hits=[];
    if(!q)return [];
    for(const d of docs){
      if(!includeArchive&&d.group==='archive')continue;
      const title=d.title.toLowerCase();
      let best=null;
      const sections=d.sections.length?d.sections:[{id:'',title:d.title,text:d.excerpt}];
      for(const s of sections){
        const combined=[title,s.title,s.text].join(' ').toLowerCase();
        if(!terms.every(t=>combined.includes(t)))continue;
        const score=(title.includes(q)?80:0)+(s.title.toLowerCase().includes(q)?45:0)+terms.reduce((n,t)=>n+(s.text.toLowerCase().includes(t)?5:0),0);
        const index=Math.max(0,s.text.toLowerCase().indexOf(terms.find(t=>s.text.toLowerCase().includes(t))||q));
        const start=Math.max(0,index-40), snippet=(start?'…':'')+s.text.slice(start,start+150)+(s.text.length>start+150?'…':'');
        if(!best||score>best.score)best={doc:d,section:s.id,sectionTitle:s.title,score,snippet};
      }
      if(!best&&terms.every(t=>title.includes(t)))best={doc:d,section:'',sectionTitle:'',score:80,snippet:d.excerpt};
      if(best)hits.push(best);
    }
    return hits.sort((a,b)=>b.score-a.score);
  }
  function updateSearch() {
    const q=$('#search-input').value.trim();searchHits=searchDocs(q,$('#search-archive').checked);searchIndex=-1;
    $('#search-summary').textContent=q?`找到 ${searchHits.length} 份相关资料`:'输入关键词，搜索所有现行资料';
    if(!q){$('#search-results').innerHTML=`<div class="search-suggestions"><p>从一个概念开始</p>${['灵','五行','补天','女娲','D04','先驱','身份连续性'].map(t=>`<button data-action="suggest-search" data-query="${t}">${t}</button>`).join('')}<p style="margin-top:15px">也可以按正文中的词句检索，结果会定位到相关章节。</p></div>`;return;}
    $('#search-results').innerHTML=searchHits.length?searchHits.map((hit,i)=>`<a class="search-hit" href="${esc(docRoute(hit.doc.id,hit.section))}" data-search-index="${i}" role="listitem"><div class="search-hit-top">${typeLabel(hit.doc)}<b>${highlight(hit.doc.title,q)}</b><span class="format-label">${hit.doc.format.toUpperCase()}</span></div><p>${highlight(hit.snippet,q)}</p><small>${esc(hit.sectionTitle===hit.doc.title?'文档开篇':hit.sectionTitle)}${hit.doc.group==='archive'?' · 历史归档':''}</small></a>`).join(''):'<div class="search-empty">没有找到相关资料。试试更短的词，或启用“包含归档”。</div>';
  }
  function openSearch(){ $('#search-dialog').showModal();updateSearch();setTimeout(()=>$('#search-input').focus(),0); }
  function showImage(id){const d=byId.get(id);if(!d?.dataUrl)return;$('#image-title').textContent=d.title;$('#zoom-image').src=d.dataUrl;$('#zoom-image').alt=d.title;$('#image-dialog').showModal();$('#zoom-image').onload=fitImage;if($('#zoom-image').complete)requestAnimationFrame(fitImage);}
  function fitImage(){const img=$('#zoom-image'),stage=$('#image-zoom-stage');imageScale=Math.min(1,(stage.clientWidth-42)/img.naturalWidth,(stage.clientHeight-42)/img.naturalHeight);applyImageScale();}
  function applyImageScale(){const img=$('#zoom-image');img.style.width=`${Math.max(80,img.naturalWidth*imageScale)}px`;}
  async function copyCurrentLink(){try{await navigator.clipboard.writeText(location.href);toast('已复制本地页面链接。');}catch{const field=document.createElement('textarea');field.value=location.href;field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();const ok=document.execCommand('copy');field.remove();toast(ok?'已复制本地页面链接。':'请从浏览器地址栏复制当前链接。');}}
  function toggleBookmark(id){if(!byId.has(id))return;const on=bookmarks.includes(id);bookmarks=on?bookmarks.filter(x=>x!==id):[id,...bookmarks];const persisted=save('jiuzhou-bookmarks',bookmarks);updateNav(routeState().page,activeDoc?byId.get(activeDoc)?.group:routeState().params.get('group'));$$('[data-action="bookmark"]').filter(b=>b.dataset.doc===id).forEach(b=>{const labeled=b.classList.contains('button');b.outerHTML=bookmarkButton(byId.get(id),labeled);});toast(`${on?'已取消收藏':'已加入案头收藏'}${persisted?'。':'，当前浏览器无法持久保存。'}`);if(routeState().page==='library'&&routeState().params.get('saved')==='1')renderLibrary(routeState().params);}
  function renderRoute() {
    const previous=activeDoc, state=routeState();activeDoc=null;
    if(scrollObserver)scrollObserver.disconnect();
    if($('#search-dialog').open)$('#search-dialog').close();
    $('#sidebar').classList.remove('open');$('#mobile-shade').hidden=true;
    updateNav(state.page,state.params.get('group'));
    if(state.page==='read'&&previous===state.params.get('doc')&&$('#document-content')){
      activeDoc=previous;updateNav('read',byId.get(previous)?.group);jumpToSection(state.params.get('section'));observeSections();return;
    }
    window.scrollTo(0,0);
    if(state.page==='library')renderLibrary(state.params);
    else if(state.page==='read')renderReader(state.params);
    else if(state.page==='graph')renderGraph(state.params);
    else if(state.page==='decisions')renderDecisions(state.params);
    else renderHome();
    document.title=`${activeDoc?byId.get(activeDoc).title:({home:'资料总览',library:'分卷索引',graph:'关联图谱',decisions:'待决追踪'}[state.page]||'资料总览')} · 九州志`;
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest('[data-action]');
    if(target){const action=target.dataset.action;
      if(action==='search')openSearch();
      else if(action==='help')$('#help-dialog').showModal();
      else if(action==='close-help')$('#help-dialog').close();
      else if(action==='menu'){$('#sidebar').classList.toggle('open');$('#mobile-shade').hidden=!$('#sidebar').classList.contains('open');}
      else if(action==='bookmark')toggleBookmark(target.dataset.doc);
      else if(action==='copy-link')copyCurrentLink();
      else if(action==='text-size'){largeType=!largeType;save('jiuzhou-large',largeType);$('.prose')?.classList.toggle('large-type',largeType);target.classList.toggle('active',largeType);target.setAttribute('aria-pressed',String(largeType));}
      else if(action==='grid'||action==='list'){viewStyle=action;save('jiuzhou-view',action);renderLibrary(routeState().params);}
      else if(action==='suggest-search'){$('#search-input').value=target.dataset.query;updateSearch();$('#search-input').focus();}
      else if(action==='zoom-image')showImage(target.dataset.doc);
      else if(action==='close-image')$('#image-dialog').close();
      else if(action==='image-fit')fitImage();
      else if(action==='image-plus'){imageScale=Math.min(4,imageScale*1.35);applyImageScale();}
      else if(action==='image-minus'){imageScale=Math.max(.05,imageScale/1.35);applyImageScale();}
      else if(action==='graph-mode'){graphMode=target.dataset.mode;renderGraph(new URLSearchParams());}
      else if(action==='graph-clear'){graphSelection=null;$('#graph-focus').value='';drawGraph();}
      else if(action==='graph-plus'){graphZoom=Math.min(2.2,graphZoom*1.2);drawGraph();}
      else if(action==='graph-minus'){graphZoom=Math.max(1,graphZoom/1.2);drawGraph();}
      else if(action==='graph-reset'){graphZoom=1;drawGraph();}
    }
    const link=e.target.closest('a[href^="#"]');
    if(link&&$('#search-dialog').contains(link))$('#search-dialog').close();
    if(link&&link.getAttribute('href')===location.hash&&link.hash.startsWith('#read?')){e.preventDefault();const ps=new URLSearchParams(link.hash.split('?')[1]);jumpToSection(ps.get('section'));}
  });
  $('#mobile-shade').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#mobile-shade').hidden=true;});
  $('#search-input').addEventListener('input',updateSearch);
  $('#search-archive').addEventListener('change',updateSearch);
  $('#search-dialog form').addEventListener('submit',e=>{if(e.submitter?.value!=='close'){e.preventDefault();if(searchHits.length)navigate(docRoute(searchHits[Math.max(0,searchIndex)].doc.id,searchHits[Math.max(0,searchIndex)].section));}});
  $('#search-input').addEventListener('keydown',e=>{
    if((e.key==='ArrowDown'||e.key==='ArrowUp')&&searchHits.length){e.preventDefault();searchIndex=searchIndex<0?(e.key==='ArrowDown'?0:searchHits.length-1):(searchIndex+(e.key==='ArrowDown'?1:-1)+searchHits.length)%searchHits.length;$$('.search-hit').forEach((a,i)=>a.classList.toggle('selected',i===searchIndex));$(`[data-search-index="${searchIndex}"]`)?.scrollIntoView({block:'nearest'});}
    if(e.key==='Enter'&&searchHits.length){e.preventDefault();const h=searchHits[Math.max(searchIndex,0)];navigate(docRoute(h.doc.id,h.section));$('#search-dialog').close();}
  });
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('#search-dialog').open)openSearch();else $('#search-input').focus();}if(e.key==='Escape'){$('#sidebar').classList.remove('open');$('#mobile-shade').hidden=true;}});
  for(const dialog of [$('#help-dialog'),$('#search-dialog'),$('#image-dialog')])dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  window.addEventListener('hashchange',renderRoute);
  window.addEventListener('scroll',()=>{const bar=$('.reading-progress');if(!bar)return;const total=document.documentElement.scrollHeight-window.innerHeight;bar.style.width=`${Math.min(1,window.scrollY/Math.max(total,1))*(window.innerWidth-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar')))}px`;},{passive:true});
  $$('.search-icon').forEach(el=>el.innerHTML=icon('search'));
  $('.mobile-menu').innerHTML=icon('menu');$('.top-help').innerHTML=icon('help');
  $('#build-date').textContent=`资料汇集于 ${formatDate(DATA.builtAt)}`;
  $('#help-build').textContent=`本页生成于 ${new Date(DATA.builtAt).toLocaleString('zh-CN')} · ${docs.filter(d=>d.format==='md').length} 份文档 · ${docs.filter(isImage).length} 张原图。更新需要本机 Python 3；阅读无需安装其他软件。`;
  renderRoute();
  // Expose read-only diagnostics for local verification; no write access to sources.
  window.__JIUZHOU__=Object.freeze({documentCount:docs.length,markdownCount:docs.filter(d=>d.format==='md').length,decisionCount:DATA.decisions.length,taskCount:DATA.tasks.length,impactCount:DATA.impacts.length,search:(q,includeArchive=false)=>searchDocs(q,includeArchive).map(h=>({id:h.doc.id,section:h.section,title:h.doc.title})),builtAt:DATA.builtAt});
})();
