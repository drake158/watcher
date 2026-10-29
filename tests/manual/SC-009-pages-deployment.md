# GitHub Pages deployment checks

## Workflow checks

- [x] `dist/` is the only Pages artifact.
- [x] Project builds with `VITE_BASE_PATH=/${repository-name}/`.
- [x] Every external action is pinned to a full commit SHA and annotated with its release.
- [x] Build job has only `contents: read`.
- [x] Deploy job has only `pages: write` and `id-token: write`.
- [x] The deploy job condition requires `github.ref_name == github.event.repository.default_branch`; this also applies to `workflow_dispatch`.
- [x] Deploy job uses the `github-pages` environment.
- [x] Workflow defines no PAT, user token, or repository secret.

## Repository settings required before the first deployment

1. Keep the approved repository public.
2. In **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
3. In **Settings → Environments → github-pages → Deployment branches and tags**, select the default branch only.
4. Push to the default branch, or dispatch the workflow with the default branch selected. A manual run selected on another branch may build but cannot enter the deploy job.

## Runtime checks still requiring a GitHub-hosted run

- [ ] Confirm the environment restriction rejects a deployment from a non-default branch.
- [ ] Confirm the default-branch run publishes and the project-path URL opens and refreshes over HTTPS.
- [ ] Inspect the workflow run permissions, artifact, and Pages URL.

These runtime checks are not claimed as completed until a Pages workflow has run in the repository.
