import TablePage, { UnknownTable, type FirstMenu } from "@/components/burnout/TablePage";
import { menuFrom, publicMenuPath, type PosMenu } from "@/lib/burnout/pos";

/**
 * The page every table's QR code opens: /order/<qrToken> — Burnout's own
 * menu (components/burnout) over this POS's table-QR API.
 *
 * The menu is fetched here for the first paint, straight from the backend
 * over the private network (BACKEND_URL at runtime, as in docker-compose);
 * if that fails the phone fetches it itself through the /api proxy.
 */
const BACKEND = (process.env.BACKEND_URL ?? "http://localhost:4001").replace(/\/$/, "");

async function firstMenu(qrToken: string): Promise<FirstMenu | "unknown" | null> {
  try {
    const res = await fetch(`${BACKEND}${publicMenuPath(qrToken)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return "unknown";
    if (!res.ok) return null;
    const m = (await res.json()) as PosMenu;
    return { label: m.tableName, menu: menuFrom(m) };
  } catch {
    return null;
  }
}

export default async function OrderPage({ params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = await params;
  const first = await firstMenu(qrToken);
  if (first === "unknown") return <UnknownTable />;
  return <TablePage qrToken={qrToken} first={first} />;
}
