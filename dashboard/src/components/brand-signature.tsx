function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 1c.8 6.2 4.8 10.2 11 11-6.2.8-10.2 4.8-11 11-.8-6.2-4.8-10.2-11-11 6.2-.8 10.2-4.8 11-11Z" />
    </svg>
  );
}

export default function BrandSignature() {
  return (
    <div className="relative mt-5 flex select-none flex-col items-center">
      <span
        aria-hidden
        className="flex w-full items-center justify-center gap-2"
      >
        <span className="h-px max-w-16 flex-1 bg-gradient-to-r from-transparent to-primary/40" />
        <Sparkle className="h-2.5 w-2.5 shrink-0 text-primary/60" />
        <span className="h-px max-w-16 flex-1 bg-gradient-to-l from-transparent to-primary/40" />
      </span>
      <p className="mt-4 pl-[0.24em] text-[10px] font-semibold uppercase tracking-[0.24em] text-soft">
        Powered by
      </p>
      <p className="mt-1 pl-[0.18em] text-[10px] font-bold uppercase leading-none tracking-[0.18em] text-soft">
        Amiril<span className="text-primary-hover">&nbsp;M</span>
      </p>
    </div>
  );
}
