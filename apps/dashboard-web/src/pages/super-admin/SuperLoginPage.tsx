import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useSuperAuth } from '../../contexts/SuperAuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function SuperLoginPage() {
  const { admin, login } = useSuperAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (admin) return <Navigate to="/super" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); }
    catch (err: any) { setError(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">SA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SUPER ADMIN LOGIN PAGE</h1>
          <p className="text-sm text-gray-500 mt-1">Platform management portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@pos.com" required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required />
          <Button type="submit" disabled={loading} className="w-full">{loading ? 'Signing in...' : 'Sign In'}</Button>
        </form>
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 mb-1">Demo credentials:</p>
          <p className="text-xs text-gray-600">admin@pos.com / admin123</p>
        </div>
      </div>
    </div>
  );
}
