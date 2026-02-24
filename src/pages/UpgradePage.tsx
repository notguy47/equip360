import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import './UpgradePage.css';

export default function UpgradePage() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (profile?.account_type === 'admin') {
    return (
      <div className="upgrade-page">
        <div className="upgrade-container">
          <div className="upgrade-card">
            <div className="upgrade-icon">✓</div>
            <h1>You're Already an Admin</h1>
            <p className="upgrade-subtitle">
              You already have full admin privileges and can create teams.
            </p>
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleUpgrade = async () => {
    setIsSubmitting(true);
    setError(null);

    const { error: updateError } = await updateProfile({ account_type: 'admin' });

    if (updateError) {
      console.error('Upgrade error:', updateError);
      setError('Failed to upgrade your account. Please try again.');
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  if (success) {
    return (
      <div className="upgrade-page">
        <div className="upgrade-container">
          <div className="upgrade-card">
            <div className="upgrade-icon success">🎉</div>
            <h1>Upgrade Complete!</h1>
            <p className="upgrade-subtitle">
              Your account has been upgraded to admin. You can now create and manage teams.
            </p>
            <p className="redirect-text">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upgrade-page">
      <div className="upgrade-container">
        <div className="upgrade-card">
          <div className="upgrade-icon">⬆️</div>
          <h1>Upgrade to Admin</h1>
          <p className="upgrade-subtitle">
            Unlock the ability to create and manage your own teams.
          </p>

          <div className="features-list">
            <h3>Admin Features</h3>
            <ul>
              <li>
                <span className="feature-icon">👥</span>
                <span>Create unlimited teams</span>
              </li>
              <li>
                <span className="feature-icon">📧</span>
                <span>Invite team members and candidates</span>
              </li>
              <li>
                <span className="feature-icon">📊</span>
                <span>View aggregated team insights</span>
              </li>
              <li>
                <span className="feature-icon">📈</span>
                <span>Track assessment completion</span>
              </li>
            </ul>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            onClick={handleUpgrade}
            className="btn btn-primary btn-large upgrade-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Upgrading...' : 'Upgrade My Account'}
          </button>

          <p className="upgrade-note">
            You'll still be able to take assessments and participate as a team member.
          </p>

          <Link to="/dashboard" className="back-link">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
