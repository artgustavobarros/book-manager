"use client";

import { cn } from "cn";
import {
  CameraIcon,
  CameraOffIcon,
  ImageIcon,
  RotateCcwIcon,
  ScanLineIcon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useApp } from "@/components/app/app-provider";
import {
  type BookConfirmData,
  BookConfirmModal,
} from "@/components/books/book-confirm-modal";
import { Button } from "@/components/ui/button";
import { Modal, ModalClose } from "@/components/ui/dialog";
import { useBookScanner } from "@/hooks/use-book-scanner";
import { api } from "@/lib/client/api";
import {
  captureVideoBookPhoto,
  prepareBookPhoto,
} from "@/lib/client/book-photo";
import { searchCatalogs } from "@/lib/client/lookup";
import {
  PHOTO_MODELS,
  type PhotoReading,
  type PhotoRecognition,
  photoSearchQuery,
} from "@/lib/domain/book-photo";
import type { LookupResult } from "@/lib/domain/lookup";

const PHOTO_NOTICES = {
  allow:
    "Neste ambiente, o provedor pode guardar a imagem e usá-la para treinamento. Use apenas capas públicas, sem pessoas ou dados pessoais.",
  deny: "Solicitamos provedores sem coleta para treinamento; a retenção segue a política do provedor.",
};

const PHOTO_HELP =
  "Aponte a câmera para a capa, lombada ou código de barras de um único livro, ou envie uma foto.";

const RETICLE_CORNERS = [
  "top-0 left-0 rounded-tl-md border-t-2 border-l-2",
  "top-0 right-0 rounded-tr-md border-t-2 border-r-2",
  "bottom-0 left-0 rounded-bl-md border-b-2 border-l-2",
  "right-0 bottom-0 rounded-br-md border-r-2 border-b-2",
] as const;

type ScanStage = "waiting" | "locking" | "recognizing" | "searching" | "error";

function stageLabel(stage: ScanStage, statusText: string): string {
  switch (stage) {
    case "locking":
      return "Livro detectado — mantenha firme…";
    case "recognizing":
      return "Lendo capa ou lombada…";
    case "searching":
      return statusText || "Buscando edições encontradas…";
    case "error":
      return "Não foi possível ler — tente novamente";
    default:
      return "Aponte para a capa, lombada ou código";
  }
}

