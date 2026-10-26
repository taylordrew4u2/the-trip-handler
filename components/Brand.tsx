import Image from "next/image";

export function Brand({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`flex min-w-0 items-center ${compact ? "w-40" : "w-44 sm:w-52"} ${className}`}>
      <Image
        src="/brand/logo.svg"
        width={800}
        height={160}
        alt="The Trip Handler"
        className="h-auto w-full"
      />
    </span>
  );
}
