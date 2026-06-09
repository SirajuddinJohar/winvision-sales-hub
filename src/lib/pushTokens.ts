import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

const isNative = () => Capacitor.isNativePlatform();

const saveToken = async (userId: string, token: string, platform: string) => {
  try {
    await supabase
      .from("device_tokens")
      .upsert(
        { user_id: userId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: "token" },
      );
  } catch (e) {
    console.error("save device token failed", e);
  }
};

/**
 * Register the current device for push notifications and store the token
 * in Supabase against the signed-in user. Safe to call on every app start.
 */
export const registerDevicePush = async (userId: string) => {
  if (!isNative()) return;
  try {
    const perm = await PushNotifications.checkPermissions();
    let allowed = perm.receive === "granted";
    if (!allowed) {
      const req = await PushNotifications.requestPermissions();
      allowed = req.receive === "granted";
    }
    if (!allowed) return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (t) => {
      const platform = Capacitor.getPlatform(); // 'ios' | 'android'
      await saveToken(userId, t.value, platform);
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("push registration error", err);
    });
  } catch (e) {
    console.error("registerDevicePush failed", e);
  }
};

/** Remove the current device token (e.g. on sign-out). */
export const unregisterDevicePush = async (token?: string) => {
  if (!token) return;
  try {
    await supabase.from("device_tokens").delete().eq("token", token);
  } catch (e) {
    console.error("unregister token failed", e);
  }
};
