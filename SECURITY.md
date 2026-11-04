# Security

| Topic             | Guidance                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local data        | Browser storage contains unencrypted goals, reflections and focus history. Treat backups as private documents. Other users of the same browser profile can access them.             |
| Browser extension | Broad host permissions enable navigation blocking. Rules do not read page content. Review the extension source and its documented trusted origins before installation.              |
| Self-hosting      | Serve only trusted assets over HTTPS. Keep the site origin stable. Add authentication and a threat model before adding remote storage or a server API.                              |
| Reporting         | Use the repository's private vulnerability-reporting feature if available. Otherwise open an issue asking for a private contact without disclosing exploit details or private data. |
| Dependencies      | Run `npm audit` and evaluate tooling advisories separately from production runtime dependencies.                                                                                    |
