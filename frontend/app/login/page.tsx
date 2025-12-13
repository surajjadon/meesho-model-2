"use client";

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth, api } from '../../providers/GlobalProvider';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // =================== THE FIX IS HERE ===================
      // The path should ONLY be what comes AFTER /api
      const { data } = await api.post('/auth/login', { email, password });
      // =======================================================

      login(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Login to Your Account</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}><label htmlFor="email">Email Address</label><input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input}/></div>
          <div style={styles.inputGroup}><label htmlFor="password">Password</label><input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input}/></div>
          <button type="submit" disabled={loading} style={styles.button}>{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <p style={styles.linkText}>Don't have an account? <Link href="/register" style={styles.link}>Register here</Link></p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' },
  formWrapper: { padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '400px' },
  inputGroup: { marginBottom: '20px' },
  input: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' },
  button: { width: '100%', padding: '12px', borderRadius: '4px', border: 'none', backgroundColor: '#5c67f2', color: 'white', cursor: 'pointer', fontSize: '16px' },
  error: { color: 'red', marginBottom: '15px', textAlign: 'center' },
  linkText: { marginTop: '20px', textAlign: 'center' },
  link: { color: '#5c67f2', textDecoration: 'none' }
};

export default LoginPage;