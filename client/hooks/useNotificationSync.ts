import { useEffect, useState } from "react";
import { supabase, SUPABASE_CONFIGURED } from "@/lib/supabase";

export function useNotificationSync(driverName: string | null) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!driverName || !SUPABASE_CONFIGURED) {
      // Clear when driver name is not available
      setNotifications([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let channel: any = null;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        console.debug(`Fetching notifications for driver: ${driverName}`);

        const { data, error } = await supabase
          .from("driver_notifications")
          .select("*")
          .eq("driver_name", driverName)
          .order("created_at", { ascending: false });

        if (!isMounted) return;

        if (error) {
          console.error("Failed to fetch notifications", error);
          setNotifications([]);
          return;
        }

        console.debug(
          `Loaded ${data?.length || 0} notifications for driver: ${driverName}`,
          data,
        );
        setNotifications(data || []);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Fetch immediately
    fetchNotifications();

    // Setup realtime subscription with a small delay to ensure connection
    const setupSubscription = () => {
      try {
        channel = supabase
          .channel(`driver_notifications:${driverName}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "driver_notifications",
              filter: `driver_name=eq.${driverName}`,
            },
            (payload: any) => {
              console.debug("New notification received:", payload);
              if (isMounted) {
                setNotifications((prev) => [payload.new, ...prev]);
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "driver_notifications",
              filter: `driver_name=eq.${driverName}`,
            },
            (payload: any) => {
              console.debug("Notification updated:", payload);
              if (isMounted) {
                setNotifications((prev) =>
                  prev.map((n) => (n.id === payload.new.id ? payload.new : n)),
                );
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "driver_notifications",
              filter: `driver_name=eq.${driverName}`,
            },
            (payload: any) => {
              console.debug("Notification deleted:", payload);
              if (isMounted) {
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== payload.old.id),
                );
              }
            },
          )
          .subscribe((status: string) => {
            console.debug(
              `Notification subscription status for ${driverName}:`,
              status,
            );
          });
      } catch (err) {
        console.error("Failed to setup realtime subscription", err);
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("Error removing notification channel:", err);
        }
      }
    };
  }, [driverName]);

  return { notifications, loading };
}
