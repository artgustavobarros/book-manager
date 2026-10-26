import { cn } from "cn";

import { useApp } from "@/components/app/app-provider";
import { lentDurationLabel } from "@/lib/domain/text";
import type { Book } from "@/lib/domain/types";

/**
 * Situação do livro fora de casa, abaixo do título: "Com Ana · 3 sem." (com ✕ para
 * registrar a devolução) ou "Doado". Em casa não mostra nada.
 */
export function SituationBadge({
  book,
  onReturn,
  className,
}: {
  book: Pick<Book, "situation" | "borrower" | "lentAt">;
  onReturn?: () => void;
  className?: string;
}) {
  if (book.situation === "doado") {
    return (
      <span
        className={cn(
          "inline-flex items-center self-start rounded-full bg-soft px-2 font-semibold text-mute text-xs",
          className
        )}
      >
        Doado
      </span>
    );
  }
  if (book.situation !== "emprestado") {
    return null;
  }
  return (
    <LentBadge
      borrower={book.borrower}
      className={className}
      lentAt={book.lentAt}
      onReturn={onReturn}
    />
  );
}

function LentBadge({
  borrower,
  lentAt,
  onReturn,
  className,
}: {
  borrower: string | null;
  lentAt: string | null;
  onReturn?: () => void;
  className?: string;
}) {
  const app = useApp();
  // `now` e `tz` do servidor: o rótulo sai igual no SSR e na hidratação.
  const duration = lentDurationLabel(lentAt, new Date(app.now), app.tz);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 self-start rounded-full bg-lentbg px-2 font-semibold text-lentfg text-xs",
        className
      )}
    >
      <span>
        {borrower ? "Com " + borrower : "Emprestado"}
        {duration ? <span> · {duration}</span> : null}
      </span>
      {onReturn ? (
        <button
          aria-label={
            borrower
              ? `Registrar devolução de livro emprestado a ${borrower}`
              : "Registrar devolução"
          }
          // Alvo de toque de 24px em volta do círculo de 16px; a margem negativa devolve
          // o espaço do padding. Cresce mais para cima porque, na lista do celular, o
          // autor fica logo abaixo.
          className="group/return -mt-[5px] -mr-1 -mb-[3px] -ml-0.5 inline-flex size-6 rounded-full px-1 pt-[5px] pb-[3px] text-[10px] text-lentfg"
          onClick={(e) => {
            e.stopPropagation();
            onReturn();
          }}
          title="Registrar devolução"
          type="button"
        >
          <span className="flex size-4 items-center justify-center rounded-full bg-lentfg/15 transition-colors group-hover/return:bg-lentfg group-hover/return:text-white">
            ✕
          </span>
        </button>
      ) : null}
    </span>
  );
}
