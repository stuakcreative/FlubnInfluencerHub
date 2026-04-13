/**
 * Campaign Templates Utility
 * Save/load/delete reusable campaign form templates.
 *
 * Plan Limits:
 *   Free       → 0 templates (locked)
 *   Basic      → 3 templates
 *   Pro        → Unlimited (-1)
 *   Enterprise → Unlimited (-1)
 *
 * Storage key: flubn_campaign_templates
 */

import { getPlanLimits } from "./planLimits";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CampaignTemplate {
  id: string;
  name: string;
  campaignName: string;
  budget: string;
  deliverables: string;
  message: string;
  timeline?: string;
  timelineStart?: string;
  timelineEnd?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "flubn_campaign_templates";

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** Get all saved templates. */
export function getTemplates(): CampaignTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save a new template. Returns false if limit reached. */
export function saveTemplate(
  template: Omit<CampaignTemplate, "id" | "createdAt" | "updatedAt">
): CampaignTemplate | null {
  if (!canSaveTemplate()) return null;

  const now = new Date().toISOString();
  const newTemplate: CampaignTemplate = {
    ...template,
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };

  const templates = getTemplates();
  templates.unshift(newTemplate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

/** Update an existing template. */
export function updateTemplate(
  id: string,
  updates: Partial<Omit<CampaignTemplate, "id" | "createdAt">>
): boolean {
  const templates = getTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return false;

  templates[idx] = {
    ...templates[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return true;
}

/** Delete a template by id. */
export function deleteTemplate(id: string): boolean {
  const templates = getTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// ── Limit helpers ────────────────────────────────────────────────────────────

/** Get the template limit for the current plan. */
export function getTemplateLimit(): number {
  return getPlanLimits().campaignTemplates;
}

/** Can the brand save another template? */
export function canSaveTemplate(): boolean {
  const limit = getTemplateLimit();
  if (limit === -1) return true;
  if (limit === 0) return false;
  return getTemplates().length < limit;
}

/** Remaining template slots (-1 = unlimited, 0 = no access). */
export function remainingTemplateSlots(): number {
  const limit = getTemplateLimit();
  if (limit === -1) return -1;
  return Math.max(0, limit - getTemplates().length);
}

/** Get current template count. */
export function getTemplateCount(): number {
  return getTemplates().length;
}