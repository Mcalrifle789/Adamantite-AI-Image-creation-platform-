'use client';

import { useCallback, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent } from 'react';

import {
  MAX_ATTACHMENTS,
  describeRejections,
  readAttachment,
  validateFiles,
  type AttachmentRejection,
  type PromptAttachment,
} from './attachments';

export interface UsePromptAttachmentsOptions {
  max?: number;
  /** Called with a human sentence whenever files are refused, so the host can surface it in
   * whatever status line it already owns rather than this hook inventing a second one. */
  onRejected?: (message: string) => void;
}

export interface DropZoneProps {
  onDragEnter: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
}

export interface UsePromptAttachments {
  attachments: PromptAttachment[];
  setAttachments: (next: PromptAttachment[]) => void;
  /** True while a drag is over the drop zone — drives the "drop to attach" affordance. */
  dragging: boolean;
  addFiles: (files: FileList | readonly File[] | null) => Promise<void>;
  remove: (id: string) => void;
  clear: () => void;
  /** Spread onto the element that should accept drops (the composer, not the whole page). */
  dropZoneProps: DropZoneProps;
  /** Spread onto the text input so images on the clipboard attach on ⌘/Ctrl+V. */
  onPaste: (event: ClipboardEvent) => void;
  remaining: number;
  isFull: boolean;
}

/**
 * Attachment state for a prompt box: file picking, drag-and-drop, and clipboard paste, sharing
 * one set of validation rules and one limit.
 */
export function usePromptAttachments(options: UsePromptAttachmentsOptions = {}): UsePromptAttachments {
  const { max = MAX_ATTACHMENTS, onRejected } = options;
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [dragging, setDragging] = useState(false);

  // `dragenter`/`dragleave` fire again for every descendant the pointer crosses, so a naive
  // boolean flickers as the cursor moves over the input, the button, the chips… Counting the
  // enters and leaves is what makes the highlight stable.
  const dragDepth = useRef(0);

  // Read from a ref inside `addFiles` so the callback does not need `attachments` as a dep and
  // therefore stays referentially stable across renders.
  const attachmentsRef = useRef<PromptAttachment[]>([]);
  attachmentsRef.current = attachments;

  const report = useCallback(
    (rejected: AttachmentRejection[]) => {
      const message = describeRejections(rejected);
      if (message && onRejected) onRejected(message);
    },
    [onRejected],
  );

  const addFiles = useCallback(
    async (files: FileList | readonly File[] | null) => {
      if (!files) return;
      const list = Array.from(files as ArrayLike<File>);
      if (!list.length) return;

      const current = attachmentsRef.current;
      const { accepted, rejected } = validateFiles(list, Math.max(0, max - current.length));
      report(rejected);
      if (!accepted.length) return;

      const settled = await Promise.allSettled(accepted.map(readAttachment));
      const read: PromptAttachment[] = [];
      const unreadable: AttachmentRejection[] = [];
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') read.push(result.value);
        else unreadable.push({ name: accepted[index]!.name, reason: 'could not be read' });
      });
      report(unreadable);
      if (!read.length) return;

      // Re-read the ref: an await happened, so another drop may have landed meanwhile.
      setAttachments([...attachmentsRef.current, ...read].slice(0, max));
    },
    [max, report],
  );

  const remove = useCallback((id: string) => {
    setAttachments((previous) => previous.filter((attachment) => attachment.id !== id));
  }, []);

  const clear = useCallback(() => setAttachments([]), []);

  const onDragEnter = useCallback((event: DragEvent) => {
    if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
    // Without this the browser navigates to the dropped file instead of firing `onDrop`.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDragLeave = useCallback((event: DragEvent) => {
    if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      void addFiles(event.dataTransfer?.files ?? null);
    },
    [addFiles],
  );

  const onPaste = useCallback(
    (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const files = items
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (!files.length) return;
      // Only swallow the paste when it actually carried an image — a normal text paste must
      // still land in the input.
      event.preventDefault();
      void addFiles(files);
    },
    [addFiles],
  );

  return {
    attachments,
    setAttachments,
    dragging,
    addFiles,
    remove,
    clear,
    dropZoneProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
    onPaste,
    remaining: Math.max(0, max - attachments.length),
    isFull: attachments.length >= max,
  };
}
