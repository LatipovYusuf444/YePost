import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the real component's input and controlled-value round trip without a DOM.
const source = readFileSync(new URL('../src/Components/ui/PhoneInput.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});
const exports = {};
runInNewContext(outputText, { exports, require: createRequire(import.meta.url) });
const PhoneInput = exports.default;

function phoneField(initial = '') {
  let value = initial;
  const input = () => PhoneInput({ value, onChange: next => { value = next; } }).props.children
    .find(child => child.type === 'input').props;
  return {
    input,
    change: text => input().onChange({ target: { value: text } }),
    value: () => value,
  };
}

test('99 888 99 00 can be typed digit by digit after the fixed +998 prefix', () => {
  const field = phoneField();
  for (const [digit, display, stored] of [
    ['9', '9', '+9989'],
    ['9', '99', '+99899'],
    ['8', '99 8', '+998998'],
    ['8', '99 88', '+9989988'],
    ['8', '99 888', '+99899888'],
    ['9', '99 888 9', '+998998889'],
    ['9', '99 888 99', '+9989988899'],
    ['0', '99 888 99 0', '+99899888990'],
    ['0', '99 888 99 00', '+998998889900'],
  ]) {
    field.change(field.input().value + digit);
    assert.equal(field.value(), stored);
    assert.equal(field.input().value, display);
  }
});

test('pasting national and international numbers keeps all nine national digits', () => {
  for (const text of ['998889900', '99 888 99 00', '+998 99 888 99 00', '998998889900']) {
    const field = phoneField();
    field.change(text);
    assert.equal(field.value(), '+998998889900', text);
    assert.equal(field.input().value, '99 888 99 00', text);
  }
});

test('existing national and international values render without losing the 998 national prefix', () => {
  for (const value of ['998889900', '+998998889900', '998998889900']) {
    assert.equal(phoneField(value).input().value, '99 888 99 00', value);
  }
});

test('editing and clearing a 99 8 number preserves the remaining digits', () => {
  const field = phoneField('+998998889900');
  for (const [text, stored, display] of [
    ['99 888 99 0', '+99899888990', '99 888 99 0'],
    ['99 8', '+998998', '99 8'],
    ['99 ', '+99899', '99'],
    ['', '', ''],
  ]) {
    field.change(text);
    assert.equal(field.value(), stored);
    assert.equal(field.input().value, display);
  }
});

test('other prefixes, non-digit cleanup, and the nine-digit limit still work', () => {
  const field = phoneField();
  field.change('+998 (90) 123-45-67');
  assert.equal(field.value(), '+998901234567');
  assert.equal(field.input().value, '90 123 45 67');
  field.change('99 888 99 001');
  assert.equal(field.value(), '+998998889900');
  assert.equal(field.input().value, '99 888 99 00');
});
