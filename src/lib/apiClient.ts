export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  company: string | null;
  role: string | null;
  accountType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string | null;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  memberType: string;
  joinedAt: string | null;
  profile: User | null;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  memberType: string;
  token: string;
  status: string | null;
  createdAt: string | null;
  acceptedAt: string | null;
  organization?: Organization;
}

export interface Assessment {
  id: string;
  userId: string;
  organizationId: string | null;
  scores: number[];
  leadershipFamily: string;
  leadershipType: string;
  responses: unknown | null;
  completedAt: string | null;
}

export interface OrgStats {
  memberCount: number;
  assessmentCount: number;
  pendingInviteCount: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  auth: {
    getUser: () => request<User | null>("/api/auth/user").catch(() => null),
  },

  profile: {
    get: () => request<User>("/api/profile"),
    update: (data: Partial<Pick<User, "firstName" | "lastName" | "company" | "role" | "accountType">>) =>
      request<User>("/api/profile", { method: "PUT", body: JSON.stringify(data) }),
  },

  organizations: {
    list: () =>
      request<{ owned: Organization[]; memberOf: Organization[]; memberTypes: { organizationId: string; memberType: string }[] }>("/api/organizations"),
    create: (name: string) =>
      request<Organization>("/api/organizations", { method: "POST", body: JSON.stringify({ name }) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/organizations/${id}`, { method: "DELETE" }),
    getStats: (id: string) =>
      request<OrgStats>(`/api/organizations/${id}/stats`),
  },

  members: {
    list: (orgId: string) =>
      request<OrganizationMember[]>(`/api/organizations/${orgId}/members`),
    remove: (orgId: string, memberId: string) =>
      request<{ success: boolean }>(`/api/organizations/${orgId}/members/${memberId}`, { method: "DELETE" }),
  },

  invitations: {
    listForOrg: (orgId: string) =>
      request<Invitation[]>(`/api/invitations/org/${orgId}`),
    getByToken: (token: string) =>
      request<Invitation>(`/api/invitations/token/${token}`),
    create: (data: { organizationId: string; email: string; memberType: string }) =>
      request<Invitation>("/api/invitations", { method: "POST", body: JSON.stringify(data) }),
    accept: (token: string) =>
      request<{ success: boolean; memberType: string; organizationId: string }>(
        `/api/invitations/token/${token}/accept`,
        { method: "POST" }
      ),
    revoke: (id: string) =>
      request<{ success: boolean }>(`/api/invitations/${id}/revoke`, { method: "PATCH" }),
    resend: (id: string) =>
      request<Invitation>(`/api/invitations/${id}/resend`, { method: "POST" }),
  },

  assessments: {
    save: (data: {
      organizationId?: string | null;
      scores: number[];
      leadershipFamily: string;
      leadershipType: string;
      responses?: unknown;
    }) => request<Assessment>("/api/assessments", { method: "POST", body: JSON.stringify(data) }),
    mine: () => request<Assessment[]>("/api/assessments/mine"),
    forOrg: (orgId: string) => request<Assessment[]>(`/api/assessments/org/${orgId}`),
  },

  email: {
    sendInvite: (data: {
      email: string;
      memberType: string;
      organizationName: string;
      inviteLink: string;
    }) => request<{ success: boolean }>("/api/send-invite", { method: "POST", body: JSON.stringify(data) }),
  },
};
