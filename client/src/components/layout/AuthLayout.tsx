import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-realm-bg-900 bg-realm-vignette">
      <Outlet />
    </div>
  );
}
