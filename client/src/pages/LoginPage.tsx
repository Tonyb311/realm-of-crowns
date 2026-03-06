import { useState, FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RealmButton } from '../components/ui/realm-index';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-realm-gold-400 font-display text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link
        to="/"
        className="font-display text-3xl text-realm-gold-400 tracking-wider mb-8"
        style={{ textShadow: '0 0 30px rgba(212, 168, 67, 0.25)' }}
      >
        Realm of Crowns
      </Link>
      <div className="relative z-10 w-full max-w-md bg-realm-bg-700 border border-realm-border rounded-lg shadow-realm-panel p-8 bg-realm-panel-gradient">
        <h2 className="font-display text-xl text-realm-text-gold text-center mb-8 tracking-wide">
          Return to the Realm
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-body text-realm-text-secondary mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary placeholder-realm-text-muted focus:border-realm-gold-500/50 focus:shadow-realm-glow focus:outline-none font-body transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-body text-realm-text-secondary mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary placeholder-realm-text-muted focus:border-realm-gold-500/50 focus:shadow-realm-glow focus:outline-none font-body transition-all duration-200"
            />
          </div>

          {error && (
            <p className="text-realm-danger text-sm">{error}</p>
          )}

          <RealmButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Entering...' : 'Enter'}
          </RealmButton>
        </form>

        <p className="mt-6 text-center text-realm-text-secondary text-sm">
          New to the realm?{' '}
          <Link to="/register" className="text-realm-gold-400 hover:text-realm-gold-300 transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
