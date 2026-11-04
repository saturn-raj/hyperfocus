# Security

| Topic              | Guidance                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local data         | Goals, answers, commitments, reflections and focus history are unencrypted in the browser profile. Treat exported backups as private documents.                                                                    |
| Connected coaching | Opt-in mode sends planning context to the configured provider. Keep credentials in ignored server-side `.env` settings. The app does not log personal answers or provider keys. Provider retention policies apply. |
| Local API          | The Node server binds to `127.0.0.1` and rejects foreign/cross-site coaching origins. It has no accounts, public-user authorization or billing quotas. Add those before designing a remote multi-user deployment.  |
| Static hosting     | Deploy trusted built assets over HTTPS and keep the origin stable. Static mode cannot call an unconfigured remote coaching API.                                                                                    |
| Browser companion  | Broad host permissions enable navigation blocking. No browsing history or page content is read. Review its trusted planner origins before installation.                                                            |
| Reporting          | Use GitHub private vulnerability reporting if available. Otherwise ask for a private contact in an issue without publishing exploit details or private data.                                                       |
| Dependencies       | Check runtime and tooling advisories separately. No third-party reverse-engineered code or personal onboarding captures belong in pull requests.                                                                   |
