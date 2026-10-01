/** Peças das telas de autenticação seguras para componentes client. */

export const authCardClass =
  "flex w-full max-w-[400px] animate-[acv-rise_300ms_both] flex-col gap-5 rounded-2xl border border-line bg-card p-7 shadow-card";

export function AuthHeading({ title, sub }: { title: string; sub: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="m-0 text-2xl font-bold tracking-[-.025em]">{title}</h1>
      <span className="text-sm text-pretty text-mute">{sub}</span>
    </div>
  );
}

/** Aviso dentro do cartão (mensagens de estado que o design não previa). */
export function AuthNotice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-lg border border-acc/40 bg-hov px-3 py-2.5 text-xs leading-[1.5] text-ink"
          : "rounded-lg bg-hov px-3 py-2.5 text-xs leading-[1.5] text-ink"
      }
    >
      {children}
    </div>
  );
}
