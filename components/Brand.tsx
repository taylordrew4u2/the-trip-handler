import Image from "next/image";

export function Brand({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/logo-icon.svg"
        width={40}
        height={40}
        alt=""
        className={`${compact ? "size-8" : "size-9 sm:size-10"} shrink-0`}
      />
      <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
        The Trip Handler
      </span>
    </span>
  );
}
