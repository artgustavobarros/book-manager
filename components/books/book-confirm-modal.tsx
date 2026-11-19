"use client";

import {
  ArrowLeftIcon,
  RotateCcwIcon,
  ScanBarcodeIcon,
  SearchIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useState } from "react";

import { BookLookupOption } from "@/components/books/book-lookup-option";
import { Button } from "@/components/ui/button";
import { Modal, ModalClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { PhotoReading } from "@/lib/domain/book-photo";
import type { LookupResult } from "@/lib/domain/lookup";

export interface BookConfirmData {
  candidates: LookupResult[];
  catalogFailed: boolean;
  previewImage?: string | null;
  reading?: PhotoReading | null;
  searchQuery?: string;
}

function readingSummary(reading: PhotoReading | null): string {
  if (!reading) {
    return "";
  }
  if (reading.isbn) {
    return `ISBN ${reading.isbn}`;
  }
  return [reading.title, reading.author].filter(Boolean).join(" · ");
}

export function BookConfirmModal({
  data,
  searching = false,
  onSelect,
  onUseReading,
  onSearchAgain,
  onRetry,
  onManual,
  onDismiss,
  onCloseAutoFocus,
  retryLabel = "Tentar novamente",
}: {
  data: BookConfirmData | null;
  searching?: boolean;
  onSelect: (result: LookupResult, reading: PhotoReading | null) => void;
  onUseReading?: (reading: PhotoReading) => void;
  onSearchAgain?: (query: string) => void;
  onRetry: () => void;
  onManual: () => void;
  onDismiss?: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  retryLabel?: string;
}) {
  const candidates = data?.candidates ?? [];
  const hasCandidates = candidates.length > 0;
  const reading = data?.reading ?? null;
  const isTextSearch = data?.searchQuery !== undefined && !!onSearchAgain;
  const [queryInput, setQueryInput] = useState(data?.searchQuery ?? "");
  const searchInputId = useId();

  useEffect(() => {
    setQueryInput(data?.searchQuery ?? "");
  }, [data?.searchQuery]);

  const summary = readingSummary(reading) || data?.searchQuery || "";
  const summaryLabel = data?.searchQuery
    ? "Busca por título ou ISBN"
    : reading?.isbn
      ? "Código ISBN identificado"
      : "Leitura identificada";

  return (
    <Modal
      className="max-w-lg"
      description="Confirme se o livro encontrado corresponde ao seu exemplar."
      onCloseAutoFocus={onCloseAutoFocus}
      onOpenChange={(next) => {
        if (!next) {
          (onDismiss ?? onManual)();
        }
      }}
      open={data !== null}
      title={
        hasCandidates ? "É algum destes livros?" : "Nenhum livro encontrado"
      }
      veilClassName="z-40 max-[640px]:items-center max-[640px]:p-2"
    >
      {data ? (
        <div className="flex flex-col gap-4 p-5 max-[640px]:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="m-0 font-bold font-title text-xl leading-tight">
                {searching
                  ? "Buscando livros…"
                  : hasCandidates
                    ? "É algum destes livros?"
                    : "Nenhum livro encontrado"}
              </h2>
              <p className="m-0 text-mute text-xs">
                {searching
                  ? "Consultando os catálogos online."
                  : hasCandidates
                    ? "Toque no livro correspondente para preencher a ficha."
                    : isTextSearch
                      ? "Você pode ajustar a busca acima ou preencher os dados manualmente."
                      : "Você pode tentar escanear novamente ou preencher manualmente."}
              </p>
            </div>
            <ModalClose label="Fechar confirmação" />
          </div>

          {isTextSearch ? (
            <form
              className="flex flex-col gap-2 rounded-xl border border-line bg-hov p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const next = queryInput.trim();
                if (next && !searching) {
                  onSearchAgain(next);
                }
              }}
            >
              <label
                className="font-medium text-mute text-xs"
                htmlFor={searchInputId}
              >
                Busca por título ou ISBN
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="h-9 min-w-0 flex-1 rounded-lg border border-line2 bg-card px-3 text-ink text-sm outline-none placeholder:text-mute focus:border-ink"
                  disabled={searching}
                  id={searchInputId}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="ex.: Torto arado ou 9788554512348"
                  value={queryInput}
                />
                <Button
                  disabled={searching || !queryInput.trim()}
                  size="sm"
                  type="submit"
                  variant="primary"
                >
                  <SearchIcon
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                  />
                  {searching ? "Buscando…" : "Buscar"}
                </Button>
              </div>
            </form>
          ) : summary ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-hov p-3">
              {data.previewImage ? (
                <Image
                  alt="Prévia da imagem escaneada"
                  className="h-14 w-10 shrink-0 rounded object-cover"
                  height={56}
                  src={data.previewImage}
                  unoptimized
                  width={40}
                />
              ) : (
                <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded bg-soft text-mute">
                  <ScanBarcodeIcon aria-hidden="true" className="size-5" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium text-mute text-xs">
                  {summaryLabel}
                </span>
                <span className="truncate font-semibold text-ink text-sm">
                  {summary}
                </span>
              </div>
            </div>
          ) : null}

          {searching ? (
            <div
              aria-busy="true"
              aria-label="Buscando nos catálogos"
              className="flex flex-col gap-2"
              role="status"
            >
              {[0, 1, 2].map((i) => (
                <div
                  className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
                  key={i}
                >
                  <Skeleton className="h-20 w-14 flex-none rounded-md" />
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3.5 w-2/5" />
                    <Skeleton className="h-3.5 w-4/5" />
                  </span>
                </div>
              ))}
            </div>
          ) : hasCandidates ? (
            <div className="-mx-1 flex max-h-[min(46dvh,360px)] flex-col gap-2 overflow-y-auto px-1">
              {candidates.map((item, idx) => (
                <BookLookupOption
                  item={item}
                  key={`${item.source}-${item.title}-${idx}`}
                  onSelect={(selected) => onSelect(selected, reading)}
                  variant="card"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-hov p-4">
              <p className="m-0 text-mute text-sm leading-relaxed">
                {data.catalogFailed
                  ? "Não foi possível consultar os catálogos online. Verifique a conexão e tente novamente."
                  : "Não encontramos nenhuma edição correspondente nos catálogos online."}
              </p>
              {reading && onUseReading && (reading.title || reading.author) ? (
                <Button
                  className="w-full"
                  onClick={() => onUseReading(reading)}
                  variant="neutral"
                >
                  Usar leitura (“{reading.title || reading.author}”) na ficha
                </Button>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-soft border-t pt-3">
            <Button
              className="max-[640px]:flex-1"
              onClick={onRetry}
              variant="neutral"
            >
              {isTextSearch ? (
                <ArrowLeftIcon aria-hidden="true" className="size-4 shrink-0" />
              ) : (
                <RotateCcwIcon aria-hidden="true" className="size-4 shrink-0" />
              )}
              {retryLabel}
            </Button>
            <Button
              className="max-[640px]:flex-1"
              onClick={onManual}
              variant="outline"
            >
              Preencher manualmente
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
