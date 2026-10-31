import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as workspaceHelpers from '../src/lib/dokonKodi.ts';

const require = createRequire(import.meta.url);
const uz = JSON.parse(readFileSync(new URL('../src/i18n/locales/uz/auth.json', import.meta.url), 'utf8'));
const t = key => key.split('.').reduce((value, part) => value?.[part], uz) ?? key;
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const text = value => Array.isArray(value) ? value.map(text).join('') : value && typeof value === 'object' ? text(value.props?.children) : String(value ?? '');
const plain = value => JSON.parse(JSON.stringify(value));
const backendError = (code, message, status = 400) => ({ response: { status, data: { code, message } } });

function compile(path, dependencies) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, require(name) {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return require(name);
    return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get(target, key) { return target[key] ?? String(key); } });
  } };
  runInNewContext(compiled, context);
  return context.exports;
}

function screen(pageName, { state = null, token = '', forgot = async () => ({ sent: true }), reset = async () => ({ success: true }), authenticated = false, login = async () => {} } = {}) {
  const slots = [], navigation = [], calls = [];
  let cursor = 0, cleared = 0, focused = 0;
  const react = {
    useMemo: fn => fn(),
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef() { return react.useState(() => ({ current: { focus() { focused++; } } }))[0]; },
  };
  const component = compile(`../src/Pages/Auth/${pageName}.tsx`, {
    react,
    'react-i18next': { useTranslation: () => ({ t }) },
    'react-router-dom': { Link: 'Link', Navigate: 'Navigate', useLocation: () => ({ state }), useNavigate: () => (...args) => navigation.push(args), useSearchParams: () => [new URLSearchParams(token ? { token } : {})] },
    '@/lib/dokonKodi': { ...workspaceHelpers, saqlanganDokonKodi: () => 'saved-shop', dokonKodiniSaqlash: () => {} },
    '@/api/sozlamalarApi': { getApiErrorMessage: error => error.response?.data?.message ?? error.message },
    '@/api/passwordRecoveryApi': {
      forgotPassword: async (...args) => { calls.push(args); return forgot(...args); },
      resetPassword: async (...args) => { calls.push(args); return reset(...args); },
      resetTokenInvalid: error => error.response?.data?.code === 'errors.auth.reset_token_invalid',
    },
    '@/lib/authTokenStorage': { authTokenlarniTozalash: () => { cleared++; } },
    '@/store/authStore': { isAuthSessionValid: () => authenticated, useAuthStore: selector => selector({ accessToken: null, expiresAt: null, login }) },
  }).default;
  const render = () => { cursor = 0; return component(); };
  return {
    render, calls, navigation, get cleared() { return cleared; }, get focused() { return focused; },
    set(id, value) { const field = nodes(render()).find(node => node.props.id === id); assert.ok(field, id); field.props.onChange({ target: { value } }); },
    async submit() { await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); return render(); },
  };
}

test('login passes entered shop and username to recovery and preserves the original destination', () => {
  const view = screen('Login', { state: { from: { pathname: '/savdo' } } });
  view.set('workspace', 'my-shop');
  view.set('username', 'jamol');
  const link = nodes(view.render()).find(node => node.props.to === '/forgot-password');
  assert.deepEqual(plain(link.props.state), { workspace: 'my-shop', username: 'jamol', from: { pathname: '/savdo' } });
});

test('recovery carries the login fields and shows the same privacy-preserving success message', async () => {
  const view = screen('ForgotPassword', { state: { workspace: 'my-shop', username: 'jamol' } });
  assert.equal(nodes(view.render()).find(node => node.props.id === 'workspace').props.value, 'my-shop');
  const tree = await view.submit();
  assert.deepEqual(plain(view.calls), [['jamol', 'my-shop']]);
  assert.ok(text(tree).includes(uz.forgot.sent));
  assert.equal(nodes(tree).some(node => node.type === 'form'), false);
});

test('workspace_required focuses the shop field and blocks resubmission until it is filled', async () => {
  const view = screen('ForgotPassword', { state: { workspace: '', username: 'jamol' }, forgot: async () => { throw backendError('errors.user.workspace_required', 'Shop code required'); } });
  let tree = await view.submit();
  assert.ok(text(tree).includes('Shop code required'));
  assert.equal(view.focused, 1);
  assert.equal(nodes(tree).find(node => node.props.id === 'workspace').props.tag, uz.workspaceRequiredTag);
  tree = await view.submit();
  assert.equal(view.calls.length, 1);
  assert.equal(nodes(tree).find(node => node.props.id === 'workspace').props.error, uz.errors.workspaceRequired);
  view.set('workspace', 'my-shop');
  await view.submit();
  assert.equal(view.calls.length, 2);
});

test('mail not configured and network errors retain a retryable form and backend message', async () => {
  for (const error of [backendError('errors.mail.not_configured', 'Mail is not configured', 503), new Error('Network unavailable')]) {
    const view = screen('ForgotPassword', { state: { username: 'jamol' }, forgot: async () => { throw error; } });
    const tree = await view.submit();
    assert.ok(text(tree).includes(error.response?.data.message ?? error.message));
    assert.ok(nodes(tree).find(node => node.type === 'form'));
    assert.equal(nodes(tree).find(node => node.type === 'SubmitButton').props.busy, false);
  }
});

