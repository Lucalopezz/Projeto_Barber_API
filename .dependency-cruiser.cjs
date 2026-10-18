// Compare resolved files, so aliases, relative imports and barrel re-exports
// obey the same boundaries. Tests remain in the graph: excluding them globally
// would hide a production module importing a test helper.
const testFiles =
  '(^|/)(__tests__|__mocks__|__fixtures__|tests?|testing)/|\\.(spec|test|int-spec|e2e-spec)\\.[cm]?[jt]sx?$';

module.exports = {
  forbidden: [
    {
      name: 'domain-only-depends-on-domain',
      severity: 'error',
      comment:
        'Domain may only depend on other domain code inside src, including shared/domain.',
      from: { path: '^src/[^/]+/domain/', pathNot: testFiles },
      to: { path: '^src/', pathNot: '^src/[^/]+/domain/' },
    },
    {
      name: 'application-cannot-depend-on-adapters',
      severity: 'error',
      comment:
        'Application may use domain and application contracts, including shared, never adapters/composition.',
      from: { path: '^src/[^/]+/application/', pathNot: testFiles },
      to: { path: '^src/', pathNot: '^src/[^/]+/(domain|application)/' },
    },
    {
      name: 'core-cannot-depend-on-framework-or-database',
      severity: 'error',
      comment:
        'NestJS, Prisma and HTTP server adapters belong outside domain/application, even as types.',
      from: { path: '^src/[^/]+/(domain|application)/', pathNot: testFiles },
      to: {
        path: '(^|/)node_modules/(@nestjs/|@prisma/|\\.prisma/|prisma(/|$)|fastify(/|$)|express(/|$)|@fastify/|@types/(express(-serve-static-core)?|serve-static)(/|$))',
      },
    },
    {
      name: 'production-cannot-import-tests',
      severity: 'error',
      comment:
        'Production code cannot depend on test suites, mocks or testing helpers.',
      from: { path: '^src/', pathNot: testFiles },
      to: { path: testFiles },
    },
    {
      name: 'no-circular-dependencies',
      severity: 'error',
      comment: 'Reject source cycles, including type-only cycles.',
      from: { path: '^src/' },
      to: { circular: true },
    },
    {
      name: 'no-unresolved-imports',
      severity: 'error',
      comment:
        'An unresolved import must not silently bypass architectural validation.',
      from: { path: '^src/' },
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    preserveSymlinks: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['types', 'import', 'require', 'node', 'default'],
    },
  },
};
