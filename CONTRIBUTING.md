# Contributing

| Step         | Requirement                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup        | Node 22+, `npm ci`, `npm run dev`. No secrets or accounts required.                                                                                  |
| Design       | Keep domain rules independent of React and storage. Put side effects behind infrastructure adapters and state mutations behind application commands. |
| Changes      | Open a focused issue or pull request describing the user problem, resulting behavior, and any data-format impact.                                    |
| Verification | Run `npm run check`. For UI or workflow changes, run `npx playwright install chromium` and `npm run test:e2e`.                                       |
| Formatting   | Run `npm run format` and commit the resulting source and lockfile changes.                                                                           |
| Data changes | Never overwrite a previously valid schema without a tested migration and backup path. Never commit personal backups or credentials.                  |
| Claims       | Label integrations and AI accurately. Do not replace real behavior with simulated success messages or invented analytics.                            |
| License      | Contributions are licensed under the repository's MIT license.                                                                                       |
