import { SpecStatus } from '@/lib/api';

export const SPEC_STATUS_META: Record<SpecStatus, { label: string; color: string; bg: string }> = {
  draft:         { label: 'Draft',         color: '#8c909f', bg: 'rgba(140,144,159,0.12)' },
  in_review:     { label: 'In Review',     color: '#afc6ff', bg: 'rgba(175,198,255,0.12)' },
  needs_changes: { label: 'Needs Changes', color: '#ffd8a8', bg: 'rgba(255,216,168,0.12)' },
  approved:      { label: 'Approved',      color: '#a8e6b0', bg: 'rgba(168,230,176,0.12)' },
  in_dev:        { label: 'In Dev',        color: '#d8b4fe', bg: 'rgba(216,180,254,0.12)' },
  shipped:       { label: 'Shipped',       color: '#7dd3c0', bg: 'rgba(125,211,192,0.12)' },
};

// Mirrors ALLOWED_TRANSITIONS in backend/app/api/specs.py
export const SPEC_ALLOWED_TRANSITIONS: Record<SpecStatus, SpecStatus[]> = {
  draft: ['in_review'],
  in_review: ['draft', 'needs_changes', 'approved'],
  needs_changes: ['in_review'],
  approved: ['needs_changes', 'in_dev'],
  in_dev: ['approved', 'shipped'],
  shipped: ['in_dev'],
};

export const SPEC_REGENERATABLE_STATUSES: SpecStatus[] = [
  'draft',
  'in_review',
  'needs_changes',
];

// Mirrors TASK_READY_STATUSES in backend/app/api/specs.py (D-10-02)
export const SPEC_TASK_READY_STATUSES: SpecStatus[] = [
  'approved',
  'in_dev',
  'shipped',
];

export const SPEC_COMPLEXITY_META: Record<string, { label: string; color: string }> = {
  S: { label: 'S', color: '#a8e6b0' },
  M: { label: 'M', color: '#afc6ff' },
  L: { label: 'L', color: '#ffd8a8' },
};
