import { cn } from "cn";

import { lentDurationLabel } from "@/lib/domain/text";

export function LentBadge({
  borrower,
  lentAt,
  onReturn,
  className,
}: {
  borrower: string;
  lentAt?: string | null;
  onReturn?: () => void;
  className?: string;
}) {
  const duration = lentDurationLabel(lentAt);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 self-start rounded-full bg-lentbg px-2 font-semibold text-lentfg text-xs",
        className
      )}
    >
      <span>
        Com {borrower}
        {duration ? <span className="opacity-75"> · {duration}</span> : null}
      </span>
      {onReturn ? (
        <button
          aria-label={`Registrar devolução de livro emprestado a ${borrower}`}
          className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-lentfg/15 text-[10px] text-lentfg transition-colors hover:bg-lentfg hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            onReturn();
          }}
          title="Registrar devolução"
          type="button"
        >
          ✕
        </button>
      ) : null}
    </span>
  );
}
