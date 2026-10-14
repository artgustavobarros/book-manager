"use client";

import { useRef } from "react";

/**
 * Arraste com mouse numa faixa com rolagem horizontal livre (os chips da Estante):
 * toque e trackpad já rolam nativamente; aqui o botão esquerdo do mouse arrasta, o snap
 * fica desligado durante o arraste e o clique que encerra um arraste é descartado.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const moved = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) {
      return;
    }
    if (el.scrollWidth <= el.clientWidth) {
      return;
    }
    const sx = e.clientX;
    const sl = el.scrollLeft;
    moved.current = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      if (!moved.current && Math.abs(dx) > 4) {
        moved.current = true;
        el.dataset.dragging = "true";
      }
      if (moved.current) {
        el.scrollLeft = sl - dx;
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      delete el.dataset.dragging;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current) {
      e.stopPropagation();
      e.preventDefault();
      moved.current = false;
    }
  };

  // Sem isso o navegador inicia o arraste nativo de seleção/imagem.
  const onDragStart = (e: React.DragEvent) => e.preventDefault();

  return { ref, onPointerDown, onClickCapture, onDragStart };
}
