import { useEffect, useState } from "react";
import { onSyncStateChange, runSync } from "../sync/syncManager";
import { countPendingInvoices } from "../db/offlineDb";

export default function SyncStatusBadge() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    countPendingInvoices().then(setPending);
    const unsubscribe = onSyncStateChange(setPending);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!online) {
    return (
      <button
        onClick={() => void runSync()}
        className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
        title="No internet connection. New invoices are saved on this device and will send automatically once you're back online."
      >
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Offline{pending > 0 ? ` · ${pending} queued` : ""}
      </button>
    );
  }

  if (pending > 0) {
    return (
      <button
        onClick={() => void runSync()}
        className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
        title="Tap to sync now"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        Syncing {pending}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      All synced
    </span>
  );
}
