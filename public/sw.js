/**
 * The service worker that makes the admin app installable ("Install app" /
 * "Add to Home screen" opening full-screen).
 *
 * IT CACHES NOTHING. Every request goes to the network exactly as it would
 * without it, so a deploy shows up on the next load and no stale page or
 * figure is ever served. The fetch listener exists only because browsers look
 * for one before they offer to install.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Deliberately empty: the browser handles the request normally.
});
