import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/auth.api.js'
import { useAuthStore } from '../store/auth.store.js'
import { clsx } from 'clsx'

export function RegisterPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore(s => s.setUser)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await register(username, email, password)
      setUser(user)
      navigate('/app')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-elevated rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create an account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={clsx(
                'w-full bg-bg-primary rounded-md px-3 py-2.5 text-text-primary text-sm',
                'border border-surface focus:border-brand outline-none transition-colors'
              )}
              required
              minLength={2}
              maxLength={32}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={clsx(
                'w-full bg-bg-primary rounded-md px-3 py-2.5 text-text-primary text-sm',
                'border border-surface focus:border-brand outline-none transition-colors'
              )}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={clsx(
                'w-full bg-bg-primary rounded-md px-3 py-2.5 text-text-primary text-sm',
                'border border-surface focus:border-brand outline-none transition-colors'
              )}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-red-dnd text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={clsx(
              'w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-md',
              'transition-colors text-sm mt-2',
              loading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {loading ? 'Creating account...' : 'Continue'}
          </button>
        </form>

        <p className="text-text-muted text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  )
}
