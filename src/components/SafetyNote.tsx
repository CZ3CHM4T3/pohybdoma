import Link from "next/link";
import { ShieldAlert } from "lucide-react";

const DEFAULT_NOTE =
  "Cvičení na POHYB DOMA je pohybová edukace a kondiční vedení, ne zdravotní péče. Cvič vždy v rozsahu bez bolesti. Při akutní či silné bolesti, po úrazu nebo operaci, v těhotenství a po porodu nebo při potížích (vystřelující bolest, mravenčení, závrať) se nejdřív poraď s lékařem nebo fyzioterapeutem.";

/** Upozornění / kontraindikace u cviku, videa nebo kurzu. */
export function SafetyNote({ note, className = "" }: { note?: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 ${className}`}>
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-800">
        <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={2} /> Než začneš cvičit
      </p>
      <p className="text-sm leading-relaxed text-amber-900/90">{note || DEFAULT_NOTE}</p>
      <Link
        href="/zdravotni-upozorneni"
        className="mt-2 inline-block text-xs font-semibold text-amber-800 hover:underline"
      >
        Zdravotní upozornění →
      </Link>
    </div>
  );
}
