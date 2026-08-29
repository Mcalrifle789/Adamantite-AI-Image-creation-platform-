/**
 * Reference-image attachments for the two prompt boxes — the landing "create something…" field
 * and the workspace composer. Browser-only (uses `FileReader` / `createImageBitmap`), so every
 * consumer is a client component.
 *
 * Shape note: `lib/server/providers/types.ts`'s `GenerationRequest` currently declares a *single*
 * `params.sourceAsset` for `mode: 'edit'`. The tray here accepts up to `MAX_ATTACHMENTS`, so
 * whoever wires the real `/api/generate` route has to either widen that field or cap the request
 * at the first attachment. `toWireAttachments()` below is the boundary where that decision lands.
 */

/** What the models can actually be conditioned on. Deliberately not `image/*`: `image/svg+xml`
 * is an image to the browser but a script container to a provider, and `image/heic` is not
 * decodable by `createImageBitmap` in any current browser. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

export const MAX_ATTACHMENTS = 4;
export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
export const THUMB_MAX_PX = 96;

/** Landing → workspace handoff. `sessionStorage`, not `localStorage`: these are one-trip payloads
 * and they are large, so they must not outlive the tab. */
export const HANDOFF_KEY = 'ada.prompt.attachments';
/** sessionStorage is ~5 MB in every current browser and base64 inflates bytes by ~33%. Staying
 * under 3 MB of serialised JSON keeps the handoff from throwing `QuotaExceededError`. */
export const HANDOFF_MAX_BYTES = 3 * 1024 * 1024;

export interface PromptAttachment {
  id: string;
  name: string;
  mimeType: string;
  /** Bytes of the original file, before base64. */
  size: number;
  /** Full-resolution data URL — what a provider would receive as its source asset. */
  dataUrl: string;
  /** ≤96px data URL. Small enough (~2-5 kB) to persist alongside generation history without
   * blowing the localStorage quota, which the full `dataUrl` absolutely would. */
  thumbUrl: string;
  width?: number;
  height?: number;
}

export interface AttachmentRejection {
  name: string;
  reason: string;
}

export interface ValidationResult {
  accepted: File[];
  rejected: AttachmentRejection[];
}

function isAcceptedType(type: string): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Split an incoming drop/pick into what we will take and what we will not, with a reason per
 * rejection. Pure — no DOM, no async — so the rules are testable on their own.
 *
 * `remainingSlots` is what is left of `MAX_ATTACHMENTS` after the already-attached ones.
 */
