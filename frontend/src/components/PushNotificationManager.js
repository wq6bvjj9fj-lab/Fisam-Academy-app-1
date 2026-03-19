import { useEffect, useState } from "react";
import { useAuth } from "@/App";
import { Bell, BellOff } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const { token } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch (e) {
      console.error("Check subscription error:", e);
    }
  }

  async function subscribe() {
    if (!token) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;

      const res = await fetch(`${API}/api/push/vapid-key`);
      const { publicKey } = await res.json();

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setLoading(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = sub.toJSON();
      await fetch(`${API}/api/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      setIsSubscribed(true);
    } catch (e) {
      console.error("Subscribe error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }

      await fetch(`${API}/api/push/unsubscribe`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsSubscribed(false);
    } catch (e) {
      console.error("Unsubscribe error:", e);
    } finally {
      setLoading(false);
    }
  }

  if (!isSupported) return null;

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-all ${
        isSubscribed
          ? "text-[#F5A623] bg-[#F5A623]/10"
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
      data-testid="push-toggle"
      title={isSubscribed ? "Disattiva notifiche push" : "Attiva notifiche push"}
    >
      {isSubscribed ? (
        <Bell className="w-4 h-4" />
      ) : (
        <BellOff className="w-4 h-4" />
      )}
      <span className="tracking-wider uppercase text-xs">
        {loading ? "..." : isSubscribed ? "Push attive" : "Attiva push"}
      </span>
    </button>
  );
}