test('reset is public even for an authenticated browser and missing token offers recovery', () => {
  const missing = screen('ResetPassword', { authenticated: true });
  assert.equal(missing.render().props.title, uz.reset.invalidLink);
  assert.ok(nodes(missing.render()).find(node => node.props.to === '/forgot-password'));
  assert.equal(nodes(missing.render()).some(node => node.type === 'form'), false);
  const valid = screen('ResetPassword', { token: 'test-token', authenticated: true });
  assert.ok(nodes(valid.render()).find(node => node.type === 'form'));
});

test('short or mismatched passwords never reach the backend', async () => {
  const view = screen('ResetPassword', { token: 'test-token' });
  view.set('new-password', '12345');
  view.set('confirm-password', '12345');
  let tree = await view.submit();
  assert.equal(view.calls.length, 0);
  assert.equal(nodes(tree).find(node => node.props.id === 'new-password').props.error, uz.reset.minLength);
  view.set('new-password', '123456');
  tree = await view.submit();
  assert.equal(view.calls.length, 0);
  assert.equal(nodes(tree).find(node => node.props.id === 'confirm-password').props.error, uz.reset.mismatch);
});

test('successful reset preserves password bytes, clears browser auth and redirects with success notice', async () => {
  const view = screen('ResetPassword', { token: 'token/+=' });
  view.set('new-password', ' secret ');
  view.set('confirm-password', ' secret ');
  await view.submit();
  assert.deepEqual(plain(view.calls), [['token/+=', ' secret ']]);
  assert.equal(view.cleared, 1);
  assert.deepEqual(plain(view.navigation), [['/login', { replace: true, state: { passwordReset: true } }]]);
  assert.ok(text(screen('Login', { state: { passwordReset: true } }).render()).includes(uz.reset.success));
});

test('invalid or expired reset token keeps backend text and offers a fresh request', async () => {
  const view = screen('ResetPassword', { token: 'old-token', reset: async () => { throw backendError('errors.auth.reset_token_invalid', 'Link has expired'); } });
  view.set('new-password', '123456');
  view.set('confirm-password', '123456');
  const tree = await view.submit();
  assert.ok(text(tree).includes('Link has expired'));
  assert.ok(nodes(tree).find(node => node.props.to === '/forgot-password'));
  assert.equal(nodes(tree).some(node => node.type === 'PasswordField'), false);
  assert.equal(view.cleared, 0);
  assert.equal(view.navigation.length, 0);
});

test('server validation errors allow correction and retry without clearing the current session', async () => {
  const view = screen('ResetPassword', { token: 'token', reset: async () => { throw backendError('errors.validation', 'Password validation failed'); } });
  view.set('new-password', '123456');
  view.set('confirm-password', '123456');
  const tree = await view.submit();
  assert.ok(text(tree).includes('Password validation failed'));
  assert.ok(nodes(tree).find(node => node.type === 'PasswordField'));
  assert.equal(view.cleared, 0);
});

test('public API requests use configured v1 base URL, language and no session authorization', async () => {
  const requests = [];
  const api = compile('../src/api/passwordRecoveryApi.ts', {
    axios: { __esModule: true, default: { post: async (...args) => { requests.push(args); return { data: args[0].endsWith('forgot-password') ? { sent: true } : { success: true } }; }, isAxiosError: error => Boolean(error?.response) } },
    './apiConfig': { API_BASE_URL: '/backend-api/api/v1' },
    './apiLanguage': { apiTilHeaderi: () => ({ 'x-lang': 'uz' }) },
  });
  await api.forgotPassword(' jamol ', ' my-shop ');
  await api.forgotPassword('jamol', '   ');
  await api.resetPassword('token/+=', ' secret ');
  assert.deepEqual(plain(requests.map(([url, body]) => [url, body])), [
    ['/backend-api/api/v1/auth/forgot-password', { username: 'jamol', workspace: 'my-shop' }],
    ['/backend-api/api/v1/auth/forgot-password', { username: 'jamol' }],
    ['/backend-api/api/v1/auth/reset-password', { token: 'token/+=', newPassword: ' secret ' }],
  ]);
  for (const [, , config] of requests) {
    assert.equal(config.headers['x-lang'], 'uz');
    assert.equal(config.headers.Authorization, undefined);
    assert.equal(config.timeout, 30_000);
  }
  assert.equal(api.resetTokenInvalid(backendError('errors.auth.reset_token_invalid', 'expired')), true);
  assert.equal(api.resetTokenInvalid(backendError('errors.validation', 'validation')), false);
});

test('auth translations are complete in Uzbek and Russian without encoding replacement characters', () => {
  const ru = JSON.parse(readFileSync(new URL('../src/i18n/locales/ru/auth.json', import.meta.url), 'utf8'));
  for (const namespace of ['forgot', 'reset', 'luxury']) {
    assert.deepEqual(Object.keys(ru[namespace]).sort(), Object.keys(uz[namespace]).sort());
    for (const value of Object.values(ru[namespace])) assert.doesNotMatch(value, /\?{2,}|\uFFFD/);
    for (const value of Object.values(uz[namespace])) assert.doesNotMatch(value, /\?|\uFFFD/);
  }
});
