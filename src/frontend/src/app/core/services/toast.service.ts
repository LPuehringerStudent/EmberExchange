import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  durationMs: number;
  progress: number;
}

let nextToastId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(
    type: Toast['type'],
    title: string,
    message?: string,
    durationMs: number = 4000
  ): void {
    const id = nextToastId++;
    const toast: Toast = { id, type, title, message, durationMs, progress: 100 };

    this.toasts.update(list => [...list, toast]);

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const remaining = Math.max(0, durationMs - elapsed);
      const progress = (remaining / durationMs) * 100;

      this.toasts.update(list =>
        list.map(t => (t.id === id ? { ...t, progress } : t))
      );

      if (remaining > 0) {
        requestAnimationFrame(tick);
      } else {
        this.remove(id);
      }
    };

    requestAnimationFrame(tick);
  }

  remove(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  error(title: string, message?: string): void {
    this.show('error', title, message, 6000);
  }

  info(title: string, message?: string): void {
    this.show('info', title, message);
  }

  warning(title: string, message?: string): void {
    this.show('warning', title, message, 5000);
  }
}
