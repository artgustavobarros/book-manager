"use client";

import { CameraIcon, ImageIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { useApp } from "@/components/app/app-provider";
import { Button } from "@/components/ui/button";
import { Modal, ModalClose } from "@/components/ui/dialog";
import { api } from "@/lib/client/api";
import { prepareBookPhoto } from "@/lib/client/book-photo";
import {
  PHOTO_MODELS,
  type PhotoReading,
  type PhotoRecognition,
  photoSearchQuery,
} from "@/lib/domain/book-photo";

const PHOTO_NOTICES = {
  allow:
    "Neste ambiente, o provedor pode guardar a foto e usá-la para treinamento. Use apenas capas públicas, sem pessoas ou dados pessoais.",
  deny: "Solicitamos provedores sem coleta para treinamento; a retenção segue a política do provedor.",
};

const PHOTO_HELP =
  "Um livro por foto, com título e autor legíveis na capa ou lombada. JPEG, PNG ou WebP, até 20 MB. A foto será reduzida antes do envio.";

export function BookPhotoSearch({
  disabled,
  onBusyChange,
  onRecognized,
  onFocusForm,
}: {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onRecognized: (reading: PhotoReading) => void;
  onFocusForm: () => void;
}) {
  const { photoDataCollection } = useApp();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<{ image: string; name: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const recognizedRef = useRef(false);
  const helpId = useId();

  useEffect(() => () => controllerRef.current?.abort(), []);

  function changeBusy(value: boolean) {
    setBusy(value);
    onBusyChange(value);
  }

  function changeOpen(value: boolean) {
    recognizedRef.current = false;
    controllerRef.current?.abort();
    controllerRef.current = null;
    changeBusy(false);
    setPhoto(null);
    setMessage("");
    setOpen(value);
  }

  async function choose(file: File | undefined) {
    if (!file || disabled || controllerRef.current) {
      return;
    }
    recognizedRef.current = false;
    setOpen(true);
    const controller = new AbortController();
    controllerRef.current = controller;
    changeBusy(true);
    setPhoto(null);
    setMessage("Preparando foto…");
    try {
      const image = await prepareBookPhoto(file);
      if (controller.signal.aborted) {
        return;
      }
      setPhoto({ image, name: file.name });
      setMessage("Lendo capa ou lombada…");
      const identified = await api.post<PhotoRecognition>(
        "/api/books/recognize",
        { image, model: PHOTO_MODELS[0].value },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) {
        return;
      }
      if (!photoSearchQuery(identified.reading)) {
        setMessage(
          "Não consegui ler título ou ISBN. Tente uma foto mais nítida de um único livro ou use a busca manual."
        );
        return;
      }
      recognizedRef.current = true;
      onRecognized(identified.reading);
      setOpen(false);
      setPhoto(null);
      setMessage("");
    } catch (error) {
      if (!controller.signal.aborted) {
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
  }

  return (
    <>
      <Button
        aria-describedby={helpId}
        aria-label="Identificar por foto"
        className="pointer-coarse:size-11 size-10 shrink-0 rounded-lg"
        disabled={disabled || busy}
        onClick={() => {
          if (window.matchMedia("(pointer: coarse)").matches) {
            cameraRef.current?.click();
          } else {
            changeOpen(true);
          }
        }}
        ref={triggerRef}
        size="none"
        title="Identificar por foto"
        variant="neutral"
      >
        <CameraIcon aria-hidden="true" className="size-4" />
      </Button>
      <div className="col-span-full pointer-coarse:flex hidden flex-col items-start gap-2">
        <Button
          aria-describedby={helpId}
          className="min-h-11"
          disabled={disabled || busy}
          onClick={() => fileRef.current?.click()}
          variant="link"
        >
          Escolher imagem
        </Button>
        <p className="text-mute text-xs leading-relaxed" id={helpId}>
          {PHOTO_HELP} Ao escolher ou tirar uma foto, ela será enviada
          automaticamente ao OpenRouter e ao provedor do modelo. O app não salva
          a foto. {PHOTO_NOTICES[photoDataCollection]}
        </p>
      </div>
      <input
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={open ? `${helpId}-dialog` : helpId}
        aria-label="Fotografar capa ou lombada"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={cameraRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={open ? `${helpId}-dialog` : helpId}
        aria-label="Imagem da capa ou lombada"
        className="hidden"
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={fileRef}
        type="file"
      />
      <Modal
        className="max-w-md"
        description={PHOTO_HELP}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (recognizedRef.current) {
            onFocusForm();
          } else {
            triggerRef.current?.focus({ preventScroll: true });
          }
        }}
        onOpenChange={changeOpen}
        open={open}
        title="Identificar por foto"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-lg">Identificar por foto</h2>
            <ModalClose label="Fechar identificação por foto" />
          </div>
          <p
            className="text-mute text-sm leading-relaxed"
            id={`${helpId}-dialog`}
          >
            {PHOTO_HELP}
          </p>
          <p className="text-mute text-xs leading-relaxed">
            Ao escolher ou tirar uma foto, ela será enviada automaticamente ao
            OpenRouter e ao provedor do modelo. O app não salva a foto.{" "}
            {PHOTO_NOTICES[photoDataCollection]}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || disabled}
              onClick={() => cameraRef.current?.click()}
              size="lg"
              variant="neutral"
            >
              <CameraIcon
                aria-hidden="true"
                className="size-4"
                data-icon="inline-start"
              />
              Tirar foto
            </Button>
            <Button
              disabled={busy || disabled}
              onClick={() => fileRef.current?.click()}
              size="lg"
              variant="neutral"
            >
              <ImageIcon
                aria-hidden="true"
                className="size-4"
                data-icon="inline-start"
              />
              Escolher imagem
            </Button>
          </div>
          {photo ? (
            <div className="flex min-w-0 items-center gap-3">
              <Image
                alt="Foto escolhida para identificar o livro"
                className="h-24 w-20 shrink-0 rounded object-contain"
                height={96}
                src={photo.image}
                unoptimized
                width={80}
              />
              <span className="min-w-0 break-all text-mute text-xs">
                {photo.name}
              </span>
            </div>
          ) : null}
          {busy ? (
            <progress
              aria-label="Identificando livro"
              className="h-2 w-full accent-acc"
            />
          ) : null}
          <p
            aria-live="polite"
            className="text-mute text-sm leading-relaxed"
            role="status"
          >
            {message}
          </p>
        </div>
      </Modal>
    </>
  );
}
