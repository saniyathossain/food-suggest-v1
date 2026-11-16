// Uploads to the media library with live progress (XHR upload events: fetch cannot report them).
import { useCallback, useEffect, useState } from 'react';

export type UploadState = 'uploading' | 'done' | 'error';
export interface Upload { id: string; name: string; preview: string; progress: number; state: UploadState; message: string }

function upload(file: File, token: string, onProgress: (ratio: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/v1/admin/media/upload');
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      try {
        const body = JSON.parse(request.responseText) as { error?: string; fields?: Record<string, string> };
        reject(new Error(Object.values(body.fields ?? {}).join(', ') || body.error || request.statusText));
      } catch {
        reject(new Error(request.status === 413 ? 'Too large' : request.statusText));
      }
    };
    request.onerror = () => reject(new Error('Network error'));
    const form = new FormData();
    form.append('file', file);
    form.append('alt_en', file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '));
    request.send(form);
  });
}

export function useUploads(token: string, onUploaded: () => void) {
  const [items, setItems] = useState<Upload[]>([]);
  const patch = (id: string, change: Partial<Upload>) => setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));
  const start = useCallback(
    (files: File[]) => {
      for (const file of files.slice(0, 12)) {
        const id = `${file.name}-${file.size}-${crypto.randomUUID()}`;
        setItems((list) => [{ id, name: file.name, preview: URL.createObjectURL(file), progress: 0, state: 'uploading', message: '' }, ...list]);
        upload(file, token, (ratio) => patch(id, { progress: ratio }))
          .then(() => {
            patch(id, { state: 'done', progress: 1 });
            onUploaded();
          })
          .catch((error: unknown) => patch(id, { state: 'error', message: error instanceof Error ? error.message : String(error) }));
      }
    },
    [token, onUploaded],
  );
  const dismiss = (id: string) =>
    setItems((list) => {
      list.filter((item) => item.id === id).forEach((item) => URL.revokeObjectURL(item.preview));
      return list.filter((item) => item.id !== id);
    });
  // paste an image anywhere on the admin page
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'));
      if (files.length > 0) start(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [start]);
  return { items, start, dismiss };
}
