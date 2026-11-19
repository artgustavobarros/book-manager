"use client";

import { RotateCcwIcon, ScanBarcodeIcon } from "lucide-react";
import Image from "next/image";

import { BookLookupOption } from "@/components/books/book-lookup-option";
import { Button } from "@/components/ui/button";
import { Modal, ModalClose } from "@/components/ui/dialog";
import type { PhotoReading } from "@/lib/domain/book-photo";
import type { LookupResult } from "@/lib/domain/lookup";

export interface BookConfirmData {
  candidates: LookupResult[];
  catalogFailed: boolean;
  previewImage: string | null;
  reading: PhotoReading;
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
  onSelect,
  onUseReading,
  onRetry,
  onManual,
  onCloseAutoFocus,
}: {
  data: BookConfirmData | null;
  onSelect: (result: LookupResult, reading: PhotoReading) => void;
  onUseReading: (reading: PhotoReading) => void;
  onRetry: () => void;
  onManual: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const candidates = data?.candidates ?? [];
  const hasCandidates = candidates.length > 0;
  const summary = readingSummary(data?.reading ?? null);

  return (
    <Modal
      className="max-w-lg"
      description="Confirme se o livro encontrado corresponde ao seu exemplar."
      onCloseAutoFocus={onCloseAutoFocus}
      onOpenChange={(next) => {
        if (!next) {
          onManual();
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
                {hasCandidates
                  ? "É algum destes livros?"
                  : "Nenhum livro encontrado"}
              </h2>
              <p className="m-0 text-mute text-xs">
                {hasCandidates
                  ? "Toque no livro correspondente para preencher a ficha."
                  : "Você pode tentar escanear novamente ou preencher manualmente."}
              </p>
            </div>
            <ModalClose label="Fechar confirmação" />
          </div>

          {summary ? (
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
                  {data.reading.isbn
                    ? "Código ISBN identificado"
                    : "Leitura identificada"}
                </span>
                <span className="truncate font-semibold text-ink text-sm">
                  {summary}
                </span>
              </div>
            </div>
          ) : null}

          {hasCandidates ? (
            <div className="-mx-1 flex max-h-[min(46dvh,360px)] flex-col gap-2 overflow-y-auto px-1">
              {candidates.map((item, idx) => (
                <BookLookupOption
                  item={item}
                  key={`${item.source}-${item.title}-${idx}`}
                  onSelect={(selected) => onSelect(selected, data.reading)}
                  variant="card"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-hov p-4">
              <p className="m-0 text-mute text-sm leading-relaxed">
                {data.catalogFailed
                  ? "Não foi possível consultar os catálogos online. Verifique a conexão e tente novamente."
                  : "Não encontramos nenhuma edição correspondente nos catálogos online para essa leitura."}
              </p>
              {data.reading.title || data.reading.author ? (
                <Button
                  className="w-full"
                  onClick={() => onUseReading(data.reading)}
                  variant="neutral"
                >
                  Usar leitura (“{data.reading.title || data.reading.author}”)
                  na ficha
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
              <RotateCcwIcon aria-hidden="true" className="size-4 shrink-0" />
              Tentar novamente
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
