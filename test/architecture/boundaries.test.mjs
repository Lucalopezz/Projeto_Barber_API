import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(
  root,
  'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
);
const config = join(root, '.dependency-cruiser.cjs');

function inspect(files, outputType = 'json') {
  const cwd = mkdtempSync(join(tmpdir(), 'barber-architecture-'));
  try {
    symlinkSync(join(root, 'node_modules'), join(cwd, 'node_modules'), 'dir');
    writeFileSync(
      join(cwd, 'package.json'),
      JSON.stringify({
        name: 'boundary-fixture',
        dependencies: {
          '@nestjs/common': '*',
          '@prisma/client': '*',
          fastify: '*',
          'class-validator': '*',
        },
      }),
    );
    writeFileSync(
      join(cwd, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@/*': ['src/*'] },
          module: 'commonjs',
          target: 'ES2021',
        },
      }),
    );
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(dirname(join(cwd, name)), { recursive: true });
      writeFileSync(join(cwd, name), content);
    }
    const result = spawnSync(
      process.execPath,
      [cli, '--config', config, '--output-type', outputType, 'src'],
      { cwd, encoding: 'utf8', timeout: 20_000 },
    );
    assert.ifError(result.error);
    assert.ok([0, 1].includes(result.status), result.stderr || result.stdout);
    if (outputType !== 'json') return result;
    const graph = JSON.parse(result.stdout);
    return { graph, violations: graph.summary.violations, result };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function denied(files, rule) {
  const { violations, graph } = inspect(files);
  assert.ok(
    violations.some((v) => v.rule.name === rule),
    `Expected ${rule}; received ${JSON.stringify(violations)}; resolved ${graph.modules.map((module) => module.source).join(', ')}`,
  );
}
function allowed(files) {
  const { violations } = inspect(files);
  assert.deepEqual(violations, []);
}

const entity = 'export interface Entity { id: string }';
const repository = 'export const repository = 1;';

for (const [label, specifier] of [
  ['alias', '@/users/infrastructure/repository'],
  ['relative', '../infrastructure/repository'],
]) {
  test(`domain cannot reach infrastructure using ${label}`, () =>
    denied(
      {
        'src/users/domain/entity.ts': `import { repository } from '${specifier}'; export const entity = repository;`,
        'src/users/infrastructure/repository.ts': repository,
      },
      'domain-only-depends-on-domain',
    ));
}

test('domain cannot import application', () =>
  denied(
    {
      'src/users/domain/entity.ts':
        "export { useCase } from '../application/use-case';",
      'src/users/application/use-case.ts': 'export const useCase = 1;',
    },
    'domain-only-depends-on-domain',
  ));

test('domain cannot bypass boundaries through an auth facade', () =>
  denied(
    {
      'src/users/domain/entity.ts':
        "export { authenticate } from '@/auth/auth';",
      'src/auth/auth.ts': 'export const authenticate = 1;',
    },
    'domain-only-depends-on-domain',
  ));

for (const [label, statement] of [
  [
    'alias',
    "import { repository } from '@/users/infrastructure/repository'; export const run = repository;",
  ],
  ['relative', "export { repository } from '../infrastructure/repository';"],
  [
    'type-only',
    "import type { Repository } from '@/users/infrastructure/repository'; export type Port = Repository;",
  ],
  [
    'dynamic',
    "export const run = () => import('../infrastructure/repository');",
  ],
]) {
  test(`application cannot reach infrastructure using ${label}`, () =>
    denied(
      {
        'src/users/application/use-case.ts': statement,
        'src/users/infrastructure/repository.ts': `${repository} export interface Repository { id: string }`,
      },
      'application-cannot-depend-on-adapters',
    ));
}

test('barrel export does not hide an application to infrastructure edge', () =>
  denied(
    {
      'src/users/application/use-case.ts':
        "export { repository } from './index';",
      'src/users/application/index.ts':
        "export { repository } from '../infrastructure/repository';",
      'src/users/infrastructure/repository.ts': repository,
    },
    'application-cannot-depend-on-adapters',
  ));

for (const layer of ['domain', 'application']) {
  for (const dependency of [
    '@nestjs/common',
    '@prisma/client',
    'fastify',
    'express',
  ]) {
    test(`${layer} cannot import adapter package ${dependency}`, () =>
      denied(
        {
          [`src/users/${layer}/component.ts`]: `import '${dependency}'; export const component = 1;`,
        },
        'core-cannot-depend-on-framework-or-database',
      ));
  }
}

test('type-only Prisma import in application is forbidden', () =>
  denied(
    {
      'src/users/application/output.ts':
        "import type { PrismaClient } from '@prisma/client'; export type Output = PrismaClient;",
    },
    'core-cannot-depend-on-framework-or-database',
  ));

test('domain cannot import shared infrastructure', () =>
  denied(
    {
      'src/users/domain/entity.ts':
        "export { repository } from '@/shared/infrastructure/repository';",
      'src/shared/infrastructure/repository.ts': repository,
    },
    'domain-only-depends-on-domain',
  ));

test('application cannot import shared infrastructure', () =>
  denied(
    {
      'src/users/application/use-case.ts':
        "export { repository } from '@/shared/infrastructure/repository';",
      'src/shared/infrastructure/repository.ts': repository,
    },
    'application-cannot-depend-on-adapters',
  ));

for (const helper of [
  'src/users/domain/__tests__/helper.ts',
  'src/users/domain/entity.spec.ts',
  'src/shared/infrastructure/database/testing/helper.ts',
]) {
  test(`production code cannot import test helper ${helper}`, () =>
    denied(
      {
        'src/users/infrastructure/controller.ts': `import '${'@/' + helper.slice(4).replace(/\.ts$/, '')}';`,
        [helper]: 'export const fixture = 1;',
      },
      'production-cannot-import-tests',
    ));
}

test('production circular dependencies are rejected', () =>
  denied(
    {
      'src/users/domain/a.ts': "export { b } from './b'; export const a = 1;",
      'src/users/domain/b.ts': "export { a } from './a'; export const b = 1;",
    },
    'no-circular-dependencies',
  ));

test('unresolved alias is an error instead of silently skipping the edge', () =>
  denied(
    {
      'src/users/application/use-case.ts':
        "export { missing } from '@/missing';",
    },
    'no-unresolved-imports',
  ));

test('application may import domain repository contracts and shared application ports', () =>
  allowed({
    'src/users/application/use-case.ts':
      "import type { Entity } from '../domain/entity'; import type { Port } from '@/shared/application/port'; export type Input = Entity & Port;",
    'src/users/domain/entity.ts': entity,
    'src/shared/application/port.ts':
      'export interface Port { execute(): void }',
  }));

test('domain may use shared domain and existing validation library', () =>
  allowed({
    'src/users/domain/entity.ts':
      "import 'class-validator'; export type { Entity } from '@/shared/domain/entity';",
    'src/shared/domain/entity.ts': entity,
  }));

test('infrastructure may wire application, domain and Prisma', () =>
  allowed({
    'src/users/infrastructure/controller.ts':
      "import '@prisma/client'; export { run } from '../application/use-case';",
    'src/users/application/use-case.ts':
      "import type { Entity } from '../domain/entity'; export const run = (input: Entity) => input;",
    'src/users/domain/entity.ts': entity,
  }));

test('integration tests under domain may use infrastructure and Nest', () =>
  allowed({
    'src/users/domain/__tests__/integration/entity.int-spec.ts':
      "import '@nestjs/common'; export { repository } from '@/users/infrastructure/repository';",
    'src/users/infrastructure/repository.ts': repository,
  }));

test('CLI fails the CI gate for a forbidden import', () => {
  const result = inspect(
    {
      'src/users/application/use-case.ts':
        "export { repository } from '../infrastructure/repository';",
      'src/users/infrastructure/repository.ts': repository,
    },
    'err-long',
  );
  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(
    result.stdout + result.stderr,
    /application-cannot-depend-on-adapters/,
  );
});

test('type-only circular dependencies are rejected before compilation', () =>
  denied(
    {
      'src/users/domain/a.ts':
        "import type { B } from './b'; export interface A { b: B }",
      'src/users/domain/b.ts':
        "import type { A } from './a'; export interface B { a: A }",
    },
    'no-circular-dependencies',
  ));

test('entity and validator can share a props contract without a cycle', () =>
  allowed({
    'src/users/domain/entities/entity.ts':
      "import type { Props } from './entity.props'; import { validate } from '../validators/validator'; export const create = (p: Props) => validate(p); export type { Props } from './entity.props';",
    'src/users/domain/entities/entity.props.ts':
      'export interface Props { id: string }',
    'src/users/domain/validators/validator.ts':
      "import type { Props } from '../entities/entity.props'; export const validate = (p: Props) => p.id.length > 0;",
  }));

test('Express Request type cannot bypass the framework boundary via @types resolution', () =>
  denied(
    {
      'src/users/domain/entity.ts':
        "import type { Request } from 'express'; export type Input = Request;",
    },
    'core-cannot-depend-on-framework-or-database',
  ));

test('direct @types/express import is also forbidden in application', () =>
  denied(
    {
      'src/users/application/use-case.ts':
        "import type { Request } from '@types/express'; export type Input = Request;",
    },
    'core-cannot-depend-on-framework-or-database',
  ));

test('shared application is not domain merely because it lives under shared', () =>
  denied(
    {
      'src/users/domain/entity.ts':
        "export type { Port } from '@/shared/application/port';",
      'src/shared/application/port.ts': 'export interface Port { run(): void }',
    },
    'domain-only-depends-on-domain',
  ));
