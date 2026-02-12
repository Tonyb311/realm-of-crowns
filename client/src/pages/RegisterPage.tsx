import { useState, FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  function validate(): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (username.length < 3 || username.length > 20) {
      return 'Username must be between 3 and 20 characters.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await register(email, username, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-realm-bg-900 flex items-center justify-center px-6">
      <div className="fixed inset-0 bg-realm-vignette pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-realm-bg-700 border border-realm-gold-500/30 rounded-lg shadow-realm-panel p-8 bg-realm-panel-gradient">
        <h1 className="font-display text-2xl text-realm-text-gold text-center mb-8 tracking-wide">
          Forge Your Identity
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label htmlFor="username" className="block text-sm font-body text-realm-text-secondary mb-1">
              Username
              <span className="text-realm-text-muted ml-1">(3-20 characters)</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary placeholder-realm-text-muted focus:border-realm-gold-500/50 focus:shadow-realm-glow focus:outline-none font-body transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-body text-realm-text-secondary mb-1">
              Password
              <span className="text-realm-text-muted ml-1">(min 8 characters)</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary placeholder-realm-text-muted focus:border-realm-gold-500/50 focus:shadow-realm-glow focus:outline-none font-body transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-body text-realm-text-secondary mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? 'Forging...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-realm-text-secondary text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-realm-gold-400 hover:text-realm-gold-300 transition-colors">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
