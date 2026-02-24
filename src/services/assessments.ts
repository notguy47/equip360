import { apiClient } from '@/lib/apiClient';
import type { AssessmentResult, ScoreBreakdown } from '@/types/equip360';

const ORG_CONTEXT_KEY = 'pending_assessment_org';

export interface OrganizationContext {
  organizationId: string;
  organizationName: string;
}

export function getOrganizationContext(): OrganizationContext | null {
  try {
    const stored = localStorage.getItem(ORG_CONTEXT_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse org context:', e);
  }
  return null;
}

export function setOrganizationContext(context: OrganizationContext): void {
  try {
    localStorage.setItem(ORG_CONTEXT_KEY, JSON.stringify(context));
  } catch (e) {
    console.error('Failed to save org context:', e);
  }
}

export function clearOrganizationContext(): void {
  try {
    localStorage.removeItem(ORG_CONTEXT_KEY);
  } catch (e) {
    console.error('Failed to clear org context:', e);
  }
}

function scoresToArray(scores: ScoreBreakdown): number[] {
  return [
    scores.eq.SA,
    scores.eq.SR,
    scores.eq.M,
    scores.eq.E,
    scores.eq.SS,
    scores.bed.B,
    scores.bed.EX,
    scores.bed.D,
    scores.culture.T,
    scores.culture.PS,
    scores.culture.CQ,
    scores.culture.TS,
    scores.culture.ER,
  ];
}

export interface SaveAssessmentParams {
  userId: string;
  result: AssessmentResult;
  organizationId?: string;
  responses?: unknown[];
}

export interface SaveAssessmentResult {
  success: boolean;
  assessmentId?: string;
  error?: string;
}

export async function saveAssessment({
  result,
  organizationId,
  responses,
}: SaveAssessmentParams): Promise<SaveAssessmentResult> {
  try {
    const scoresArray = scoresToArray(result.scores);
    const assessment = await apiClient.assessments.save({
      organizationId: organizationId ?? null,
      scores: scoresArray,
      leadershipFamily: result.leadershipFamily,
      leadershipType: result.leadershipType,
      responses: responses ?? null,
    });

    if (organizationId) {
      clearOrganizationContext();
    }

    return { success: true, assessmentId: assessment.id };
  } catch (err) {
    console.error('Error saving assessment:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function getUserAssessments() {
  try {
    return await apiClient.assessments.mine();
  } catch (err) {
    console.error('Failed to fetch assessments:', err);
    return [];
  }
}
