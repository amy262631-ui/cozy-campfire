// 檢查：翻譯函式 t() 有沒有被同名的區域變數蓋掉（例如 const t = 時間）
// 用法：npm run check
// 用語法分析找出：在 t 被「區域變數／參數」蓋掉的範圍裡，又呼叫了 t(...)
import { parse } from 'acorn';
import fs from 'node:fs';
import path from 'node:path';

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js') && !p.includes('i18n')) files.push(p);
  }
})(new URL('../src', import.meta.url).pathname);

const declaresT = (node) => {
  const names = [];
  const collect = (pat) => {
    if (!pat) return;
    if (pat.type === 'Identifier') names.push(pat.name);
    else if (pat.type === 'AssignmentPattern') collect(pat.left);
    else if (pat.type === 'ObjectPattern') pat.properties.forEach((pr) => collect(pr.value ?? pr.argument));
    else if (pat.type === 'ArrayPattern') pat.elements.forEach(collect);
    else if (pat.type === 'RestElement') collect(pat.argument);
  };
  if (node.params) node.params.forEach(collect);
  return names.includes('t');
};

let found = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  } catch (e) {
    console.log('無法分析', file, e.message);
    continue;
  }
  // 走訪：維護一個「t 是否被蓋掉」的堆疊
  const visit = (node, shadowed) => {
    if (!node || typeof node.type !== 'string') return;
    let sh = shadowed;
    const isFn = /Function/.test(node.type);
    if (isFn && declaresT(node)) sh = true;
    if (node.type === 'BlockStatement' || node.type === 'Program' || isFn) {
      const body = node.type === 'BlockStatement' || node.type === 'Program' ? node.body : node.body?.body ?? [];
      for (const st of body || []) {
        if (st.type === 'VariableDeclaration' && st.declarations.some((d) => d.id.type === 'Identifier' && d.id.name === 't')) sh = true;
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 't' && sh) {
      found++;
      console.log(`${path.relative(process.cwd(), file)}:${node.loc.start.line}  t(...) 被區域變數 t 蓋掉`);
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => visit(c, sh));
      else if (v && typeof v === 'object' && v.type) visit(v, sh);
    }
  };
  visit(ast, false);
}
console.log(found ? `共 ${found} 處` : '沒有發現衝突');
if (found) process.exit(1);