export function BookPhotoSearch({
  disabled,
  onBusyChange,
  onSelectBook,
  onUseReading,
  onFocusForm,
}: {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onSelectBook: (result: LookupResult, reading: PhotoReading | null) => void;
  onUseReading: (reading: PhotoReading) => void;
  onFocusForm: () => void;
}) {
  const { photoDataCollection } = useApp();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<BookConfirmData | null>(null);
  const [scanStage, setScanStage] = useState<ScanStage>("waiting");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const confirmDataRef = useRef<BookConfirmData | null>(null);
  const reopeningScannerRef = useRef(false);
  const returnFocusToFormRef = useRef(false);
  const helpId = useId();
  confirmDataRef.current = confirmData;

  const changeBusy = useCallback(
    (value: boolean) => {
      setBusy(value);
      onBusyChange(value);
    },
    [onBusyChange]
  );

  const resetScanState = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    changeBusy(false);
    setScanStage("waiting");
    setMessage("");
    setPreviewImage(null);
  }, [changeBusy]);

  const runExclusiveTask = useCallback(
    async (
      initialStage: ScanStage,
      initialStatus: string,
      task: (signal: AbortSignal) => Promise<void>
    ) => {
      if (disabled || controllerRef.current) {
        return;
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      changeBusy(true);
      setScanStage(initialStage);
      setMessage(initialStatus);

      try {
        await task(controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) {
          setScanStage("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível identificar. Tente novamente."
          );
        }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          changeBusy(false);
        }
      }
    },
    [changeBusy, disabled]
  );

  const lookupAndConfirm = useCallback(
    async (
      foundReading: PhotoReading,
      thumbnail: string | null,
      signal: AbortSignal,
      statusNotice?: string
    ) => {
      const query = photoSearchQuery(foundReading);
      if (!query) {
        setScanStage("error");
        setMessage(
          "Não consegui ler título ou ISBN. Enquadre melhor o livro e tente novamente, ou preencha manualmente."
        );
        return;
      }
      setScanStage("searching");
      setMessage(statusNotice ?? "Buscando edições encontradas…");
      const { results, failed } = await searchCatalogs(query, { signal });
      if (signal.aborted) {
        return;
      }
      const nextConfirm: BookConfirmData = {
        candidates: results,
        catalogFailed: failed,
        previewImage: thumbnail,
        reading: foundReading,
      };
      confirmDataRef.current = nextConfirm;
      setMessage("");
      setScannerOpen(false);
      setConfirmData(nextConfirm);
    },
    []
  );

  const recognizeSource = useCallback(
    async (prepare: () => Promise<string>, initialStatus: string) => {
      await runExclusiveTask("recognizing", initialStatus, async (signal) => {
        const image = await prepare();
        if (signal.aborted) {
          return;
        }
        setPreviewImage(image);
        setMessage("Lendo capa ou lombada…");
        const identified = await api.post<PhotoRecognition>(
          "/api/books/recognize",
          { image, model: PHOTO_MODELS[0].value },
          { signal }
        );
        if (signal.aborted) {
          return;
        }
        await lookupAndConfirm(identified.reading, image, signal);
      });
    },
    [lookupAndConfirm, runExclusiveTask]
  );

  const handleBarcode = useCallback(
    (isbn: string, video: HTMLVideoElement) => {
      void runExclusiveTask(
        "searching",
        `Código ISBN ${isbn} detectado — buscando livro…`,
        async (signal) => {
          let thumbnail: string | null = null;
          try {
            thumbnail = captureVideoBookPhoto(video);
          } catch {
            thumbnail = null;
          }
          setPreviewImage(thumbnail);
          await lookupAndConfirm(
            { title: null, author: null, isbn },
            thumbnail,
            signal,
            `Código ISBN ${isbn} detectado — buscando livro…`
          );
        }
      );
    },
    [lookupAndConfirm, runExclusiveTask]
  );

  const handleAutoCapture = useCallback(
    (video: HTMLVideoElement) => {
      void recognizeSource(
        async () => captureVideoBookPhoto(video),
        "Capturando imagem…"
      );
    },
    [recognizeSource]
  );

  const handleLockChange = useCallback((locking: boolean) => {
    setScanStage((cur) => {
      if (locking) {
        return cur === "waiting" ? "locking" : cur;
      }
      return cur === "locking" ? "waiting" : cur;
    });
  }, []);

  const {
    armAutoScan,
    cameraState,
    disarmAutoScan,
    startCamera,
    stopCamera,
    videoRef,
  } = useBookScanner({
    active: scannerOpen,
    busy,
    onAutoCapture: handleAutoCapture,
    onBarcode: handleBarcode,
    onLockChange: handleLockChange,
  });

  useEffect(() => () => controllerRef.current?.abort(), []);

  const closeAll = useCallback(
    (focusForm: boolean) => {
      returnFocusToFormRef.current = focusForm;
      reopeningScannerRef.current = false;
      confirmDataRef.current = null;
      resetScanState();
      stopCamera();
      setScannerOpen(false);
      setConfirmData(null);
    },
    [resetScanState, stopCamera]
  );

  const openScanner = useCallback(() => {
    if (disabled) {
      return;
    }
    returnFocusToFormRef.current = false;
    reopeningScannerRef.current = false;
    confirmDataRef.current = null;
    resetScanState();
    armAutoScan();
    setConfirmData(null);
    setScannerOpen(true);
  }, [armAutoScan, disabled, resetScanState]);

  const retryScan = useCallback(() => {
    reopeningScannerRef.current = true;
    confirmDataRef.current = null;
    resetScanState();
    armAutoScan();
    setConfirmData(null);
    setScannerOpen(true);
  }, [armAutoScan, resetScanState]);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) {
        return;
      }
      disarmAutoScan();
      void recognizeSource(() => prepareBookPhoto(file), "Preparando foto…");
    },
    [disarmAutoScan, recognizeSource]
  );

  const captureNow = useCallback(() => {
    const video = videoRef.current;
    if (!video || cameraState !== "ready") {
      return;
    }
    disarmAutoScan();
    void recognizeSource(
      async () => captureVideoBookPhoto(video),
      "Capturando imagem…"
    );
  }, [cameraState, disarmAutoScan, recognizeSource, videoRef]);

  const highlightFrame =
    scanStage === "locking" ||
    scanStage === "recognizing" ||
    scanStage === "searching";

  return (
    <>
      <Button
        aria-label="Escanear livro"
        className={cn(
          "h-10 shrink-0 rounded-lg px-3.5 text-sm",
          "max-[640px]:col-span-full max-[640px]:h-11 max-[640px]:w-full"
        )}
        disabled={disabled || busy}
        onClick={openScanner}
        ref={triggerRef}
        size="none"
        title="Escanear capa, lombada ou código de barras"
        variant="neutral"
      >
        <ScanLineIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="max-[640px]:hidden">Escanear</span>
        <span className="hidden max-[640px]:inline">
          Escanear capa, lombada ou código
        </span>
      </Button>

      <input
        accept="image/jpeg,image/png,image/webp"
        aria-label="Fotografar capa ou lombada"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={cameraRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/png,image/webp"
        aria-label="Imagem da capa ou lombada"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={fileRef}
        type="file"
      />

      <Modal
        className="max-w-lg"
        description={PHOTO_HELP}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (confirmDataRef.current) {
            return;
          }
          if (returnFocusToFormRef.current) {
            onFocusForm();
          } else {
            triggerRef.current?.focus({ preventScroll: true });
          }
        }}
        onOpenChange={(next) => {
          if (!next) {
            closeAll(false);
          }
        }}
        open={scannerOpen}
        title="Escanear livro"
        veilClassName="z-40 max-[640px]:items-center max-[640px]:p-2"
      >
        <div className="flex flex-col gap-3.5 p-5 max-[640px]:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="m-0 font-bold font-title text-xl leading-tight">
                Escanear livro
              </h2>
              <p className="m-0 text-mute text-xs" id={helpId}>
                {PHOTO_HELP}
              </p>
            </div>
            <ModalClose label="Fechar scanner" />
          </div>

          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-ink text-card max-[640px]:aspect-[4/4.2] dark:bg-bg dark:text-ink">
            <video
              autoPlay
              className={cn(
                "h-full w-full object-cover transition-opacity duration-200",
                cameraState === "ready" ? "opacity-100" : "opacity-0"
              )}
              muted
              playsInline
              ref={videoRef}
            />

            {busy && previewImage ? (
              <Image
                alt="Quadro capturado para leitura do livro"
                className="absolute inset-0 h-full w-full object-cover"
                fill
                src={previewImage}
                unoptimized
              />
            ) : null}

            {cameraState === "ready" ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                <div className="absolute inset-4">
                  {RETICLE_CORNERS.map((cornerClass) => (
                    <span
                      className={cn(
                        "absolute size-6 border-2 transition-colors duration-200",
                        cornerClass,
                        highlightFrame
                          ? "border-ouro"
                          : "border-card/90 dark:border-ink/90"
                      )}
                      key={cornerClass}
                    />
                  ))}
                  {!busy && scanStage !== "error" ? (
                    <span className="absolute inset-x-2 h-0.5 animate-acv-scan rounded-full bg-linear-to-r from-transparent via-card to-transparent shadow-[0_0_12px_rgba(251,248,242,0.85)] dark:via-ink" />
                  ) : null}
                </div>
                <div className="absolute inset-x-3 top-3 flex justify-center">
                  <span className="rounded-full bg-ink/85 px-3 py-1 font-medium text-card text-xs backdrop-blur-xs dark:bg-bg/85 dark:text-ink">
                    {stageLabel(scanStage, message)}
                  </span>
                </div>
              </div>
            ) : null}

            {cameraState === "starting" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center">
                <ScanLineIcon
                  aria-hidden="true"
                  className="size-7 animate-pulse opacity-80"
                />
                <span className="font-medium text-sm">Abrindo câmera…</span>
                <span className="text-xs opacity-75">
                  Você também pode escolher uma imagem da galeria.
                </span>
              </div>
            ) : null}

            {cameraState === "denied" || cameraState === "unavailable" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
                <CameraOffIcon
                  aria-hidden="true"
                  className="size-8 opacity-80"
                />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm">
                    {cameraState === "denied"
                      ? "Permissão da câmera não concedida."
                      : "Câmera ao vivo indisponível neste dispositivo."}
                  </span>
                  <span className="text-xs leading-relaxed opacity-80">
                    Use os botões abaixo para tirar uma foto ou escolher uma
                    imagem da galeria.
                  </span>
                </div>
                <button
                  className="border-0 bg-transparent p-1 font-medium text-current text-xs underline opacity-85 hover:opacity-100"
                  disabled={busy}
                  onClick={() => {
                    armAutoScan();
                    void startCamera();
                  }}
                  type="button"
                >
                  Tentar ativar câmera novamente
                </button>
              </div>
            ) : null}
          </div>

          {busy ? (
            <progress
              aria-label="Identificando livro"
              className="h-2 w-full accent-acc"
            />
          ) : null}

          {message ? (
            <p
              aria-live="polite"
              className={cn(
                "m-0 text-xs leading-relaxed",
                scanStage === "error"
                  ? "rounded-lg border border-acc/40 bg-hov px-3 py-2 font-medium text-acc"
                  : "text-mute"
              )}
              role="status"
            >
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {cameraState === "ready" ? (
              scanStage === "error" ? (
                <Button
                  className="flex-1"
                  disabled={busy || disabled}
                  onClick={retryScan}
                  size="lg"
                  variant="primary"
                >
                  <RotateCcwIcon
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                  Escanear novamente
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  disabled={busy || disabled}
                  onClick={captureNow}
                  size="lg"
                  variant="primary"
                >
                  <ScanLineIcon
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                  Escanear agora
                </Button>
              )
            ) : cameraState === "denied" || cameraState === "unavailable" ? (
              <Button
                className="flex-1"
                disabled={busy || disabled}
                onClick={() => cameraRef.current?.click()}
                size="lg"
                variant="primary"
              >
                <CameraIcon aria-hidden="true" className="size-4 shrink-0" />
                Tirar foto
              </Button>
            ) : null}
            <Button
              className={cn(cameraState === "starting" && "flex-1")}
              disabled={busy || disabled}
              onClick={() => fileRef.current?.click()}
              size="lg"
              variant="neutral"
            >
              <ImageIcon aria-hidden="true" className="size-4 shrink-0" />
              Escolher imagem
            </Button>
            <Button
              className="w-full justify-center text-mute"
              onClick={() => closeAll(true)}
              size="sm"
              variant="ghost"
            >
              Preencher manualmente
            </Button>
          </div>

          <p className="m-0 border-soft border-t pt-2.5 text-mute text-xs leading-relaxed">
            Ao analisar a imagem, ela é enviada automaticamente ao OpenRouter e
            ao provedor do modelo. O app não salva a foto.{" "}
            {PHOTO_NOTICES[photoDataCollection]}
          </p>
        </div>
      </Modal>

      <BookConfirmModal
        data={confirmData}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (reopeningScannerRef.current) {
            reopeningScannerRef.current = false;
            return;
          }
          if (returnFocusToFormRef.current) {
            onFocusForm();
          } else {
            triggerRef.current?.focus({ preventScroll: true });
          }
        }}
        onManual={() => closeAll(true)}
        onRetry={retryScan}
        onSelect={(selected, foundReading) => {
          onSelectBook(selected, foundReading);
          closeAll(true);
        }}
        onUseReading={(foundReading) => {
          onUseReading(foundReading);
          closeAll(true);
        }}
      />
    </>
  );
}
