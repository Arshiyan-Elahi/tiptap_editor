const API_BASE = 'http://127.0.0.1:8000'

// ─────────────────────────────────────────────────────
// Helper: parse error body and throw with backend message
// ─────────────────────────────────────────────────────

async function throwApiError(res, fallbackMsg) {
  let detail = fallbackMsg
  try {
    const body = await res.json()
    if (body?.detail) detail = body.detail
  } catch { /* ignore parse error */ }
  const err = new Error(detail)
  err.status = res.status
  throw err
}

// ─────────────────────────────────────────────────────
// Document (sops) operations
// ─────────────────────────────────────────────────────

export async function createDocument(payload) {
  const res = await fetch(`${API_BASE}/api/editor/docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) await throwApiError(res, 'Failed to create document')
  return res.json()
}

export async function getDocument(docId) {
  const res = await fetch(`${API_BASE}/api/editor/docs/${docId}`)
  if (!res.ok) await throwApiError(res, 'Failed to load document')
  return res.json()
}

export async function updateDocument(docId, payload) {
  const res = await fetch(`${API_BASE}/api/editor/docs/${docId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) await throwApiError(res, 'Failed to update document')
  return res.json()
}

/**
 * Duplicate the current document as a brand-new parent SOP.
 * Creates a new sops row + new sop_versions row (v1).
 * The new document gets its own unique sops.id.
 *
 * @param {string} docId - Source document id to copy content from
 * @param {object} payload - { title, doc_json?, metadata_json? }
 */
export async function duplicateDocument(docId, payload) {
  const res = await fetch(`${API_BASE}/api/editor/docs/${docId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) await throwApiError(res, 'Failed to duplicate document')
  return res.json()
}

// ─────────────────────────────────────────────────────
// Version (sop_versions) operations
// ─────────────────────────────────────────────────────

export async function getVersions(docId) {
  const res = await fetch(`${API_BASE}/api/editor/docs/${docId}/versions`)
  if (!res.ok) await throwApiError(res, 'Failed to load versions')
  return res.json()
}

export async function createVersion(docId, payload) {
  const res = await fetch(`${API_BASE}/api/editor/docs/${docId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) await throwApiError(res, 'Failed to create version')
  return res.json()
}

export async function getVersion(docId, versionId) {
  const res = await fetch(`${API_BASE}/api/editor/docs/${docId}/versions/${versionId}`)
  if (!res.ok) await throwApiError(res, 'Failed to load version')
  return res.json()
}

export async function updateVersionStatus(docId, versionId, payload) {
  const res = await fetch(`${API_BASE}/api/editor/docs/${docId}/versions/${versionId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) await throwApiError(res, 'Failed to update version status')
  return res.json()
}
