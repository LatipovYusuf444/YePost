import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('../src', import.meta.url));
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const files = walk(root).filter(file => file.endsWith('.tsx'));
const parsed = files.map(file => ({ file: relative(root, file).replaceAll('\\', '/'), source: ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) }));
const visit = (node, callback) => { callback(node); ts.forEachChild(node, child => visit(child, callback)); };

test('every runtime native table is wrapped except the fixed printable invoice', () => {
  const missing = []; let tables = 0;
  for (const { file, source } of parsed) visit(source, node => {
    if (!(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) || node.tagName.getText(source) !== 'table') return;
    tables++;
    const table = ts.isJsxOpeningElement(node) ? node.parent : node;
    const wrapper = table.parent;
    const wrapped = ts.isJsxElement(wrapper) && wrapper.openingElement.tagName.getText(source) === 'SmartTable';
    if (!wrapped) missing.push(file);
  });
  assert.equal(tables, 53);
  assert.deepEqual(missing, ['Pages/Savdo/SotuvTafsilotlariModal.tsx']);
});

test('all 92 adapted table usages have unique explicit IDs and shared instances have no implicit keys', () => {
  const ids = [], missing = [];
  const controlled = new Set(['SmartTable', 'KengaytiriladiganJadval', 'Jadval', 'Table', 'MatritsaJadval', 'SotuvlarJadvali']);
  for (const { file, source } of parsed) visit(source, node => {
    if (!(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) || !controlled.has(node.tagName.getText(source))) return;
    const attr = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === 'tableId');
    if (!attr) missing.push(file);
    else if (attr.initializer && ts.isStringLiteral(attr.initializer)) ids.push(attr.initializer.text);
  });
  assert.deepEqual(missing, []);
  assert.equal(ids.length, 92);
  assert.equal(new Set(ids).size, ids.length);
});

test('production column identities are explicit metadata independent of translations and record IDs', () => {
  let columns = 0;
  for (const { file, source } of parsed.filter(entry => entry.file.startsWith('Pages/IshlabChiqarish/'))) visit(source, node => {
    if (!ts.isObjectLiteralExpression(node)) return;
    const properties = node.properties.filter(ts.isPropertyAssignment);
    if (!properties.some(p => p.name.getText(source) === 'nom') || !properties.some(p => p.name.getText(source) === 'katak')) return;
    const id = properties.find(p => p.name.getText(source) === 'id');
    assert.ok(id && ts.isStringLiteral(id.initializer), file);
    columns++;
  });
  assert.equal(columns, 105);
});
