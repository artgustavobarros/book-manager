import { cn } from "cn";

export function LentBadge({
  borrower,
  className,
}: {
  borrower: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "self-start rounded-full bg-lentbg px-2 font-semibold text-lentfg text-xs",
        className
      )}
    >
      Com {borrower}
    </span>
  );
}
