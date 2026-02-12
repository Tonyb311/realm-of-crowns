import { useState, FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-realm-bg-900 flex items-center justify-center">
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
    <div className="min-h-screen bg-realm-bg-900 flex items-center justify-center px-6">
      <div className="fixed inset-0 bg-realm-vignette pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-realm-bg-700 border border-realm-gold-500/30 rounded-lg shadow-realm-panel p-8 bg-realm-panel-gradient">
        <h1 className="font-display text-2xl text-realm-text-gold text-center mb-8 tracking-wide">
          Return to the Realm
        </h1>

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

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-b from-realm-gold-400 to-realm-gold-500 text-realm-bg-900 font-display uppercase tracking-wider text-lg rounded hover:shadow-realm-glow-strong transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Entering...' : 'Enter'}
          </button>
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
