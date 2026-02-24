import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import type { Organization, Assessment } from '@/lib/apiClient';
import { CreateOrganizationModal } from '@/components/CreateOrganizationModal';
import InviteMemberModal from '@/components/InviteMemberModal';
import { LEADERSHIP_FAMILIES, type LeadershipFamilyCode } from '@/types/equip360';
import './Dashboard.css';

interface OrganizationWithCounts extends Organization {
  member_count?: number;
  completed_count?: number;
  pending_invites?: number;
  is_owner?: boolean;
  member_type?: 'team' | 'candidate';
}

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationWithCounts[]>([]);
  const [userAssessment, setUserAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteOrg, setInviteOrg] = useState<Organization | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [orgsData, assessments] = await Promise.all([
        apiClient.organizations.list(),
        apiClient.assessments.mine(),
      ]);

      const { owned, memberOf, memberTypes } = orgsData;

      const memberTypeMap = new Map(memberTypes.map((m) => [m.organizationId, m.memberType]));

      const allOrgs: OrganizationWithCounts[] = [
        ...owned.map((org) => ({ ...org, is_owner: true })),
        ...memberOf.map((org) => ({
          ...org,
          is_owner: false,
          member_type: (memberTypeMap.get(org.id) as 'team' | 'candidate') || 'team',
        })),
      ];

      if (allOrgs.length > 0) {
        const statsResults = await Promise.allSettled(
          allOrgs.map((org) => apiClient.organizations.getStats(org.id))
        );

        const orgsWithCounts = allOrgs.map((org, i) => {
          const stats = statsResults[i].status === 'fulfilled' ? statsResults[i].value : null;
          return {
            ...org,
            member_count: stats?.memberCount ?? 0,
            completed_count: stats?.assessmentCount ?? 0,
            pending_invites: stats?.pendingInviteCount ?? 0,
          };
        });

        setOrganizations(orgsWithCounts);
      } else {
        setOrganizations([]);
      }

      if (assessments.length > 0) {
        setUserAssessment(assessments[0]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationCreated = () => {
    fetchDashboardData();
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Dashboard</h1>
            <p className="welcome-text">
              Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}
            </p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-email">{user?.email}</span>
              {profile?.first_name && profile?.last_name && (
                <span className="user-name">{profile.first_name} {profile.last_name}</span>
              )}
            </div>
            <button onClick={signOut} className="btn btn-outline btn-small">
              Sign Out
            </button>
          </div>
        </header>

        <div className="your-assessment-section">
          <h2>Your Assessment</h2>
          {userAssessment ? (
            <div className="assessment-complete-card">
              <div className="assessment-result">
                <div
                  className="leadership-badge-large"
                  style={{
                    borderColor: LEADERSHIP_FAMILIES[userAssessment.leadershipFamily as LeadershipFamilyCode]?.color || '#666'
                  }}
                >
                  <span className="badge-label">Your Leadership Identity</span>
                  <span
                    className="badge-family"
                    style={{
                      color: LEADERSHIP_FAMILIES[userAssessment.leadershipFamily as LeadershipFamilyCode]?.color || '#666'
                    }}
                  >
                    {LEADERSHIP_FAMILIES[userAssessment.leadershipFamily as LeadershipFamilyCode]?.name || userAssessment.leadershipFamily}
                  </span>
                  <span className="badge-type">{userAssessment.leadershipType?.replace(/_/g, ' ')}</span>
                </div>
                <div className="assessment-meta">
                  <span className="completed-date">
                    Completed {new Date(userAssessment.completedAt || '').toLocaleDateString()}
                  </span>
                  <Link to={`/results/${userAssessment.id}`} className="btn btn-primary">
                    View Full Results
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="assessment-pending-card">
              <div className="pending-content">
                <span className="pending-icon">📝</span>
                <div className="pending-text">
                  <h3>Assessment Not Started</h3>
                  <p>Discover your Leadership Identity and understand how you lead under pressure.</p>
                </div>
                <Link to="/start" className="btn btn-primary">
                  Take Assessment
                </Link>
              </div>
            </div>
          )}
        </div>

        {organizations.length === 0 ? (
          <div className="empty-state">
            {profile?.account_type === 'admin' ? (
              <>
                <div className="empty-state-icon">👥</div>
                <h2>Create Your First Team</h2>
                <p>
                  Get started by creating a team. You'll be able to invite members,
                  track assessments, and view aggregated leadership insights.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  Create Your First Team
                </button>
              </>
            ) : (
              <>
                <div className="empty-state-icon">📝</div>
                <h2>Welcome to E.Q.U.I.P. 360</h2>
                <p>
                  You're set up as a team member. Take the leadership assessment
                  to discover your Leadership Identity and contribute to your team's insights.
                </p>
                <Link to="/start" className="btn btn-primary">
                  Take Your Assessment
                </Link>
                <div className="upgrade-prompt">
                  <p>Want to create your own team?</p>
                  <Link to="/upgrade" className="link-button">
                    Upgrade to Admin Account
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="dashboard-actions">
              {profile?.account_type === 'admin' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  + New Team
                </button>
              )}
              {profile?.account_type === 'member' && (
                <Link to="/start" className="btn btn-primary">
                  Take Assessment
                </Link>
              )}
            </div>

            <div className="organizations-grid">
              {organizations.map((org) => (
                <div key={org.id} className="organization-card">
                  <Link to={`/team/${org.id}`} className="org-card-link">
                    <div className="org-card-header">
                      <h3>{org.name}</h3>
                      <span className={`org-badge ${org.is_owner ? 'owner' : org.member_type}`}>
                        {org.is_owner ? 'Owner' : org.member_type === 'candidate' ? 'Candidate' : 'Member'}
                      </span>
                    </div>
                    <div className="org-card-stats">
                      <div className="stat">
                        <span className="stat-value">{org.member_count}</span>
                        <span className="stat-label">Members</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{org.completed_count}</span>
                        <span className="stat-label">Completed</span>
                      </div>
                      {(org.pending_invites ?? 0) > 0 && (
                        <div className="stat pending">
                          <span className="stat-value">{org.pending_invites}</span>
                          <span className="stat-label">Pending</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="org-card-footer">
                    {org.is_owner ? (
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={(e) => {
                          e.preventDefault();
                          setInviteOrg(org);
                        }}
                      >
                        Invite Member
                      </button>
                    ) : org.member_type === 'candidate' ? (
                      <Link to="/start" className="btn btn-primary btn-small">
                        Take Assessment
                      </Link>
                    ) : (
                      <span className="member-role">Team Member</span>
                    )}
                    <Link to={`/team/${org.id}`} className="view-team">
                      View Team →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="dashboard-quick-links">
          <h3>Quick Actions</h3>
          <div className="quick-links-grid">
            {userAssessment ? (
              <Link to={`/results/${userAssessment.id}`} className="quick-link">
                <span className="quick-link-icon">📊</span>
                <span>View My Results</span>
              </Link>
            ) : (
              <Link to="/start" className="quick-link">
                <span className="quick-link-icon">📝</span>
                <span>Take Assessment</span>
              </Link>
            )}
            {profile?.account_type === 'admin' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="quick-link"
              >
                <span className="quick-link-icon">➕</span>
                <span>Create Team</span>
              </button>
            )}
            <Link to="/" className="quick-link">
              <span className="quick-link-icon">🏠</span>
              <span>Home</span>
            </Link>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleOrganizationCreated}
        />
      )}

      {inviteOrg && (
        <InviteMemberModal
          organization={inviteOrg}
          onClose={() => setInviteOrg(null)}
          onInviteSent={() => fetchDashboardData()}
        />
      )}
    </div>
  );
}
