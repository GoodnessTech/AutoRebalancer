import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

let pushToastFn: ((kind: ToastKind, message: string) => void) | null = null;

export function toast(kind: ToastKind, message: string) {
  pushToastFn?.(kind, message);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    pushToastFn = pushToast;
    return () => {
      pushToastFn = null;
    };
  }, [pushToast]);

  const remove = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <AlertCircle className="w-5 h-5 text-orange-500" />,
  };

  const borders = {
    success: 'border-green-200',
    error: 'border-red-200',
    info: 'border-orange-200',
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 bg-white rounded-xl shadow-lg border ${borders[t.kind]} px-4 py-3 animate-[slideIn_0.2s_ease-out]`}
        >
          {icons[t.kind]}
          <p className="text-sm text-gray-800 flex-1 leading-snug">{t.message}</p>
          <button
            onClick={() => remove(t.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
