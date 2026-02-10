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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary-400 font-display text-2xl animate-pulse">Loading...</div>
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
    <div className="flex items-center justify-center min-h-screen bg-dark-500 px-4">
      <div className="w-full max-w-md bg-dark-300 border border-primary-700 rounded-lg p-8">
        <h1 className="text-3xl font-display text-primary-400 text-center mb-8">
          Forge Your Identity
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label htmlFor="username" className="block text-sm font-body text-parchment-200 mb-1">
              Username
              <span className="text-parchment-500 ml-1">(3-20 characters)</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className="w-full px-3 py-2 bg-dark-400 border border-dark-50 text-parchment-200 rounded focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-body text-parchment-200 mb-1">
              Password
              <span className="text-parchment-500 ml-1">(min 8 characters)</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 bg-dark-400 border border-dark-50 text-parchment-200 rounded focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-body text-parchment-200 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? 'Forging...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-parchment-300 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
