// SLD settings for permit-run.
// Written by the SLD installer on 2026-10-10. These lists are yours to edit —
// they are written in plain words on purpose. Never edit the engine files in
// .sld/vendor/ (they are checked automatically and must stay exactly as installed).
//
// What each list means:
// - forbiddenTerms: old product or brand names that must never come back.
// - protectedTables: database tables that must never be wiped out.
// - protectedFeatures: parts of the app that always need a human look before they change.

export default {
  version: 1,
  application: {
    name: "permit-run",
    description: "",
  },
  identity: {
    protectedTerms: [],
    forbiddenTerms: [],
  },
  architecture: {
    canonicalRoot: '.',
    rootMarkers: [],
    protectedDirectories: [],
    forbiddenDependencies: [],
    serverOnlyModules: [],
    boundaries: [],
  },
  data: {
    database: '',
    orm: '',
    protectedTables: [],
    destructiveOperationsRequireApproval: true,
    destructivePatterns: ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE'],
    migrationsDir: '',
  },
  interface: {
    designSystem: '',
    protectedComponents: [],
    reuseInsteadOfReimplementing: [],
  },
  behavior: {
    protectedFeatures: [],
  },
  intent: {
    productPrinciples: [],
    reframingPhrases: [],
    fabricatedDataPatterns: [],
  },
  integrity: {
    magnitudeReviewThreshold: 0.35,
    magnitudeBlockThreshold: 0.6,
    elisionMarkers: [
      '... rest of file unchanged',
      'rest of file unchanged',
      '// unchanged',
      '[... existing code ...]',
    ],
    // SVG sign and signal files are often authored as a single line. Redrawing
    // one removes 100% of that line, which looks like a deleted artifact to SLD.
    // Only these two SVG directories opt out of its line-count heuristic.
    // .sld/validate-road-assets.mjs replaces that heuristic with an explicit
    // no-deletions and SVG-content check, run on every pull request by CI.
    // Code, scenes, non-SVG files, and unrelated directories remain protected.
    excludedGlobs: [
      '**/*.md', '**/*.test.*', '**/*.spec.*', 'package-lock.json', '.sld/**',
      'app/assets/signs/*.svg', 'app/assets/signals/*.svg',
    ],
  },
  entities: {
    'SLD Engine': ['.sld/**'],
  },
  protection: {
    // Which files belong to SLD itself. Only SLD updates may touch these.
    paths: ['.sld/', '.github/workflows/sld-check.yml'],
    // Files SLD skips when reading content: the engine files quote their own
    // rulebook, so checking them would flag their own definitions.
    sourcePaths: ['.sld/vendor/'],
  },
  policies: {"unknownScope":"BLOCK","unknownChange":"INSUFFICIENT_EVIDENCE","destructiveChange":"BLOCK","architectureViolation":"BLOCK","dependencyViolation":"REVIEW_REQUIRED","behavioralChange":"REVIEW_REQUIRED","protectedFeatureChange":"REVIEW_REQUIRED","designSystemDrift":"ALLOW_WITH_WARNING","forbiddenTerm":"BLOCK","duplicateAppRoot":"BLOCK","harmlessChange":"ALLOW","invalidContractApproval":"INSUFFICIENT_EVIDENCE","missingRequiredChange":"BLOCK","contentLoss":"REVIEW_REQUIRED","generationArtifactCorruption":"REVIEW_REQUIRED"},
};
