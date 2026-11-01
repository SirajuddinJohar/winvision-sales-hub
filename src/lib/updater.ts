// Capgo OTA live updates: silently checks for new app bundles on launch and
// swaps them in on the next restart — no APK reinstall needed for UI changes.
// Web/browser (Lovable preview, Chrome) is a no-op; this only runs natively.

export async function initLiveUpdates(): Promise<void> {
  try {
    const capacitor = (window as any).Capacitor;
    if (!capacitor?.isNativePlatform?.()) return;

    const { CapacitorUpdater } = await import("@capgo/capacitor-updater");

    // Tell Capgo the current bundle launched fine, so failed updates roll back.
    try {
      await CapacitorUpdater.notifyAppReady();
    } catch (e) {
      console.error("Live updates: notifyAppReady failed", e);
    }
  } catch (e) {
    console.error("Live updates init failed", e);
  }
}
