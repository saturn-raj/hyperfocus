# Hyperfocus Companion

1. Start Hyperfocus with `npm run dev` (port 5180) or `npm run preview` (port 4173).
2. Open `chrome://extensions` in Chrome or a Chromium browser.
3. Enable **Developer mode**, choose **Load unpacked**, and select this `extension` directory.
4. Reload the Hyperfocus tab, set domains in Settings, and start a focus session.
5. Open a new tab to a blocked domain. Chrome shows its standard blocked-request page.

| Behavior                | Detail                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permissions             | All HTTP/HTTPS hosts, used only for domain blocking; declarativeNetRequest, session storage, alarms. No browsing history is read or uploaded.                                                           |
| Trusted planners        | Only localhost and 127.0.0.1 on ports 5180 and 4173. To self-host elsewhere, explicitly add your exact origin to both `bridge.js` and `background.js` and add its content-script match in the manifest. |
| Blocking                | Main-frame navigation to the chosen domains and their subdomains. Already-open pages, embedded content, native apps, and other devices are not blocked.                                                 |
| Stop                    | Pause, discard, finish, or timer expiration clears rules on the next heartbeat, normally within 2 seconds.                                                                                              |
| Closed or suspended tab | The 15-second heartbeat lease expires. Chrome's 30-second alarm checks and clears rules, normally within 45 seconds of the last heartbeat. A suspended browser may delay alarms.                        |
| Browser restart         | Session rules and session storage are ephemeral. Nothing remains blocked after restarting.                                                                                                              |
| Multiple planners       | The most recent heartbeat controls blocking. Use one running planner tab.                                                                                                                               |
| Security boundary       | A trusted planner origin can control the blocklist. Do not run untrusted applications on those origins.                                                                                                 |
| Disable                 | Turn off or remove the extension in `chrome://extensions`.                                                                                                                                              |

The extension is optional and independent of the planner's storage. It makes no network requests and uses no remote code. Browser automation does not verify Chrome's privileged extension APIs; use the installation steps above as the manual smoke test.
