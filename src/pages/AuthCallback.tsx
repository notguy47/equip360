import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const pending = localStorage.getItem('pending_invite_token');
    if (pending) {
      localStorage.removeItem('pending_invite_token');
      navigate(`/invite/${pending}`, { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="animate-pulse text-gold text-xl mb-2">Completing login...</div>
      </div>
    </div>
  );
}