export function validateFiles(files: readonly File[], remainingSlots: number): ValidationResult {
  const accepted: File[] = [];
  const rejected: AttachmentRejection[] = [];

  for (const file of files) {
    if (!isAcceptedType(file.type)) {
      rejected.push({ name: file.name, reason: 'not a supported image (PNG, JPEG, WebP, GIF, AVIF)' });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      rejected.push({ name: file.name, reason: `larger than ${formatBytes(MAX_FILE_BYTES)}` });
      continue;
    }
    if (accepted.length >= remainingSlots) {
      rejected.push({ name: file.name, reason: `over the ${MAX_ATTACHMENTS}-reference limit` });
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected };
}

/** One human sentence summarising a batch of rejections, for the status line. */
export function describeRejections(rejected: readonly AttachmentRejection[]): string | null {
  if (!rejected.length) return null;
  if (rejected.length === 1) {
    const only = rejected[0]!;
    return `${only.name} was skipped — ${only.reason}.`;
  }
  return `${rejected.length} files were skipped — ${rejected[0]!.reason}, and others.`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscale to `THUMB_MAX_PX` on the long edge. Returns `null` when the environment cannot
 * decode images off the main thread (jsdom, and any browser without `createImageBitmap`), in
 * which case the caller falls back to the full data URL for display.
 */
async function makeThumbnail(
  file: File,
): Promise<{ thumbUrl: string; width: number; height: number } | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    const scale = Math.min(1, THUMB_MAX_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // JPEG, not PNG: a 96px PNG of a photo is ~10x larger, and this only ever backs a thumbnail.
    return { thumbUrl: canvas.toDataURL('image/jpeg', 0.7), width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

function newAttachmentId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function readAttachment(file: File): Promise<PromptAttachment> {
  const dataUrl = await readAsDataUrl(file);
  const thumb = await makeThumbnail(file);
  return {
    id: newAttachmentId(),
    name: file.name,
    mimeType: file.type,
    size: file.size,
    dataUrl,
    thumbUrl: thumb?.thumbUrl ?? dataUrl,
    width: thumb?.width,
    height: thumb?.height,
  };
}

/** Everything an attachment contributes to a generation request. The full `dataUrl` is here and
 * the thumbnail is not — the thumbnail is a UI concern and never goes upstream. */
export interface WireAttachment {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export function toWireAttachments(attachments: readonly PromptAttachment[]): WireAttachment[] {
  return attachments.map(({ name, mimeType, size, dataUrl }) => ({ name, mimeType, size, dataUrl }));
}

/** The attachment fields worth keeping in persisted generation history: thumbnail only, so a
 * gallery of 24 generations cannot exhaust the localStorage quota. */
export type HistoryAttachment = Pick<PromptAttachment, 'id' | 'name' | 'thumbUrl'>;

export function toHistoryAttachments(attachments: readonly PromptAttachment[]): HistoryAttachment[] {
  return attachments.map(({ id, name, thumbUrl }) => ({ id, name, thumbUrl }));
}

/**
 * The landing → workspace handoff payload. `intended` is how many references the user actually
 * attached, which can exceed `attachments.length` when the quota cut the batch short. Carrying
 * the original count is what lets the workspace *say* something was left behind instead of the
 * user discovering it themselves.
 */
export interface AttachmentHandoff {
  intended: number;
  attachments: PromptAttachment[];
}

/**
 * Stash attachments for the jump to the workspace. Files cannot ride in a query string, and
 * sessionStorage has a hard quota, so this fills up to `HANDOFF_MAX_BYTES` in order and reports
 * how many made it. Navigation is never blocked by a reference being too large — the user is
 * told what was left behind and can re-attach it on the other side.
 */
export function stashAttachments(attachments: readonly PromptAttachment[]): { stashed: number } {
  if (typeof window === 'undefined' || !attachments.length) return { stashed: 0 };

  const fitting: PromptAttachment[] = [];
  for (const attachment of attachments) {
    const candidate: AttachmentHandoff = { intended: attachments.length, attachments: [...fitting, attachment] };
    if (JSON.stringify(candidate).length > HANDOFF_MAX_BYTES) break;
    fitting.push(attachment);
  }

  try {
    if (!fitting.length) {
      window.sessionStorage.removeItem(HANDOFF_KEY);
      return { stashed: 0 };
    }
    const payload: AttachmentHandoff = { intended: attachments.length, attachments: fitting };
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
    return { stashed: fitting.length };
  } catch {
    return { stashed: 0 };
  }
}

/** Read and immediately clear the handoff — a refresh of the workspace must not re-attach. */
export function takeStashedAttachments(): AttachmentHandoff {
  const empty: AttachmentHandoff = { intended: 0, attachments: [] };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    window.sessionStorage.removeItem(HANDOFF_KEY);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return empty;
    const envelope = parsed as Partial<AttachmentHandoff>;
    if (!Array.isArray(envelope.attachments)) return empty;
    const attachments = envelope.attachments.filter(
      (item): item is PromptAttachment =>
        typeof item === 'object' && item !== null && typeof (item as PromptAttachment).dataUrl === 'string',
    );
    return {
      intended: typeof envelope.intended === 'number' ? envelope.intended : attachments.length,
      attachments,
    };
  } catch {
    return empty;
  }
}
