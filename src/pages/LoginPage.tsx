import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/api/login';
    }
  }, [user, loading]);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="animate-pulse text-center">
            <p>Redirecting to login...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
