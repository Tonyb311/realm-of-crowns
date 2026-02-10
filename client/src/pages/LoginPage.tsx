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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary-400 font-display text-2xl animate-pulse">Loading...</div>
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
    <div className="flex items-center justify-center min-h-screen bg-dark-500 px-4">
      <div className="w-full max-w-md bg-dark-300 border border-primary-700 rounded-lg p-8">
        <h1 className="text-3xl font-display text-primary-400 text-center mb-8">
          Enter the Realm
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-body text-parchment-200 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-dark-400 border border-dark-50 text-parchment-200 rounded focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-body text-parchment-200 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-dark-400 border border-dark-50 text-parchment-200 rounded focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary-400 text-dark-500 font-display text-lg rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Entering...' : 'Enter'}
          </button>
        </form>

        <p className="mt-6 text-center text-parchment-300 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 transition-colors">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
