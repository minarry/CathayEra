"""Build the offline reader from the project's authoritative Markdown files.

No external libraries or network access are required. The generated HTML is a
read-only view. Citation and impact edges are extracted from source documents.
"""
from __future__ import annotations

import base64
import hashlib
import html
import json
import mimetypes
import posixpath
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
TOOL = Path(__file__).resolve().parent
OUTPUT = ROOT / '九州志资料库.html'
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

GROUPS = {
    'overview': {'name': '项目总览', 'short': '总览', 'icon': 'compass', 'color': '#596959'},
    'management': {'name': '项目管理', 'short': '管理', 'icon': 'folder', 'color': '#526b87'},
    'world': {'name': '世界设定', 'short': '设定', 'icon': 'hexagon', 'color': '#337669'},
    'history': {'name': '世界历史', 'short': '历史', 'icon': 'scroll', 'color': '#a95e40'},
    'story': {'name': '故事创作', 'short': '故事', 'icon': 'feather', 'color': '#78638b'},
    'source': {'name': '来源资料', 'short': '来源', 'icon': 'feather', 'color': '#9b7c33'},
    'archive': {'name': '历史归档', 'short': '归档', 'icon': 'archive', 'color': '#827b76'},
}
FOLDERS = {'00_项目管理': 'management', '01_世界设定': 'world', '02_世界历史': 'history', '03_故事创作': 'story', '资料': 'source', '归档': 'archive'}
DECISION_PATH = '00_项目管理/决策与待办.md'
GOV_PATH = '00_项目管理/协作与版本管理.md'
LINK_RE = re.compile(r'(!?)\[([^\]\n]+)\]\(([^)\n]+)\)')
ERRORS: list[str] = []


def plain(value: str) -> str:
    value = re.sub(r'<[^>]+>', '', value)
    value = LINK_RE.sub(lambda m: m.group(2), value)
    return re.sub(r'[`*_#]', '', value).strip()


def normalize_link(path: str, target: str) -> tuple[str, str, str]:
    target = target.strip().strip('<>')
    parts = urlsplit(target)
    if parts.scheme:
        return ('external' if parts.scheme in ('http', 'https', 'mailto') else 'blocked', target, '')
    file = posixpath.normpath(posixpath.join(posixpath.dirname(path), unquote(parts.path))) if parts.path else path
    if file.startswith('../') or file.startswith('/'):
        return ('blocked', file, '')
    return 'local', file, unquote(parts.fragment)


def route(path: str, anchor: str = '') -> str:
    return '#read?doc=' + quote(path, safe='') + ('&section=' + quote(anchor, safe='') if anchor else '')


def get_group(path: str) -> str:
    return FOLDERS.get(path.split('/')[0], 'overview')


paths = [ROOT / 'README.md']
for folder in FOLDERS:
    paths.extend(sorted((ROOT / folder).rglob('*')))
