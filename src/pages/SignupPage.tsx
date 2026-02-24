import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './SignupPage.css';

function SignupPage() {
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
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-card">
          <div className="animate-pulse text-center">
            <p>Redirecting to sign up...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
