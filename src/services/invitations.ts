import { apiClient, type Invitation } from '@/lib/apiClient';

const getAppUrl = (): string => window.location.origin;

export interface CreateInvitationParams {
  organizationId: string;
  organizationName: string;
  email: string;
  memberType: 'team' | 'candidate';
  sendEmail?: boolean;
}

export interface InvitationResult {
  invitation: Invitation;
  inviteLink: string;
  emailSent: boolean;
}

export async function createInvitation({
  organizationId,
  organizationName,
  email,
  memberType,
  sendEmail = true,
}: CreateInvitationParams): Promise<InvitationResult> {
  const invitation = await apiClient.invitations.create({
    organizationId,
    email: email.toLowerCase(),
    memberType,
  });

  const inviteLink = `${getAppUrl()}/invite/${invitation.token}`;

  let emailSent = false;
  if (sendEmail) {
    try {
      await apiClient.email.sendInvite({
        email: invitation.email,
        memberType: invitation.memberType,
        organizationName,
        inviteLink,
      });
      emailSent = true;
    } catch (emailError) {
      console.warn('Failed to send invitation email:', emailError);
    }
  }

  return { invitation, inviteLink, emailSent };
}

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  try {
    return await apiClient.invitations.getByToken(token);
  } catch {
    return null;
  }
}

export async function acceptInvitation(
  token: string,
  _userId: string
): Promise<{ success: boolean; organizationId?: string; memberType?: string; error?: string }> {
  try {
    const result = await apiClient.invitations.accept(token);
    return {
      success: result.success,
      organizationId: result.organizationId,
      memberType: result.memberType,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to accept invitation',
    };
  }
}

export async function getOrganizationInvitations(organizationId: string): Promise<Invitation[]> {
  try {
    return await apiClient.invitations.listForOrg(organizationId);
  } catch (err) {
    console.error('Failed to fetch invitations:', err);
    return [];
  }
}

export async function revokeInvitation(invitationId: string): Promise<boolean> {
  try {
    await apiClient.invitations.revoke(invitationId);
    return true;
  } catch {
    return false;
  }
}

export async function resendInvitation(
  invitationId: string,
  organizationName: string
): Promise<InvitationResult | null> {
  try {
    const updated = await apiClient.invitations.resend(invitationId);
    const inviteLink = `${getAppUrl()}/invite/${updated.token}`;

    let emailSent = false;
    try {
      await apiClient.email.sendInvite({
        email: updated.email,
        memberType: updated.memberType,
        organizationName,
        inviteLink,
      });
      emailSent = true;
    } catch {
      console.warn('Failed to send email on resend');
    }

    return { invitation: updated, inviteLink, emailSent };
  } catch {
    return null;
  }
}

export function getInviteLink(token: string): string {
  return `${getAppUrl()}/invite/${token}`;
}
