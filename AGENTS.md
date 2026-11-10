# Working in rvl-js

Guidance for anyone, human or agent, changing code here.

- The repo is an npm workspace with its packages under `packages/`: npm
  only, and no task runner. The root's `lint`, `typecheck`, `test` and
  `build` run every package's, and an app's `start` and `dev` take
  `-w <package>`.
- Every tool and tool plugin is a root dev dependency. A package declares
  its runtime and type dependencies, and depends on a workspace package with
  the range `*`.
- Every other dependency takes a caret range. A pin or a tilde needs a
  specific reason, such as an incompatibility or a security vulnerability.
- Everything runs its TypeScript source. Nothing is compiled but an app's
  page, by Vite, and rvl-node is private and not published.
- Lint is two passes: each package's own config, which spreads
  `eslint.config.common.mjs`, and the root pass for the monorepo rule, which
  needs `-c eslint.config.mjs`.
- A package's entry point exports only what another package imports. An
  export joins it in the change that adds its first importer.
- A lint disable is temporary, inline, and gives a reason naming what ends
  it. Package rules only: never a config block, an option that exempts a
  package, or the root rule. A function waiting for its first importer stays
  out of the entry point and carries a disable of the package rule that
  fires on it, where it is defined.
