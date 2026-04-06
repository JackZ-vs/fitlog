"use client";

import { useEffect, useRef } from "react";
import { isSupabaseConfigured } from "@/lib/db";

/**
 * Subscribes to Supabase Realtime postgres_changes for the given tables
 * and calls `onRefresh` whenever an INSERT/UPDATE/DELETE arrives for the
 * current user.  Falls back to a polling interval when Realtime isn't
 * available (e.g. table not enabled for replication).
 */
export function useRealtimeSync(
  userId: string | null,
  tables: string[],
  onRefresh: () => void,
  pollMs = 0,           // set > 0 to enable polling fallback
) {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      // No Supabase → optional polling
      if (pollMs > 0) {
        const id = setInterval(() => refreshRef.current(), pollMs);
        return () => clearInterval(id);
      }
      return;
    }

    let channel: ReturnType<Awaited<ReturnType<typeof import("@/lib/supabase/client")["createClient"]>>["channel"]> | null = null;
    let unsub = false;

    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();

      channel = sb.channel(`fitlog-sync-${userId}`);

      for (const table of tables) {
        channel = channel.on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          {
            event: "*",
            schema: "public",
            table,
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (!unsub) refreshRef.current();
          }
        );
      }

      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR" && pollMs > 0) {
          // Realtime not enabled on this table — fall back to polling
          const id = setInterval(() => refreshRef.current(), pollMs);
          return () => clearInterval(id);
        }
      });
    })();

    return () => {
      unsub = true;
      if (channel) {
        import("@/lib/supabase/client").then(({ createClient }) => {
          createClient().removeChannel(channel!);
        });
      }
    };
  }, [userId, tables.join(","), pollMs]); // eslint-disable-line react-hooks/exhaustive-deps
}
