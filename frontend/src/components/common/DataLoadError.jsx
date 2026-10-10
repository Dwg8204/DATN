import { AlertCircle } from 'lucide-react';

export default function DataLoadError({ title = 'Unable to load this content', message }) {
  return (
    <div role="status" className="mx-auto my-8 flex w-full max-w-2xl items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-5 text-red-800">
      <AlertCircle size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        <p className="mb-0 mt-2 break-words text-sm leading-6">{message}</p>
      </div>
    </div>
  );
}
