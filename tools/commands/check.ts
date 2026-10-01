import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { listGames } from '../../engine/node/loadGame.ts';
import { checkArchRules } from '../lib/checkArchRules.ts';
import { defineTool } from '../lib/defineTool.ts';
import { outPath } from '../lib/outPath.ts';
import { runProcess } from '../lib/runProcess.ts';
import { validateGame } from '../lib/validateGame.ts';
import { writeSchemas } from './schemas.ts';

const STEPS = ['types', 'lint', 'rules', 'content', 'schemas', 'tests'] as const;
type Step = { ok: boolean; line: string; detail: string };

const first = (text: string, n: number) =>
  text
    .split('\n')
    .filter(Boolean)
    .slice(0, n)
    .map((l) => `    ${l}`)
    .join('\n');

async function step(name: (typeof STEPS)[number], fix: boolean): Promise<Step> {
  const t0 = performance.now();
  const secs = () => `${((performance.now() - t0) / 1000).toFixed(1)}s`;
  if (name === 'types') {
    const r = await runProcess('tsc', ['-p', '.']);
    const n = (r.out.match(/error TS/g) ?? []).length;
    return {
      ok: r.code === 0,
      line: r.code === 0 ? `types (${secs()})` : `types: ${n} errors`,
      detail: r.out,
    };
  }
  if (name === 'lint') {
    const r = await runProcess('biome', fix ? ['check', '--write', '.'] : ['check', '.']);
    const errs = /Found (\d+) error/.exec(r.out)?.[1] ?? '0';
    return {
      ok: r.code === 0,
      line: r.code === 0 ? `lint (${secs()})` : `lint: ${errs} errors (npm run check -- --fix formats)`,
      detail: r.out,
    };
  }
  if (name === 'rules') {
    const issues = checkArchRules();
    const errors = issues.filter((i) => i.severity === 'error');
    const text = issues.map((i) => `${i.severity} [${i.rule}] ${i.file}:${i.line} ${i.message}`).join('\n');
    return {
      ok: !errors.length,
      line: `rules: ${errors.length} errors, ${issues.length - errors.length} warnings`,
      detail: text,
    };
  }
  if (name === 'content') {
    const reports = [];
    for (const g of listGames()) reports.push(await validateGame(g));
    const errs = reports.flatMap((r) => r.errors);
    const files = reports.reduce((s, r) => s + r.files, 0);
    return {
      ok: !errs.length,
      line: `content: ${files} files, ${reports.reduce((s, r) => s + r.rooms, 0)} rooms, ${errs.length} errors`,
      detail: errs.map((e) => e.message).join('\n\n'),
    };
  }
  if (name === 'schemas') {
    const r = await writeSchemas();
    return {
      ok: true,
      line: `schemas: ${r.total} generated files${r.changed.length ? `, ${r.changed.length} updated (commit them)` : ''}`,
      detail: r.changed.join('\n'),
    };
  }
  const report = outPath('check/tests.json');
  const r = await runProcess('vitest', ['run', '--reporter=json', `--outputFile=${report}`]);
  try {
    const j = JSON.parse(readFileSync(report, 'utf8')) as {
      numTotalTests: number;
      numFailedTests: number;
      testResults: {
        name: string;
        assertionResults: { fullName: string; status: string; failureMessages: string[] }[];
        message?: string;
      }[];
    };
    const fails = j.testResults.flatMap((f) =>
      f.assertionResults
        .filter((a) => a.status === 'failed')
        .map((a) => `✖ ${a.fullName}\n${a.failureMessages.join('\n').split('\n').slice(0, 6).join('\n')}`),
    );
    const suiteErrors = j.testResults.filter((f) => f.message).map((f) => `✖ ${f.name}\n${f.message}`);
    const ok = r.code === 0 && j.numFailedTests === 0 && !suiteErrors.length;
    return {
      ok,
      line: `tests: ${j.numTotalTests - j.numFailedTests}/${j.numTotalTests} passed (${secs()})`,
      detail: [...fails, ...suiteErrors].join('\n\n') || r.out,
    };
  } catch {
    return { ok: false, line: 'tests: could not run vitest', detail: r.out };
  }
}

export const checkTool = defineTool({
  name: 'check',
  summary:
    'The one check: types, lint, architecture rules, content, schemas, and all tests (rooms run headless).',
  usage: 'npm run check [-- --only types,content] [--fix]\n  Details of each step: out/check/<step>.txt',
  args: z.object({
    only: z
      .array(z.enum(STEPS))
      .default([...STEPS])
      .meta({ description: `Subset of: ${STEPS.join(', ')}` }),
    fix: z.boolean().default(false).meta({ description: 'Let the linter/formatter fix files' }),
  }),
  async run(a, io) {
    mkdirSync(outPath('check'), { recursive: true });
    const lines: string[] = [];
    const files: string[] = [];
    let ok = true;
    for (const name of STEPS.filter((s) => a.only.includes(s))) {
      io.progress(name);
      const s = await step(name, a.fix);
      writeFileSync(outPath(`check/${name}.txt`), s.detail);
      ok &&= s.ok;
      lines.push(`${s.ok ? '✓' : '✖'} ${s.line}`);
      if (!s.ok) {
        lines.push(first(s.detail, 14));
        files.push(`out/check/${name}.txt`);
      }
    }
    lines.push(ok ? 'check passed' : 'check FAILED');
    return { ok, summary: lines.join('\n'), files };
  },
});
