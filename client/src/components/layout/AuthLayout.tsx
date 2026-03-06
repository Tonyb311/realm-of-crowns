import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-realm-bg-900 relative overflow-hidden">
      {/* Atmospheric background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[150px] opacity-30"
          style={{ background: 'radial-gradient(ellipse, rgba(80,40,140,0.4), transparent)' }}
        />
      </div>
      {/* Vignette */}
      <div className="absolute inset-0 bg-realm-vignette pointer-events-none" />
      {/* Content */}
      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
