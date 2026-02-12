export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rotate-45 border-2 border-realm-gold-400/60 animate-spin" />
        <p className="font-display text-sm text-realm-text-muted tracking-wider">
          Loading...
        </p>
      </div>
    </div>
  );
}
