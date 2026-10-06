import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('./AttemptRoleGuard.jsx', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;

for (const [query, roles] of [
  ['', ['STUDENT']],
  ['practice=false', ['STUDENT']],
  ['practice=true', ['STUDENT', 'TEACHER', 'ADMIN']],
]) {
  test(`attempt role policy for ${query || 'exam'}`, () => {
    const module = { exports: {} };
    const mocks = {
      'react-router-dom': { useSearchParams: () => [new URLSearchParams(query)] },
      '../../auth/components/RoleGuard.jsx': { default: 'RoleGuard' },
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    };
    runInNewContext(compiled, { module, require: name => mocks[name] });
    const result = module.exports.default({ children: 'test page' });
    assert.deepEqual(Array.from(result.props.allowedRoles), roles);
    assert.equal(result.props.children, 'test page');
  });
}

test('Listening introduction uses the shared attempt API', () => {
  const introduction = readFileSync(new URL('../../../pages/IntroductionPage.jsx', import.meta.url), 'utf8');
  const listeningBranch = introduction.split("skill === 'listening'")[1].split("skill === 'reading'")[0];
  assert.match(listeningBranch, /testAttemptsApi\.start/);
  assert.doesNotMatch(introduction, /listeningTestsApi/);
});
