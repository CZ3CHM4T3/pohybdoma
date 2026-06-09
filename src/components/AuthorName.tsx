import Link from "next/link";
import { BadgePins } from "@/components/BadgePins";

/** Jméno autora s odkazem na jeho (sledující) profil + přišpendlené odznaky. */
export function AuthorName({
  id, name, pins, className,
}: {
  id: string; name: string | null; pins?: string[]; className?: string;
}) {
  return (
    <span className="inline-flex items-center align-middle">
      <Link href={`/profil/${id}`} className={`hover:underline ${className ?? "font-semibold text-brand-dark"}`}>
        {name ?? "Člen"}
      </Link>
      <BadgePins ids={pins} />
    </span>
  );
}
