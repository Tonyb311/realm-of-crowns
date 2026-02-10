export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-500">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-parchment-300 font-display text-lg">Loading...</p>
      </div>
    </div>
  );
}
