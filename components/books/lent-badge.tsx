import { cn } from "cn";

export function LentBadge({ borrower, className }: { borrower: string; className?: string }) {
  return (
    <span className={cn("self-start rounded-full bg-lentbg px-2 text-xs font-semibold text-lentfg", className)}>Com {borrower}</span>
  );
}
