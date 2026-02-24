import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import type { Organization, OrganizationMember, Assessment, Invitation } from '@/lib/apiClient';
import InviteMemberModal from '@/components/InviteMemberModal';
import { revokeInvitation } from '@/services/invitations';
import {
  LEADERSHIP_FAMILIES,
  LEADERSHIP_TYPES,
  EQ_PILLARS,
  BED_FACTORS,
  CULTURE_DIMENSIONS,
  type LeadershipFamilyCode,
  type LeadershipTypeCode,
} from '@/types/equip360';
import './TeamDashboard.css';

interface MemberWithAssessment {
  id: string;
  userId: string;
  memberType: 'team' | 'candidate';
  joinedAt: string | null;
  profile: OrganizationMember['profile'];
  assessment?: Assessment;
}

interface MetricInfo {
  code: string;
  name: string;
  score: number;
  percentage: number;
  category: 'eq' | 'bed' | 'culture';
}

interface AggregatedMetrics {
  totalMembers: number;
  completedAssessments: number;
  pendingInvites: number;
  familyDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  averageScores: {
    eq: { SA: number; SR: number; M: number; E: number; SS: number };
    bed: { B: number; EX: number; D: number };
    culture: { T: number; PS: number; CQ: number; TS: number; ER: number };
  };
  overallPercentage: number;
  teamStrengths: MetricInfo[];
  teamGrowthAreas: MetricInfo[];
}

