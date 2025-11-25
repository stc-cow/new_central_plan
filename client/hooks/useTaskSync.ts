import { useEffect, useState } from "react";
import { supabase, SUPABASE_CONFIGURED } from "@/lib/supabase";

export function useTaskSync(driverId: string) {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!driverId || !SUPABASE_CONFIGURED) return;

    let isMounted = true;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      if (error) {
        console.error("Failed to fetch tasks", error);
        return;
      }
      setTasks(data || []);
    };

    fetchTasks();

    const channel = supabase
      .channel(`public:tasks:driver:${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          fetchTasks();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return tasks;
}
