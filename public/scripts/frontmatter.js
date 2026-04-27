/**
 * 极简 frontmatter 解析/序列化（YAML 子集，不依赖外部库）
 * 支持: string, string[], 多行 string (带 |)
 *
 * 用法:
 *   const { frontmatter, body } = parseFrontmatter(rawMarkdown);
 *   const raw = serializeFrontmatter(frontmatter, body);
 */

(function (global) {
  function parseFrontmatter(raw) {
    if (typeof raw !== 'string') return { frontmatter: {}, body: '' };
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { frontmatter: {}, body: raw };
    const yaml = m[1];
    const body = m[2] || '';
    const fm = parseYAML(yaml);
    return { frontmatter: fm, body };
  }

  function parseYAML(yaml) {
    const out = {};
    const lines = yaml.split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
      const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
      if (!m) { i++; continue; }
      const key = m[1];
      let val = m[2];

      if (val === '|' || val === '|+' || val === '|-') {
        // 多行字符串
        i++;
        const buf = [];
        while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
          buf.push(lines[i].replace(/^  /, ''));
          i++;
        }
        out[key] = buf.join('\n').replace(/\n+$/, '');
        continue;
      }

      if (val === '') {
        // 检查下一行是否是数组项
        const peek = lines[i + 1];
        if (peek && peek.trim().startsWith('- ')) {
          const arr = [];
          i++;
          while (i < lines.length && lines[i].trim().startsWith('- ')) {
            arr.push(lines[i].trim().slice(2).replace(/^["']|["']$/g, ''));
            i++;
          }
          out[key] = arr;
          continue;
        }
        out[key] = '';
      } else if (val.startsWith('[') && val.endsWith(']')) {
        // 行内数组
        const inner = val.slice(1, -1).trim();
        if (!inner) out[key] = [];
        else out[key] = inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        // 标量
        out[key] = val.replace(/^["']|["']$/g, '');
      }
      i++;
    }
    return out;
  }

  function serializeYAML(obj) {
    const lines = [];
    const order = [
      'title', 'date', 'status', 'assignee', 'platform',
      'shoot_date', 'publish_date', 'publish_url',
      'tags', 'cover_idea', 'notes',
    ];
    const seen = new Set();
    const keys = [...order.filter((k) => k in obj), ...Object.keys(obj).filter((k) => !order.includes(k))];

    for (const k of keys) {
      if (seen.has(k)) continue;
      seen.add(k);
      const v = obj[k];
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        lines.push(`${k}:`);
        for (const item of v) {
          lines.push(`  - ${quoteIfNeeded(String(item))}`);
        }
      } else if (typeof v === 'string' && v.includes('\n')) {
        lines.push(`${k}: |`);
        for (const ln of v.split('\n')) lines.push(`  ${ln}`);
      } else {
        lines.push(`${k}: ${quoteIfNeeded(String(v))}`);
      }
    }
    return lines.join('\n');
  }

  function quoteIfNeeded(s) {
    if (s === '') return '""';
    if (/^[0-9]+$/.test(s)) return `"${s}"`;
    if (/[:#\-\[\]\{\},&\*\!\|>"'%@`]/.test(s) || /^\s|\s$/.test(s)) {
      return `"${s.replace(/"/g, '\\"')}"`;
    }
    return s;
  }

  function serializeFrontmatter(fm, body) {
    const cleaned = {};
    for (const k of Object.keys(fm || {})) {
      const v = fm[k];
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      cleaned[k] = v;
    }
    if (Object.keys(cleaned).length === 0) {
      return body || '';
    }
    return `---\n${serializeYAML(cleaned)}\n---\n\n${(body || '').replace(/^\n+/, '')}`;
  }

  global.SakuapiFM = { parseFrontmatter, serializeFrontmatter };
})(typeof window !== 'undefined' ? window : globalThis);