paths = [p for p in paths if p.is_file() and p.suffix.lower() in ('.md', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.zip', '.pdf', '.txt')]
PATHS = {p.relative_to(ROOT).as_posix(): p for p in paths}
DOCUMENTS: dict[str, dict] = {}
LINKS: list[dict] = []


def scan_headings(raw: str) -> list[dict]:
    items = []
    pending = None
    used: set[str] = set()
    fenced = False
    for number, line in enumerate(raw.splitlines(), 1):
        if re.match(r'^\s*```', line):
            fenced = not fenced
            continue
        if fenced:
            continue
        anchor = re.fullmatch(r'\s*<a\s+id="([^"]+)"\s*>\s*</a>\s*', line)
        if anchor:
            pending = anchor.group(1)
        match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if match:
            title = plain(match.group(2))
            base = pending or re.sub(r'[^\w\u4e00-\u9fff-]+', '-', title.lower()).strip('-') or 'section'
            slug = base
            i = 2
            while slug in used:
                slug = f'{base}-{i}'
                i += 1
            used.add(slug)
            items.append({'title': title, 'level': len(match.group(1)), 'id': slug, 'line': number, 'explicit': pending})
            pending = None
    return items


for path, file in PATHS.items():
    if file.suffix == '.md':
        raw = file.read_text(encoding='utf-8-sig')
        headings = scan_headings(raw)
        multiple_titles = sum(h['level'] == 1 for h in headings) > 1
        title = file.stem if multiple_titles else headings[0]['title'] if headings else file.stem
        if multiple_titles:
            for heading in headings:
                heading['level'] = min(6, heading['level'] + 1)
        title = re.sub(r'^九州志\s*', '', title) or title
        sections = []
        lines = raw.splitlines()
        for i, item in enumerate(headings):
            end = headings[i + 1]['line'] - 1 if i + 1 < len(headings) else len(lines)
            text = plain('\n'.join(lines[item['line']:end]))
            sections.append({**item, 'text': text})
        first_para = next((plain(p) for p in re.split(r'\n\s*\n', raw) if p.strip() and not p.lstrip().startswith(('#', '<a', '|', '```'))), '')
        DOCUMENTS[path] = {'id': path, 'title': title, 'group': get_group(path), 'format': 'md', 'raw': raw, 'sections': sections,
                           'excerpt': first_para[:150], 'characters': len(re.sub(r'\s', '', plain(raw))),
                           'modified': datetime.fromtimestamp(file.stat().st_mtime).isoformat(timespec='seconds'),
                           'digest': hashlib.sha256(file.read_bytes()).hexdigest(), 'bytes': file.stat().st_size}
    else:
        fmt = file.suffix[1:].lower()
        item = {'id': path, 'title': file.stem, 'group': get_group(path), 'format': fmt, 'sections': [],
                'excerpt': '创作者提供的原始关系图，保持原图内容。' if fmt in ('png', 'jpg', 'jpeg', 'webp', 'svg') else '历史快照或附件，保留原文件供追溯。',
                'modified': datetime.fromtimestamp(file.stat().st_mtime).isoformat(timespec='seconds'),
                'bytes': file.stat().st_size, 'digest': hashlib.sha256(file.read_bytes()).hexdigest()}
        if fmt in ('png', 'jpg', 'jpeg', 'webp', 'svg'):
            item['dataUrl'] = f'data:{mimetypes.guess_type(file.name)[0]};base64,' + base64.b64encode(file.read_bytes()).decode('ascii')
        elif fmt == 'txt':
            item['raw'] = file.read_text(encoding='utf-8-sig')
            item['excerpt'] = '原始对话全文；区分 User 输入、Agent 建议及其后续修订。'
            lines = item['raw'].splitlines()
            starts = [i for i, line in enumerate(lines) if re.match(r'^(User|Agent)[：:]', line)]
            for n, start in enumerate(starts):
                end = starts[n+1] if n+1 < len(starts) else len(lines)
                who = lines[start].split('：', 1)[0]
                item['sections'].append({'id': f'line-{start+1}', 'title': f'{who} 发言 · 第{start+1}行', 'level': 2, 'line': start+1, 'text': '\n'.join(lines[start:end])})
        DOCUMENTS[path] = item


def inline(text: str, path: str) -> str:
    """Render the project's inline Markdown, allowing only known-safe markup."""
    tokens: list[str] = []

    def protect(value: str) -> str:
        index = len(tokens)
        tokens.append(value)
        return f'\x00{index}\x00'

    text = re.sub(r'`([^`\n]+)`', lambda m: protect('<code>' + html.escape(m.group(1)) + '</code>'), text)

    def replace_link(match):
        image, label, target = match.groups()
        kind, dest, anchor = normalize_link(path, target)
        label = html.escape(label)
        if kind == 'blocked':
            return protect(label)
        if kind == 'external':
            return protect(f'<a href="{html.escape(dest, quote=True)}" target="_blank" rel="noopener noreferrer">{label}<span class="external-mark" aria-label="外部链接">↗</span></a>')
        if dest in DOCUMENTS:
            href = html.escape(route(dest, anchor), quote=True)
            if image and DOCUMENTS[dest].get('dataUrl'):
                return protect(f'<a class="embedded-image" href="{href}"><img src="{DOCUMENTS[dest]["dataUrl"]}" alt="{label}" loading="lazy"><span>{label} · 点击查看原图</span></a>')
            return protect(f'<a href="{href}">{label}</a>')
        if dest == OUTPUT.name:
            return protect(f'<a href="#home">{label}</a>')
        absolute = ROOT / dest
        if absolute.is_file() or dest == '更新资料库.cmd':
            return protect(f'<a href="{html.escape(quote(dest, safe="/"), quote=True)}" download>{label} ↓</a>')
        ERRORS.append(f'{path}: 未找到链接 {target}')
        return protect(f'<span class="broken-link" title="来源文件中的链接待修复">{label}</span>')

    text = LINK_RE.sub(replace_link, text)
    text = html.escape(text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'(?<!\*)\*([^*]+?)\*(?!\*)', r'<em>\1</em>', text)
    text = re.sub(r'~~(.+?)~~', r'<del>\1</del>', text)
    text = re.sub(r'【([^】]+)】', r'<span class="rule-token">【\1】</span>', text)
    return re.sub(r'\x00(\d+)\x00', lambda m: tokens[int(m.group(1))], text)


def table_cells(line: str) -> list[str]:
    return [cell.strip() for cell in re.split(r'(?<!\\)\|', line.strip().strip('|'))]


def render_mermaid(code: str) -> str:
    """Render supported flowchart notation offline; retain the source for inspection."""
    nodes = {}
    edges = []
    node_re = re.compile(r'([A-Za-z]\w*)(\(\((.*?)\)\)|\[(.*?)\])')
    for line in code.splitlines():
        for match in node_re.finditer(line):
            nodes[match.group(1)] = {'label': match.group(3) or match.group(4), 'circle': match.group(3) is not None}
        clean = node_re.sub(lambda m: m.group(1), line).strip()
        match = re.match(r'^(\w+)\s*-->\s*(?:\|([^|]+)\|\s*)?(\w+)\s*$', clean)
        if match:
            edges.append((match.group(1), match.group(3), match.group(2) or ''))
    if not nodes or any(a not in nodes or b not in nodes for a, b, _ in edges):
        return '<pre class="code-block"><code>' + html.escape(code) + '</code></pre>'
    ranks = {n: 0 for n in nodes}
    for _ in nodes:
        changed = False
        for a, b, _ in edges:
            if ranks[b] < ranks[a] + 1:
                ranks[b] = ranks[a] + 1
                changed = True
        if not changed:
            break
    if max(ranks.values()) > len(nodes):
        return '<pre class="code-block"><code>' + html.escape(code) + '</code></pre>'
    levels = {}
    for n, rank in ranks.items():
        levels.setdefault(rank, []).append(n)
    width = 760
    height = (max(ranks.values()) + 1) * 128 + 40
    positions = {}
    for rank, names in levels.items():
        for i, name in enumerate(names):
            positions[name] = ((i + 1) * width / (len(names) + 1), 55 + rank * 128)
    parts = [f'<svg class="creation-chart" role="img" aria-label="创世演化关系图：方形为规则，圆形为存在" viewBox="0 0 {width} {height}">', '<defs><marker id="creation-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#708b81"/></marker></defs>']
    for a, b, label in edges:
        x1, y1 = positions[a]; x2, y2 = positions[b]
        bend = -90 if ranks[b] - ranks[a] > 1 else 0
        parts.append(f'<path d="M{x1},{y1+26} C{x1+bend},{y1+75} {x2+bend},{y2-75} {x2},{y2-28}" fill="none" stroke="#9aaba1" stroke-width="1.4" marker-end="url(#creation-arrow)"/>')
        if label and not bend:
            parts.append(f'<text x="{(x1+x2)/2+8}" y="{(y1+y2)/2+3}" font-size="12" fill="#65756c">{html.escape(label)}</text>')
    for n, item in nodes.items():
        x, y = positions[n]
        if item['circle']:
            parts.append(f'<ellipse cx="{x}" cy="{y}" rx="103" ry="29" fill="#f3eee2" stroke="#aa9462"/>')
        else:
            parts.append(f'<rect x="{x-101}" y="{y-25}" width="202" height="50" rx="3" fill="#e6eeE8" stroke="#5c8372"/>')
        parts.append(f'<text x="{x}" y="{y+5}" text-anchor="middle" fill="#283c32" font-size="14">{html.escape(item["label"])}</text>')
    parts.append('</svg>')
    return '<figure class="diagram"><figcaption>创世演化 · 规则与存在的形成次序</figcaption>' + ''.join(parts) + '<details><summary>查看关系图源文</summary><pre><code>' + html.escape(code) + '</code></pre></details></figure>'


def render(raw: str, path: str, headings: list[dict] | None = None) -> str:
    lines = raw.splitlines()
    heads = {item['line']: item for item in (headings or [])}
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1; continue
        anchor = re.fullmatch(r'\s*<a\s+id="([^"]+)"\s*>\s*</a>\s*', line)
        if anchor:
            out.append(f'<span id="{html.escape(anchor.group(1))}" class="anchor-target"></span>')
            i += 1; continue
        fence = re.match(r'^\s*```(\w*)', line)
        if fence:
            i += 1; code = []
            while i < len(lines) and not re.match(r'^\s*```', lines[i]):
                code.append(lines[i]); i += 1
            if i == len(lines): ERRORS.append(f'{path}: 代码围栏未闭合')
            value = '\n'.join(code)
            out.append(render_mermaid(value) if fence.group(1) == 'mermaid' else '<pre class="code-block"><code>' + html.escape(value) + '</code></pre>')
            i += 1; continue
        heading = re.match(r'^(#{1,6})\s+(.+)$', line)
        if heading:
            meta = heads.get(i + 1)
            level = meta['level'] if meta else min(6, len(heading.group(1)))
            slug = meta['id'] if meta else re.sub(r'\s+', '-', plain(heading.group(2)))
            ident = f'id="{html.escape(slug)}"' if not (meta and meta['explicit']) else ''
            if level != 1:
                out.append(f'<h{level} {ident} data-section="{html.escape(slug)}">{inline(heading.group(2), path)}<a class="heading-link" href="{html.escape(route(path, slug), quote=True)}" aria-label="本章节链接">#</a></h{level}>')
            else:
                out.append(f'<span {ident} class="anchor-target"></span>')
            i += 1; continue
        if line.lstrip().startswith('|') and i + 1 < len(lines) and re.match(r'^\s*\|?[\s:|-]+\|\s*$', lines[i+1]):
            header = table_cells(line); i += 2
            out.append('<div class="table-scroll" tabindex="0" role="region" aria-label="可横向滚动的资料表"><table><thead><tr>' + ''.join('<th scope="col">' + inline(c, path) + '</th>' for c in header) + '</tr></thead><tbody>')
            while i < len(lines) and lines[i].lstrip().startswith('|'):
                cells = table_cells(lines[i])
                if len(cells) != len(header): ERRORS.append(f'{path}:{i+1}: 表格列数不一致')
                out.append('<tr>' + ''.join('<td>' + inline(c, path) + '</td>' for c in cells) + '</tr>'); i += 1
            out.append('</tbody></table></div>'); continue
        if re.match(r'^\s*>', line):
            quoted = []
            while i < len(lines) and (re.match(r'^\s*>', lines[i]) or (not lines[i].strip() and i+1 < len(lines) and re.match(r'^\s*>', lines[i+1]))):
                quoted.append(re.sub(r'^\s*> ?', '', lines[i])); i += 1
            out.append('<blockquote>' + render('\n'.join(quoted), path) + '</blockquote>'); continue
        lm = re.match(r'^(\s*)([-+*]|\d+[.)])\s+(.+)$', line)
        if lm:
            ordered = bool(re.match(r'\d', lm.group(2)))
            tag = 'ol' if ordered else 'ul'
            start = f' start="{re.match(r"\d+", lm.group(2)).group()}"' if ordered else ''
            out.append(f'<{tag}{start}>')
            while i < len(lines):
                match = re.match(r'^(\s*)([-+*]|\d+[.)])\s+(.+)$', lines[i])
                if not match or bool(re.match(r'\d', match.group(2))) != ordered:
                    break
                content = [match.group(3)]; i += 1
                while i < len(lines) and lines[i].startswith('  ') and not re.match(r'^\s*([-+*]|\d+[.)])\s+', lines[i]):
                    content.append(lines[i].strip()); i += 1
                out.append('<li>' + inline(' '.join(content), path) + '</li>')
            out.append(f'</{tag}>'); continue
        if re.fullmatch(r'\s*(---+|\*\*\*+)\s*', line):
            out.append('<hr>'); i += 1; continue
        paragraph = [line]; i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#{1,6}\s|\s*```|\s*<a\s|\s*>|\s*\||\s*[-+*]\s|\s*\d+[.)]\s)', lines[i]):
            paragraph.append(lines[i]); i += 1
        out.append('<p>' + inline(' '.join(paragraph), path) + '</p>')
    return '\n'.join(out)


def local_matches(text: str, path: str) -> list[dict]:
    result = []
    for match in LINK_RE.finditer(text):
        kind, target, anchor = normalize_link(path, match.group(3))
        if kind == 'local' and target in DOCUMENTS:
            result.append({'target': target, 'anchor': anchor, 'label': plain(match.group(2))})
    return result


def block_after(raw: str, heading: str) -> str:
    found = re.search(r'^#{2,3}\s+' + re.escape(heading) + r'\s*$', raw, re.M)
    if not found: return ''
    tail = raw[found.end():]
    next_heading = re.search(r'^#{1,3}\s+', tail, re.M)
    return tail[:next_heading.start()] if next_heading else tail


for path, item in DOCUMENTS.items():
    if item['format'] != 'md': continue
    current_section = ''
    lines = item['raw'].splitlines()
    hlines = {h['line']: h for h in item['sections']}
    fenced = False
    for n, line in enumerate(lines, 1):
        if re.match(r'^\s*```', line): fenced = not fenced
        if fenced: continue
        if n in hlines: current_section = hlines[n]['id']
        for link in local_matches(line, path):
            target_doc = DOCUMENTS[link['target']]
            if link['anchor']:
                available = {s['id'] for s in target_doc['sections']} | set(re.findall(r'<a\s+id="([^"]+)"', target_doc.get('raw', '')))
                if link['anchor'] not in available: ERRORS.append(f'{path}:{n}: 章节不存在 {link["target"]}#{link["anchor"]}')
            LINKS.append({'source': path, **link, 'type': 'source' if target_doc['group'] == 'source' and item['group'] != 'source' else 'reference', 'sourceAnchor': current_section, 'line': n})
    item['html'] = render(item['raw'], path, item['sections'])

ownership = []
gov = DOCUMENTS[GOV_PATH]['raw']
for line in block_after(gov, '文档归属与修改入口').splitlines():
    if not line.startswith('|'): continue
    cells = table_cells(line)
    linked = local_matches(cells[0], GOV_PATH)
    if linked and len(cells) == 3:
        ownership.append({'doc': linked[0]['target'], 'scope': plain(cells[1]), 'excludes': plain(cells[2])})

for row in ownership:
    DOCUMENTS[row['doc']]['ownership'] = row
    DOCUMENTS[row['doc']]['excerpt'] = row['scope']

impacts = []
for line in block_after(gov, '现有主文档的影响检查路线').splitlines():
    if not line.startswith('|'): continue
    cells = table_cells(line)
    if len(cells) != 3: continue
    sources = local_matches(cells[0], GOV_PATH)
    targets = local_matches(cells[1], GOV_PATH)
    for source in sources:
        for target in targets:
            if source['target'] != target['target']:
                impacts.append({'source': source['target'], **target, 'type': 'impact', 'sourceAnchor': '',
                                'evidence': GOV_PATH, 'evidenceAnchor': 'change-impact', 'reason': plain(cells[2])})

decisions = []
tasks = []
raw_decision = DOCUMENTS[DECISION_PATH]['raw']
for match in re.finditer(r'^### (D\d{2})\s+([^\n]+)\n([\s\S]*?)(?=\n(?:<a id="d\d+"|## )|\Z)', raw_decision, re.M):
    ident, title, content = match.groups()
    content = content.strip()
    status = re.match(r'^状态：([^。\n]+。?)', content)
    card_content = content[status.end():].strip() if status else content
    decisions.append({'id': ident, 'anchor': ident.lower(), 'title': title.strip(), 'status': plain(status.group(1)) if status else '待进一步明确',
                      'text': plain(content), 'html': render(card_content, DECISION_PATH), 'links': local_matches(content, DECISION_PATH)})
for line in block_after(raw_decision, '当前任务清单').splitlines():
    if not line.startswith('|'): continue
    cells = table_cells(line)
    if len(cells) == 4 and re.match(r'T\d+', cells[0]):
        ident, title = cells[0].split(' ', 1)
        deps = re.findall(r'[DT]\d{2}', cells[1])
        span = re.search(r'T(\d{2}) 至 T(\d{2})', cells[1])
        if span: deps = list(dict.fromkeys(deps + [f'T{i:02}' for i in range(int(span.group(1)), int(span.group(2)) + 1)]))
        tasks.append({'id': ident, 'title': title, 'dependencyText': plain(cells[1]), 'dependencies': sorted(deps), 'delivery': plain(cells[2]), 'destination': plain(cells[3]), 'status': '待开展 · 未分派'})

if len(decisions) != len(re.findall(r'^### D\d+', raw_decision, re.M)):
    ERRORS.append('待决事项未完整提取')
if not impacts: ERRORS.append('未能读取修改影响路线')

DATA = {'builtAt': datetime.now().astimezone().isoformat(timespec='seconds'), 'groups': GROUPS, 'documents': list(DOCUMENTS.values()),
        'links': LINKS, 'impacts': impacts, 'decisions': decisions, 'tasks': tasks, 'decisionPath': DECISION_PATH, 'governancePath': GOV_PATH,
        'ownership': ownership, 'version': re.search(r'v\d+\.\d+', DOCUMENTS['README.md']['raw']).group(), 'warnings': []}

if ERRORS:
    print('发现需要处理的来源问题，未覆盖现有 HTML：')
    print('\n'.join(dict.fromkeys(ERRORS)))
    raise SystemExit(1)

template = (TOOL / '页面模板.html').read_text(encoding='utf-8')
css = (TOOL / '样式.css').read_text(encoding='utf-8')
js = (TOOL / '交互.js').read_text(encoding='utf-8')
payload = json.dumps(DATA, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
result = template.replace('/*__STYLE__*/', css).replace('/*__DATA__*/', payload).replace('/*__APP__*/', js)
if any(marker in result for marker in ('/*__STYLE__*/', '/*__DATA__*/', '/*__APP__*/')):
    raise SystemExit('页面模板占位未完成，未覆盖原文件。')
temp = OUTPUT.with_suffix('.html.tmp')
temp.write_text(result, encoding='utf-8')
temp.replace(OUTPUT)
print(f'已生成：{OUTPUT.name}')
print(f'文档 {sum(d["format"] == "md" for d in DOCUMENTS.values())} 份，附件 {sum(d["format"] != "md" for d in DOCUMENTS.values())} 份。')
print(f'正文引用 {len(LINKS)} 处，修改影响 {len(impacts)} 条，决策 {len(decisions)} 项，任务 {len(tasks)} 项。')
print('本地链接与章节定位检查通过。正文和关系均来自项目源文件。')
