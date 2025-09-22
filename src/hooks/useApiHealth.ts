import { useEffect, useState } from "react";

type Status = "green" | "amber" | "red";

/** Poll /health on a schedule and return green/amber/red */
export function useApiHealth(pollMs = 15000, timeoutMs = 4000): Status {
  const [status, setStatus] = useState<Status>("red");
  const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

  useEffect(() => {
    let mounted = true;

    async function check() {
      if (!base) { if (mounted) setStatus("red"); return; }
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), timeoutMs);
        const t0 = Date.now();
        const res = await fetch(`${base}/health`, { signal: ctl.signal });
        clearTimeout(timer);

        if (!mounted) return;

        const elapsed = Date.now() - t0;
        setStatus(res.ok && elapsed < timeoutMs ? "green" : "amber");
      } catch {
        if (mounted) setStatus("red"); // network/unreachable
      }
    }

    check();
    const id = setInterval(check, pollMs);
    return () => { mounted = false; clearInterval(id); };
  }, [base, pollMs, timeoutMs]);

  return status;
}