export default function TeamDashboard() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<MemberWithAssessment[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'insights'>('members');

  useEffect(() => {
    if (orgId && user) {
      fetchTeamData();
    }
  }, [orgId, user]);

  const fetchTeamData = async () => {
    if (!orgId || !user) return;

    try {
      setLoading(true);
      setError(null);

      const [orgsData, membersData, assessmentsData, invitesData] = await Promise.all([
        apiClient.organizations.list(),
        apiClient.members.list(orgId),
        apiClient.assessments.forOrg(orgId),
        apiClient.invitations.listForOrg(orgId),
      ]);

      const { owned, memberOf } = orgsData;
      const org = [...owned, ...memberOf].find((o) => o.id === orgId);

      if (!org) {
        setError('Organization not found or you do not have access to this team');
        setLoading(false);
        return;
      }

      setOrganization(org);

      const assessmentsByUser = new Map<string, Assessment>();
      assessmentsData.forEach((a) => {
        assessmentsByUser.set(a.userId, a);
      });

      const membersWithAssessments: MemberWithAssessment[] = membersData.map((m) => ({
        id: m.id,
        userId: m.userId,
        memberType: m.memberType as 'team' | 'candidate',
        joinedAt: m.joinedAt,
        profile: m.profile,
        assessment: assessmentsByUser.get(m.userId),
      }));

      setMembers(membersWithAssessments);

      const pendingOnly = invitesData.filter((i) => i.status === 'pending');
      setPendingInvites(pendingOnly);

      const completedMembers = membersWithAssessments.filter((m) => m.assessment);
      const aggregated = calculateAggregatedMetrics(membersWithAssessments, completedMembers, pendingOnly);
      setMetrics(aggregated);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAggregatedMetrics = (
    allMembers: MemberWithAssessment[],
    withAssessments: MemberWithAssessment[],
    invites: Invitation[]
  ): AggregatedMetrics => {
    const familyDistribution: Record<string, number> = {};
    const typeDistribution: Record<string, number> = {};
    const scoreAccumulator = {
      eq: { SA: 0, SR: 0, M: 0, E: 0, SS: 0 },
      bed: { B: 0, EX: 0, D: 0 },
      culture: { T: 0, PS: 0, CQ: 0, TS: 0, ER: 0 },
    };

    withAssessments.forEach((m) => {
      if (m.assessment) {
        const family = m.assessment.leadershipFamily;
        familyDistribution[family] = (familyDistribution[family] || 0) + 1;

        const type = m.assessment.leadershipType;
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;

        const scores = m.assessment.scores as number[];
        if (Array.isArray(scores) && scores.length === 13) {
          scoreAccumulator.eq.SA += scores[0];
          scoreAccumulator.eq.SR += scores[1];
          scoreAccumulator.eq.M += scores[2];
          scoreAccumulator.eq.E += scores[3];
          scoreAccumulator.eq.SS += scores[4];
          scoreAccumulator.bed.B += scores[5];
          scoreAccumulator.bed.EX += scores[6];
          scoreAccumulator.bed.D += scores[7];
          scoreAccumulator.culture.T += scores[8];
          scoreAccumulator.culture.PS += scores[9];
          scoreAccumulator.culture.CQ += scores[10];
          scoreAccumulator.culture.TS += scores[11];
          scoreAccumulator.culture.ER += scores[12];
        }
      }
    });

    const count = withAssessments.length || 1;
    const averageScores = {
      eq: {
        SA: Math.round(scoreAccumulator.eq.SA / count),
        SR: Math.round(scoreAccumulator.eq.SR / count),
        M: Math.round(scoreAccumulator.eq.M / count),
        E: Math.round(scoreAccumulator.eq.E / count),
        SS: Math.round(scoreAccumulator.eq.SS / count),
      },
      bed: {
        B: Math.round(scoreAccumulator.bed.B / count),
        EX: Math.round(scoreAccumulator.bed.EX / count),
        D: Math.round(scoreAccumulator.bed.D / count),
      },
      culture: {
        T: Math.round(scoreAccumulator.culture.T / count),
        PS: Math.round(scoreAccumulator.culture.PS / count),
        CQ: Math.round(scoreAccumulator.culture.CQ / count),
        TS: Math.round(scoreAccumulator.culture.TS / count),
        ER: Math.round(scoreAccumulator.culture.ER / count),
      },
    };

    const totalScore =
      Object.values(averageScores.eq).reduce((a, b) => a + b, 0) +
      Object.values(averageScores.bed).reduce((a, b) => a + b, 0) +
      Object.values(averageScores.culture).reduce((a, b) => a + b, 0);
    const maxPossible = 13 * 80;
    const overallPercentage = Math.round((totalScore / maxPossible) * 100);

    const allMetrics: MetricInfo[] = [
      ...Object.entries(EQ_PILLARS).map(([code, pillar]) => ({
        code,
        name: pillar.name,
        score: averageScores.eq[code as keyof typeof averageScores.eq],
        percentage: Math.round((averageScores.eq[code as keyof typeof averageScores.eq] / 80) * 100),
        category: 'eq' as const,
      })),
      ...Object.entries(BED_FACTORS).map(([code, factor]) => ({
        code,
        name: factor.name,
        score: averageScores.bed[code as keyof typeof averageScores.bed],
        percentage: Math.round((averageScores.bed[code as keyof typeof averageScores.bed] / 80) * 100),
        category: 'bed' as const,
      })),
      ...Object.entries(CULTURE_DIMENSIONS).map(([code, dim]) => ({
        code,
        name: dim.name,
        score: averageScores.culture[code as keyof typeof averageScores.culture],
        percentage: Math.round((averageScores.culture[code as keyof typeof averageScores.culture] / 80) * 100),
        category: 'culture' as const,
      })),
    ];

    const sortedMetrics = [...allMetrics].sort((a, b) => b.percentage - a.percentage);
    const teamStrengths = sortedMetrics.slice(0, 3);
    const teamGrowthAreas = sortedMetrics.slice(-3).reverse();

    return {
      totalMembers: allMembers.length,
      completedAssessments: withAssessments.length,
      pendingInvites: invites.length,
      familyDistribution,
      typeDistribution,
      averageScores,
      overallPercentage,
      teamStrengths,
      teamGrowthAreas,
    };
  };

  const getFamilyColor = (family: string): string => {
    const familyData = LEADERSHIP_FAMILIES[family as LeadershipFamilyCode];
    return familyData?.color || '#666';
  };

  const getScoreLevel = (score: number, max: number = 80): string => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'exceptional';
    if (percentage >= 60) return 'strong';
    if (percentage >= 40) return 'developing';
    return 'emerging';
  };

  const handleDeleteTeam = async () => {
    if (!orgId || !organization) return;

    setDeleting(true);
    try {
      await apiClient.organizations.delete(orgId);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting team:', err);
      alert('Failed to delete team. Please try again.');
      setDeleting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingId(inviteId);
    try {
      const success = await revokeInvitation(inviteId);
      if (success) {
        setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
        if (metrics) {
          setMetrics({ ...metrics, pendingInvites: metrics.pendingInvites - 1 });
        }
      } else {
        alert('Failed to revoke invitation. Please try again.');
      }
    } catch (err) {
      console.error('Error revoking invite:', err);
      alert('Failed to revoke invitation. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyInviteLink = async (token: string, inviteId: string) => {
    const inviteLink = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInviteId(inviteId);
      setTimeout(() => setCopiedInviteId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="team-dashboard">
        <div className="team-loading">
          <div className="loading-spinner" />
          <p>Loading team data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-dashboard">
        <div className="team-error">
          <div className="error-icon">!</div>
          <h2>Access Error</h2>
          <p>{error}</p>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!organization || !metrics) {
    return null;
  }

  const isOwner = organization.ownerId === user?.id;
  const canViewInsights = isOwner || authProfile?.account_type === 'admin';

  return (
    <div className="team-dashboard">
      <div className="team-container">
        <header className="team-header">
          <div className="header-nav">
            <button onClick={() => navigate('/dashboard')} className="back-link">
              ← Back to Dashboard
            </button>
          </div>
          <div className="header-content">
            <div className="header-left">
              <h1>{organization.name}</h1>
              <p className="team-subtitle">Team Dashboard</p>
            </div>
            {isOwner && (
              <div className="header-actions">
                <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                  + Invite Member
                </button>
                <button
                  className="btn btn-outline btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Team
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="stats-overview">
          <div className="stat-card">
            <span className="stat-value">{metrics.totalMembers}</span>
            <span className="stat-label">Team Members</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{metrics.completedAssessments}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {metrics.totalMembers > 0
                ? Math.round((metrics.completedAssessments / metrics.totalMembers) * 100)
                : 0}
              %
            </span>
            <span className="stat-label">Completion Rate</span>
          </div>
          <div className="stat-card pending">
            <span className="stat-value">{metrics.pendingInvites}</span>
            <span className="stat-label">Pending Invites</span>
          </div>
        </div>

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Team Members
          </button>
          {canViewInsights && (
            <button
              className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
              disabled={metrics.completedAssessments === 0}
            >
              Team Insights
            </button>
          )}
        </div>

        {activeTab === 'members' || !canViewInsights ? (
          <div className="members-section">
            {pendingInvites.length > 0 && isOwner && (
              <div className="pending-invites">
                <h3>Pending Invitations</h3>
                <div className="invite-list">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="invite-item">
                      <span className="invite-email">{invite.email}</span>
                      <span className={`invite-type ${invite.memberType}`}>
                        {invite.memberType === 'candidate' ? 'Candidate' : 'Team'}
                      </span>
                      <span className="invite-date">
                        Sent {new Date(invite.createdAt || '').toLocaleDateString()}
                      </span>
                      <div className="invite-actions">
                        <button
                          className="btn btn-small btn-text"
                          onClick={() => handleCopyInviteLink(invite.token, invite.id)}
                        >
                          {copiedInviteId === invite.id ? 'Copied!' : 'Copy Link'}
                        </button>
                        <button
                          className="btn btn-small btn-text-danger"
                          onClick={() => handleRevokeInvite(invite.id)}
                          disabled={revokingId === invite.id}
                        >
                          {revokingId === invite.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {members.length === 0 ? (
              <div className="empty-members">
                <p>No team members yet. Invite people to join your team!</p>
                {isOwner && (
                  <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                    Invite First Member
                  </button>
                )}
              </div>
            ) : (
              <div className="members-grid">
                {members.map((member) => (
                  <div key={member.id} className="member-card">
                    <div className="member-info">
                      <div className="member-avatar">
                        {member.profile?.firstName?.[0] || member.profile?.email?.[0] || '?'}
                      </div>
                      <div className="member-details">
                        <h4>
                          {member.profile?.firstName && member.profile?.lastName
                            ? `${member.profile.firstName} ${member.profile.lastName}`
                            : member.profile?.email || 'Unknown'}
                        </h4>
                        <span className="member-email">{member.profile?.email}</span>
                        <span className={`member-type ${member.memberType}`}>
                          {member.memberType === 'candidate' ? 'Candidate' : 'Team Member'}
                        </span>
                      </div>
                    </div>

                    {member.assessment ? (
                      <div className="member-assessment">
                        <div
                          className="leadership-badge"
                          style={{ borderColor: getFamilyColor(member.assessment.leadershipFamily) }}
                        >
                          <span
                            className="family-name"
                            style={{ color: getFamilyColor(member.assessment.leadershipFamily) }}
                          >
                            {member.assessment.leadershipFamily}
                          </span>
                          <span className="type-name">{member.assessment.leadershipType}</span>
                        </div>
                        <span className="completed-date">
                          Completed {new Date(member.assessment.completedAt || '').toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <div className="member-pending">
                        <span className="pending-badge">Assessment Pending</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="insights-section">
            {metrics.completedAssessments === 0 ? (
              <div className="no-insights">
                <p>Team insights will appear once members complete their assessments.</p>
              </div>
            ) : (
              <>
                <div className="insight-card team-overview">
                  <div className="overview-score">
                    <div className="score-circle">
                      <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" className="circle-bg" />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          className="circle-fill"
                          style={{
                            strokeDasharray: `${metrics.overallPercentage * 2.83} 283`,
                          }}
                        />
                      </svg>
                      <div className="score-text">
                        <span className="score-number">{metrics.overallPercentage}%</span>
                        <span className="score-label">Overall</span>
                      </div>
                    </div>
                  </div>
                  <div className="overview-details">
                    <h3>Team Performance Overview</h3>
                    <p className="overview-description">
                      Based on {metrics.completedAssessments} completed assessment
                      {metrics.completedAssessments !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>

                <div className="strengths-growth-container">
                  <div className="insight-card strengths-card">
                    <h3>Team Strengths</h3>
                    <p className="card-subtitle">Top performing areas</p>
                    <div className="metric-list">
                      {metrics.teamStrengths.map((metric, idx) => (
                        <div key={metric.code} className="metric-item strength">
                          <span className="metric-rank">{idx + 1}</span>
                          <div className="metric-details">
                            <span className="metric-name">{metric.name}</span>
                            <span className="metric-category">{metric.category.toUpperCase()}</span>
                          </div>
                          <span className="metric-percent">{metric.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="insight-card growth-card">
                    <h3>Growth Opportunities</h3>
                    <p className="card-subtitle">Areas for development</p>
                    <div className="metric-list">
                      {metrics.teamGrowthAreas.map((metric, idx) => (
                        <div key={metric.code} className="metric-item growth">
                          <span className="metric-rank">{idx + 1}</span>
                          <div className="metric-details">
                            <span className="metric-name">{metric.name}</span>
                            <span className="metric-category">{metric.category.toUpperCase()}</span>
                          </div>
                          <span className="metric-percent">{metric.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="insight-card">
                  <h3>Leadership Types on Your Team</h3>
                  <div className="type-distribution">
                    {Object.entries(metrics.typeDistribution).map(([typeCode, count]) => {
                      const typeData = LEADERSHIP_TYPES[typeCode as LeadershipTypeCode];
                      const familyCode = typeData?.family;
                      const familyData = familyCode ? LEADERSHIP_FAMILIES[familyCode] : null;
                      const membersWithType = members.filter(
                        (m) => m.assessment?.leadershipType === typeCode
                      );
                      return (
                        <div key={typeCode} className="type-item has-tooltip">
                          <div
                            className="type-badge"
                            style={{ borderColor: familyData?.color || '#666' }}
                          >
                            <span className="type-name">{typeData?.name || typeCode}</span>
                            <span
                              className="type-family"
                              style={{ color: familyData?.color || '#666' }}
                            >
                              {familyData?.name || 'Unknown'}
                            </span>
                          </div>
                          <span className="type-count">
                            {count} member{count !== 1 ? 's' : ''}
                          </span>
                          <div className="type-tooltip">
                            <div className="tooltip-header">
                              <span style={{ color: familyData?.color || '#666' }}>
                                {typeData?.name || typeCode}
                              </span>
                            </div>
                            <div className="tooltip-members">
                              {membersWithType.map((member) => (
                                <div key={member.id} className="tooltip-member">
                                  <span className="tooltip-member-name">
                                    {member.profile?.firstName && member.profile?.lastName
                                      ? `${member.profile.firstName} ${member.profile.lastName}`
                                      : member.profile?.email || 'Unknown'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="insight-card">
                  <h3>Leadership Family Distribution</h3>
                  <div className="family-distribution">
                    {Object.entries(LEADERSHIP_FAMILIES).map(([code, family]) => {
                      const count = metrics.familyDistribution[code] || 0;
                      const percentage =
                        metrics.completedAssessments > 0
                          ? Math.round((count / metrics.completedAssessments) * 100)
                          : 0;
                      return (
                        <div key={code} className="family-bar">
                          <div className="family-info">
                            <span className="family-name" style={{ color: family.color }}>
                              {family.name}
                            </span>
                            <span className="family-count">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="bar-container">
                            <div
                              className="bar-fill"
                              style={{ width: `${percentage}%`, backgroundColor: family.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="insight-card">
                  <h3>Team EQ Profile (Averages)</h3>
                  <div className="scores-grid">
                    {Object.entries(EQ_PILLARS).map(([code, pillar]) => {
                      const score =
                        metrics.averageScores.eq[code as keyof typeof metrics.averageScores.eq];
                      const level = getScoreLevel(score);
                      return (
                        <div key={code} className={`score-item ${level}`}>
                          <div className="score-header">
                            <span className="score-code">{code}</span>
                            <span className="score-name">{pillar.name}</span>
                          </div>
                          <div className="score-bar">
                            <div className="score-fill" style={{ width: `${(score / 80) * 100}%` }} />
                          </div>
                          <span className="score-value">{score}/80</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="insight-card">
                  <h3>Team B.E.D. Profile (Averages)</h3>
                  <div className="scores-grid">
                    {Object.entries(BED_FACTORS).map(([code, factor]) => {
                      const score =
                        metrics.averageScores.bed[code as keyof typeof metrics.averageScores.bed];
                      const level = getScoreLevel(score);
                      return (
                        <div key={code} className={`score-item ${level}`}>
                          <div className="score-header">
                            <span className="score-code">{code}</span>
                            <span className="score-name">{factor.name}</span>
                          </div>
                          <div className="score-bar">
                            <div className="score-fill" style={{ width: `${(score / 80) * 100}%` }} />
                          </div>
                          <span className="score-value">{score}/80</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="insight-card">
                  <h3>Team Culture Index (Averages)</h3>
                  <div className="scores-grid">
                    {Object.entries(CULTURE_DIMENSIONS).map(([code, dimension]) => {
                      const score =
                        metrics.averageScores.culture[
                          code as keyof typeof metrics.averageScores.culture
                        ];
                      const level = getScoreLevel(score);
                      return (
                        <div key={code} className={`score-item ${level}`}>
                          <div className="score-header">
                            <span className="score-code">{code}</span>
                            <span className="score-name">{dimension.name}</span>
                          </div>
                          <div className="score-bar">
                            <div className="score-fill" style={{ width: `${(score / 80) * 100}%` }} />
                          </div>
                          <span className="score-value">{score}/80</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showInviteModal && organization && (
        <InviteMemberModal
          organization={organization}
          onClose={() => setShowInviteModal(false)}
          onInviteSent={() => fetchTeamData()}
        />
      )}

      {showDeleteConfirm && (
        <div className="modal-backdrop" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Team?</h2>
            <p className="delete-warning">
              Are you sure you want to delete <strong>{organization?.name}</strong>?
            </p>
            <p className="delete-details">This will permanently delete:</p>
            <ul className="delete-list">
              <li>All team members ({metrics?.totalMembers || 0})</li>
              <li>All assessments ({metrics?.completedAssessments || 0})</li>
              <li>All pending invitations ({metrics?.pendingInvites || 0})</li>
            </ul>
            <p className="delete-irreversible">This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteTeam} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
