// src/api.js
import { getToken } from "./auth/Auth";
const BASE = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

function authHeaders(extra = {}) {
  const headers = { ...extra };
  try { const t = getToken && getToken(); if (t) headers.Authorization = `Bearer ${t}`; } catch {}
  return headers;
}

// Health
export async function apiHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`Health failed: ${res.status}`);
  return await res.json();
}

// Clients
export async function getClients(limit = 1000) {
  const res = await fetch(`${BASE}/clients?limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /clients failed: ${res.status}`);
  return (await res.json()).data || [];
}
export async function getClientById(id) {
  const res = await fetch(`${BASE}/clients/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /clients/${id} failed: ${res.status}`);
  return (await res.json()).data;
}
export async function addClient(payload) {
  const res = await fetch(`${BASE}/clients`, {
    method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`POST /clients failed: ${res.status}`);
  return (await res.json()).data;
}
export async function updateClient(id, patch) {
  const res = await fetch(`${BASE}/clients/${id}`, {
    method: "PUT", headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) { const msg = await res.text().catch(()=>res.statusText); throw new Error(msg || `PUT /clients/${id} failed`); }
  return (await res.json()).data;
}
export async function deleteClient(id) {
  const res = await fetch(`${BASE}/clients/${id}`, { method: "DELETE", headers: authHeaders() });

  // Handle 204 No Content (success with no body)
  if (res.status === 204) {
    return { ok: true };
  }

  // Parse response body once
  const data = await res.json().catch(() => ({}));

  // Check for HTTP errors
  if (!res.ok) {
    throw new Error(data.error || `DELETE /clients/${id} failed: ${res.status}`);
  }

  // Check if the response indicates failure even with 200 status
  if (!data.ok) {
    throw new Error(data.error || 'Delete failed');
  }

  return data;
}

// Import/Export
export async function bulkImportClients(items, upsert = true, filename = 'import.csv') {
  const res = await fetch(`${BASE}/clients/bulk`, {
    method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ items, upsert, filename }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `bulk import failed: ${res.status}`);
  }
  return await res.json();
}
export function getExportCsvUrl() {
  const t = getToken?.(); return `${BASE}/clients/export.csv?token=${encodeURIComponent(t || "")}`;
}
export async function getImportHistory() {
  const res = await fetch(`${BASE}/clients/imports`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /clients/imports failed: ${res.status}`);
  return (await res.json()).data || [];
}
export async function reverseImport(importId) {
  const res = await fetch(`${BASE}/clients/imports/${importId}/reverse`, {
    method: "POST", headers: authHeaders(),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `reverse import failed: ${res.status}`);
  }
  return await res.json();
}

// Uploads
export async function listClientUploads(id) {
  const res = await fetch(`${BASE}/clients/${id}/uploads`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /clients/${id}/uploads failed: ${res.status}`);
  return (await res.json()).data || [];
}
export async function uploadClientFile(id, file, label = "Document") {
  const fd = new FormData(); fd.append("file", file); fd.append("label", label);
  const res = await fetch(`${BASE}/clients/${id}/uploads`, { method: "POST", headers: authHeaders(), body: fd });
  if (!res.ok) throw new Error(`POST /clients/${id}/uploads failed: ${res.status}`);
  return (await res.json()).data;
}
export async function deleteClientUpload(id, uploadId) {
  const res = await fetch(`${BASE}/clients/${id}/uploads/${uploadId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE /clients/${id}/uploads/${uploadId} failed: ${res.status}`);
}
export function getUploadDownloadUrl(filename) {
  const t = getToken?.(); return `${BASE}/uploads/${encodeURIComponent(filename)}?token=${encodeURIComponent(t || "")}`;
}

// Enrollment PDF parsing
export async function parseEnrollmentPdf(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/enrollments/parse`, {
    method: "POST",
    headers: authHeaders(),
    body: fd
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(errText || `PDF parsing failed: ${res.status}`);
  }
  return await res.json();
}

// ---------- Communications (automatic) ----------
export async function listComms(id, limit = 5) {
  const res = await fetch(`${BASE}/clients/${id}/comms?limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /clients/${id}/comms failed: ${res.status}`);
  return (await res.json()).data || [];
}
export async function listCommsAll(id) {
  const res = await fetch(`${BASE}/clients/${id}/comms/all`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /clients/${id}/comms/all failed: ${res.status}`);
  return (await res.json()).data || [];
}
export async function addComm(clientId, payload) {
  // Backend expects: POST /comms with { clientId, type, subject, body }
  const body = {
    clientId: clientId,
    type: payload.type,
    subject: payload.subject || '',
    body: payload.body || payload.message || payload.preview || '',
    direction: payload.direction === 'out' ? 'outbound' : (payload.direction === 'in' ? 'inbound' : 'outbound'),
    metadata: payload.meta || {}
  };

  const res = await fetch(`${BASE}/comms`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /comms failed: ${res.status}`);
  return (await res.json()).data;
}

// Keep older import name
export { getClients as fetchClients };

// Update assistant name
export async function updateAssistantName(assistantName) {
  const res = await fetch(`${BASE}/auth/update-assistant-name`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ assistantName })
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || "Failed to update assistant name");
  }
  return await res.json();
}

// Get dynamic briefing (time-aware)
export async function getDynamicBriefing() {
  const res = await fetch(`${BASE}/churn-prediction/dynamic-briefing`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn-prediction/dynamic-briefing failed: ${res.status}`);
  return await res.json();
}

// Auth + Forgot Password
export async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  if (!res.ok) { const msg = await res.text().catch(()=>res.statusText); const err = new Error(msg || "login failed"); err.code = res.status; throw err; }
  return await res.json();
}
export async function signup(email, password) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  if (!res.ok) { const msg = await res.text().catch(()=>res.statusText); const err = new Error(msg || "signup failed"); err.code = res.status; throw err; }
  return await res.json();
}
export async function requestPasswordReset(email) {
  const res = await fetch(`${BASE}/auth/request-reset`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`request-reset failed: ${res.status}`);
  return await res.json();
}
export async function resetPassword(email, code, newPassword) {
  const res = await fetch(`${BASE}/auth/reset`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword }),
  });
  if (!res.ok) { const msg = await res.text().catch(()=>res.statusText); const err = new Error(msg || "reset failed"); err.code = res.status; throw err; }
  return await res.json();
}

// ============================================================================
// BLUE BUTTON 2.0 (Medicare Data)
// ============================================================================

export async function getBlueButtonAuthUrl(clientId) {
  const res = await fetch(`${BASE}/bluebutton/connect/${clientId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /bluebutton/connect failed: ${res.status}`);
  return await res.json();
}

export async function getBlueButtonStatus(clientId) {
  const res = await fetch(`${BASE}/bluebutton/status/${clientId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /bluebutton/status failed: ${res.status}`);
  return await res.json();
}

export async function disconnectBlueButton(clientId) {
  const res = await fetch(`${BASE}/bluebutton/disconnect/${clientId}`, {
    method: "DELETE", headers: authHeaders()
  });
  if (!res.ok) throw new Error(`DELETE /bluebutton/disconnect failed: ${res.status}`);
  return await res.json();
}

export async function syncBlueButtonData(clientId) {
  const res = await fetch(`${BASE}/bluebutton/sync/${clientId}`, {
    method: "POST", headers: authHeaders()
  });
  if (!res.ok) throw new Error(`POST /bluebutton/sync failed: ${res.status}`);
  return await res.json();
}

export async function getBlueButtonClaims(clientId, limit = 50, offset = 0) {
  const res = await fetch(`${BASE}/bluebutton/claims/${clientId}?limit=${limit}&offset=${offset}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /bluebutton/claims failed: ${res.status}`);
  return await res.json();
}

export async function getBlueButtonChanges(clientId, limit = 20) {
  const res = await fetch(`${BASE}/bluebutton/changes/${clientId}?limit=${limit}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /bluebutton/changes failed: ${res.status}`);
  return await res.json();
}

export async function reviewPrescriptionChange(changeId) {
  const res = await fetch(`${BASE}/bluebutton/changes/${changeId}/review`, {
    method: "POST", headers: authHeaders()
  });
  if (!res.ok) throw new Error(`POST /bluebutton/changes/review failed: ${res.status}`);
  return await res.json();
}

// ============================================================================
// CHURN TRACKING
// ============================================================================

export async function getChurnReasons() {
  const res = await fetch(`${BASE}/churn/reasons`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /churn/reasons failed: ${res.status}`);
  return await res.json();
}

export async function logChurnEvent(data) {
  const res = await fetch(`${BASE}/churn/log`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /churn/log failed: ${res.status}`);
  return await res.json();
}

export async function getChurnEvents(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/churn/events${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn/events failed: ${res.status}`);
  return await res.json();
}

export async function getChurnEventById(id) {
  const res = await fetch(`${BASE}/churn/events/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /churn/events/${id} failed: ${res.status}`);
  return await res.json();
}

export async function logWinbackAttempt(data) {
  const res = await fetch(`${BASE}/churn/winback`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /churn/winback failed: ${res.status}`);
  return await res.json();
}

export async function logRetentionSuccess(data) {
  const res = await fetch(`${BASE}/churn/retention-success`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /churn/retention-success failed: ${res.status}`);
  return await res.json();
}

export async function getChurnStats(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/churn/stats${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn/stats failed: ${res.status}`);
  return await res.json();
}

// ============================================================================
// RISK SCORING
// ============================================================================

export async function getRiskFactors() {
  const res = await fetch(`${BASE}/risk/factors`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /risk/factors failed: ${res.status}`);
  return await res.json();
}

export async function getClientRisk(clientId) {
  const res = await fetch(`${BASE}/risk/client/${clientId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /risk/client failed: ${res.status}`);
  return await res.json();
}

export async function recalculateClientRisk(clientId) {
  const res = await fetch(`${BASE}/risk/client/${clientId}/recalculate`, {
    method: "POST", headers: authHeaders()
  });
  if (!res.ok) throw new Error(`POST /risk/recalculate failed: ${res.status}`);
  return await res.json();
}

export async function getRiskDashboard() {
  const res = await fetch(`${BASE}/risk/dashboard`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /risk/dashboard failed: ${res.status}`);
  return await res.json();
}

export async function getAtRiskClients(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/risk/at-risk-clients${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /risk/at-risk-clients failed: ${res.status}`);
  return await res.json();
}

// ============================================================================
// CHURN PREDICTION MODEL
// ============================================================================

// Get current risk score for a client
export async function getChurnPredictionScore(clientId) {
  const res = await fetch(`${BASE}/churn-prediction/score/${clientId}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn-prediction/score failed: ${res.status}`);
  const data = await res.json();
  // Extract the score object from the response and normalize the structure
  if (data.ok && data.score) {
    return {
      score: data.score.finalScore ?? data.score.score ?? 0,
      factors: data.score.factors || [],
      categoryBreakdown: data.score.categoryBreakdown || {},
      autoTrigger: data.score.auto100Reason || null,
      lastScored: data.score.lastScored || new Date().toISOString()
    };
  }
  return data;
}

// Trigger score recalculation for a client
export async function recalculateChurnScore(clientId) {
  const res = await fetch(`${BASE}/churn-prediction/recalculate/${clientId}`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`POST /churn-prediction/recalculate failed: ${res.status}`);
  const data = await res.json();
  // Normalize response to match expected structure
  if (data.ok) {
    return {
      score: data.score ?? 0,
      riskCategory: data.riskCategory,
      autoTrigger: data.auto100Reason || null
    };
  }
  return data;
}

// Get call outcome options for the modal
export async function getCallOutcomeOptions() {
  const res = await fetch(`${BASE}/churn-prediction/call-outcome-options`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn-prediction/call-outcome-options failed: ${res.status}`);
  return await res.json();
}

// Log a call outcome (from the modal)
export async function logCallOutcome(data) {
  const res = await fetch(`${BASE}/churn-prediction/call-outcome`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /churn-prediction/call-outcome failed: ${res.status}`);
  return await res.json();
}

// Get alerts for the current agent (or all if admin)
export async function getChurnAlerts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/churn-prediction/alerts${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn-prediction/alerts failed: ${res.status}`);
  return await res.json();
}

// Dismiss an alert
export async function dismissChurnAlert(alertId) {
  const res = await fetch(`${BASE}/churn-prediction/alerts/${alertId}/dismiss`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`POST /churn-prediction/alerts/dismiss failed: ${res.status}`);
  return await res.json();
}

// Get morning briefing for current agent
export async function getMorningBriefing(date = null) {
  const query = date ? `?date=${date}` : '';
  const res = await fetch(`${BASE}/churn-prediction/morning-briefing${query}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn-prediction/morning-briefing failed: ${res.status}`);
  return await res.json();
}

// Get priority call queue
export async function getPriorityQueue(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/churn-prediction/priority-queue${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn-prediction/priority-queue failed: ${res.status}`);
  const data = await res.json();
  // Normalize response - backend returns { queue: [...] }, component expects { clients: [...] }
  if (data.ok && data.queue) {
    return { clients: data.queue, total: data.total };
  }
  return data;
}

// Log client contact
export async function logClientContact(data) {
  const res = await fetch(`${BASE}/churn-prediction/contact`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /churn-prediction/contact failed: ${res.status}`);
  return await res.json();
}

// Update SEP status for a client
export async function updateSepStatus(clientId, data) {
  const res = await fetch(`${BASE}/churn-prediction/sep-status/${clientId}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /churn-prediction/sep-status failed: ${res.status}`);
  return await res.json();
}

// Get SEP status for a client
export async function getSepStatus(clientId) {
  const res = await fetch(`${BASE}/churn-prediction/sep-status/${clientId}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn-prediction/sep-status failed: ${res.status}`);
  return await res.json();
}

// Get risk score history for a client
export async function getRiskHistory(clientId, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/churn-prediction/history/${clientId}${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn-prediction/history failed: ${res.status}`);
  return await res.json();
}

// Log an intervention
export async function logIntervention(data) {
  const res = await fetch(`${BASE}/churn-prediction/intervention`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /churn-prediction/intervention failed: ${res.status}`);
  return await res.json();
}

// Get risk distribution (for charts)
export async function getRiskDistribution() {
  const res = await fetch(`${BASE}/churn-prediction/distribution`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /churn-prediction/distribution failed: ${res.status}`);
  const data = await res.json();
  // Normalize response - backend returns { distribution: {severe, critical, ...}, categories: [...] }
  // Component expects { total, categories: { severe: n, critical: n, ... } }
  if (data.ok && data.distribution) {
    return {
      total: parseInt(data.distribution.total) || 0,
      categories: {
        stable: parseInt(data.distribution.stable) || 0,
        low: parseInt(data.distribution.low) || 0,
        moderate: parseInt(data.distribution.moderate) || parseInt(data.distribution.medium) || 0,
        elevated: parseInt(data.distribution.elevated) || 0,
        high: parseInt(data.distribution.high) || 0,
        critical: parseInt(data.distribution.critical) || 0,
        severe: parseInt(data.distribution.severe) || 0
      }
    };
  }
  return data;
}

// ============================================================================
// FOUNDER ANALYTICS
// ============================================================================

// Get overview metrics
export async function getFounderOverview(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/founder-analytics/overview${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /founder-analytics/overview failed: ${res.status}`);
  return await res.json();
}

// Get model accuracy metrics
export async function getModelAccuracy(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/founder-analytics/model-accuracy${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /founder-analytics/model-accuracy failed: ${res.status}`);
  return await res.json();
}

// Get churn analysis breakdown
export async function getChurnAnalysis(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/founder-analytics/churn-analysis${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /founder-analytics/churn-analysis failed: ${res.status}`);
  return await res.json();
}

// Get intervention effectiveness
export async function getInterventionEffectiveness(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/founder-analytics/intervention-effectiveness${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /founder-analytics/intervention-effectiveness failed: ${res.status}`);
  return await res.json();
}

// Get risk factor analysis
export async function getRiskFactorAnalysis(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/founder-analytics/risk-factor-analysis${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /founder-analytics/risk-factor-analysis failed: ${res.status}`);
  return await res.json();
}

// Get agent performance rankings
export async function getAgentPerformance(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/founder-analytics/agent-performance${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /founder-analytics/agent-performance failed: ${res.status}`);
  return await res.json();
}

// Get competitor analysis
export async function getCompetitorAnalysis(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/founder-analytics/competitors${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /founder-analytics/competitors failed: ${res.status}`);
  return await res.json();
}

// Get weight adjustment recommendations
export async function getWeightRecommendations() {
  const res = await fetch(`${BASE}/founder-analytics/weight-recommendations`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /founder-analytics/weight-recommendations failed: ${res.status}`);
  return await res.json();
}

// Get model version history
export async function getModelVersions() {
  const res = await fetch(`${BASE}/founder-analytics/model-versions`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /founder-analytics/model-versions failed: ${res.status}`);
  return await res.json();
}

// Trigger ML training manually
export async function triggerMLTraining() {
  const res = await fetch(`${BASE}/founder-analytics/trigger-training`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`POST /founder-analytics/trigger-training failed: ${res.status}`);
  return await res.json();
}

// Generate analytics report
export async function generateAnalyticsReport(params = {}) {
  const res = await fetch(`${BASE}/founder-analytics/generate-report`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error(`POST /founder-analytics/generate-report failed: ${res.status}`);
  return await res.json();
}

// ============================================================================
// AEP WIZARD
// ============================================================================

// Templates
export async function getAepTemplates() {
  const res = await fetch(`${BASE}/aep/templates`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /aep/templates failed: ${res.status}`);
  return await res.json();
}

export async function getAepTemplate(id) {
  const res = await fetch(`${BASE}/aep/templates/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /aep/templates/${id} failed: ${res.status}`);
  return await res.json();
}

export async function createAepTemplate(data) {
  const res = await fetch(`${BASE}/aep/templates`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /aep/templates failed: ${res.status}`);
  return await res.json();
}

export async function updateAepTemplate(id, data) {
  const res = await fetch(`${BASE}/aep/templates/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PUT /aep/templates/${id} failed: ${res.status}`);
  return await res.json();
}

export async function deleteAepTemplate(id) {
  const res = await fetch(`${BASE}/aep/templates/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`DELETE /aep/templates/${id} failed: ${res.status}`);
  return await res.json();
}

export async function getAepMergeTags() {
  const res = await fetch(`${BASE}/aep/merge-tags`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /aep/merge-tags failed: ${res.status}`);
  return await res.json();
}

// Automations
export async function getAepAutomations() {
  const res = await fetch(`${BASE}/aep/automations`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /aep/automations failed: ${res.status}`);
  return await res.json();
}

export async function updateAepAutomations(data) {
  const res = await fetch(`${BASE}/aep/automations`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PUT /aep/automations failed: ${res.status}`);
  return await res.json();
}

// Countdown Contacts
export async function getAepCountdownContacts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/aep/countdown${query ? '?' + query : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /aep/countdown failed: ${res.status}`);
  return await res.json();
}

export async function addAepCountdownContact(data) {
  const res = await fetch(`${BASE}/aep/countdown`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /aep/countdown failed: ${res.status}`);
  return await res.json();
}

export async function updateAepCountdownContact(id, data) {
  const res = await fetch(`${BASE}/aep/countdown/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PUT /aep/countdown/${id} failed: ${res.status}`);
  return await res.json();
}

export async function deleteAepCountdownContact(id) {
  const res = await fetch(`${BASE}/aep/countdown/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`DELETE /aep/countdown/${id} failed: ${res.status}`);
  return await res.json();
}

export async function sendAepDrip(contactId, data) {
  const res = await fetch(`${BASE}/aep/countdown/${contactId}/send`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /aep/countdown/${contactId}/send failed: ${res.status}`);
  return await res.json();
}

// Activity
export async function getAepActivity(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/aep/activity${query ? '?' + query : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /aep/activity failed: ${res.status}`);
  return await res.json();
}

export async function resendAepActivity(activityId) {
  const res = await fetch(`${BASE}/aep/activity/${activityId}/resend`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`POST /aep/activity/${activityId}/resend failed: ${res.status}`);
  return await res.json();
}

// Analytics
export async function getAepAnalytics(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/aep/analytics${query ? '?' + query : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /aep/analytics failed: ${res.status}`);
  return await res.json();
}

// Blast Send
export async function sendAepBlast(data) {
  const res = await fetch(`${BASE}/aep/blast`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /aep/blast failed: ${res.status}`);
  return await res.json();
}

// Get clients for AEP outreach
export async function getAepClients(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/aep/clients${query ? '?' + query : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /aep/clients failed: ${res.status}`);
  return await res.json();
}
// ============================================================================
// OEP RETENTION HUB
// ============================================================================

// Templates
export async function getOepTemplates() {
  const res = await fetch(`${BASE}/oep/templates`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /oep/templates failed: ${res.status}`);
  return await res.json();
}

export async function createOepTemplate(data) {
  const res = await fetch(`${BASE}/oep/templates`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /oep/templates failed: ${res.status}`);
  return await res.json();
}

export async function updateOepTemplate(id, data) {
  const res = await fetch(`${BASE}/oep/templates/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PUT /oep/templates/${id} failed: ${res.status}`);
  return await res.json();
}

export async function deleteOepTemplate(id) {
  const res = await fetch(`${BASE}/oep/templates/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`DELETE /oep/templates/${id} failed: ${res.status}`);
  return await res.json();
}

export async function getOepMergeTags() {
  const res = await fetch(`${BASE}/oep/merge-tags`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /oep/merge-tags failed: ${res.status}`);
  return await res.json();
}

// Automations
export async function getOepAutomations() {
  const res = await fetch(`${BASE}/oep/automations`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /oep/automations failed: ${res.status}`);
  return await res.json();
}

export async function updateOepAutomations(data) {
  const res = await fetch(`${BASE}/oep/automations`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PUT /oep/automations failed: ${res.status}`);
  return await res.json();
}

// Season info
export async function getOepSeason() {
  const res = await fetch(`${BASE}/oep/season`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /oep/season failed: ${res.status}`);
  return await res.json();
}

// Cohort
export async function getOepCohort(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/oep/cohort${query ? '?' + query : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /oep/cohort failed: ${res.status}`);
  return await res.json();
}

export async function autoPopulateOepCohort(seasonYear) {
  const res = await fetch(`${BASE}/oep/cohort/auto-populate`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ seasonYear })
  });
  if (!res.ok) throw new Error(`POST /oep/cohort/auto-populate failed: ${res.status}`);
  return await res.json();
}

export async function addToOepCohort(data) {
  const res = await fetch(`${BASE}/oep/cohort`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /oep/cohort failed: ${res.status}`);
  return await res.json();
}

export async function updateOepCohortMember(id, data) {
  const res = await fetch(`${BASE}/oep/cohort/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PUT /oep/cohort/${id} failed: ${res.status}`);
  return await res.json();
}

export async function removeFromOepCohort(id) {
  const res = await fetch(`${BASE}/oep/cohort/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`DELETE /oep/cohort/${id} failed: ${res.status}`);
  return await res.json();
}

export async function sendOepFollowUp(cohortId, data) {
  const res = await fetch(`${BASE}/oep/cohort/${cohortId}/send`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /oep/cohort/${cohortId}/send failed: ${res.status}`);
  return await res.json();
}

// Activity
export async function getOepActivity(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/oep/activity${query ? '?' + query : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /oep/activity failed: ${res.status}`);
  return await res.json();
}

export async function resendOepActivity(activityId) {
  const res = await fetch(`${BASE}/oep/activity/${activityId}/resend`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`POST /oep/activity/${activityId}/resend failed: ${res.status}`);
  return await res.json();
}

// Analytics
export async function getOepAnalytics(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/oep/analytics${query ? '?' + query : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /oep/analytics failed: ${res.status}`);
  return await res.json();
}

// Blast Send
export async function sendOepBlast(data) {
  const res = await fetch(`${BASE}/oep/blast`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /oep/blast failed: ${res.status}`);
  return await res.json();
}

// Eligible clients for cohort
export async function getOepEligibleClients(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/oep/eligible-clients${query ? '?' + query : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET /oep/eligible-clients failed: ${res.status}`);
  return await res.json();
}

// ============================================================================
// PILOT METRICS (Founder Command Center)
// ============================================================================

// Overview - Hero KPIs for the main dashboard
export async function getPilotOverview(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/pilot-metrics/overview${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/overview failed: ${res.status}`);
  return await res.json();
}

// Agent Adoption Funnel
export async function getPilotAdoption() {
  const res = await fetch(`${BASE}/pilot-metrics/adoption`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/adoption failed: ${res.status}`);
  return await res.json();
}

// Adoption milestone detail (who completed/not completed a specific step)
export async function getPilotAdoptionDetail(milestone) {
  const res = await fetch(`${BASE}/pilot-metrics/adoption/${milestone}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/adoption/${milestone} failed: ${res.status}`);
  return await res.json();
}

// Client Data Quality metrics
export async function getPilotClientQuality() {
  const res = await fetch(`${BASE}/pilot-metrics/client-quality`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/client-quality failed: ${res.status}`);
  return await res.json();
}

// Client quality by specific field
export async function getPilotClientQualityByField(field, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/pilot-metrics/client-quality/${field}${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/client-quality/${field} failed: ${res.status}`);
  return await res.json();
}

// Alias for backwards compatibility
export const getPilotClientQualityDetail = getPilotClientQualityByField;

// Client quality broken down by agent
export async function getPilotClientQualityByAgent() {
  const res = await fetch(`${BASE}/pilot-metrics/client-quality/by-agent`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/client-quality/by-agent failed: ${res.status}`);
  return await res.json();
}

// Value Delivery metrics
export async function getPilotValue() {
  const res = await fetch(`${BASE}/pilot-metrics/value`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/value failed: ${res.status}`);
  return await res.json();
}

// Risk alert details
export async function getPilotValueRiskAlerts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/pilot-metrics/value/risk-alerts${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/value/risk-alerts failed: ${res.status}`);
  return await res.json();
}

// Saved clients list
export async function getPilotValueSaved(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/pilot-metrics/value/saved${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/value/saved failed: ${res.status}`);
  return await res.json();
}

// System Health metrics
export async function getPilotSystemHealth() {
  const res = await fetch(`${BASE}/pilot-metrics/system-health`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/system-health failed: ${res.status}`);
  return await res.json();
}

// System error log
export async function getPilotSystemErrors(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/pilot-metrics/system-health/errors${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/system-health/errors failed: ${res.status}`);
  return await res.json();
}

// Feature usage statistics
export async function getPilotFeatureUsage(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/pilot-metrics/feature-usage${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/feature-usage failed: ${res.status}`);
  return await res.json();
}

// Daily trend snapshots
export async function getPilotTrends(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/pilot-metrics/trends${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /pilot-metrics/trends failed: ${res.status}`);
  return await res.json();
}

// Generate daily snapshot (admin)
export async function generatePilotSnapshot() {
  const res = await fetch(`${BASE}/pilot-metrics/generate-snapshot`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`POST /pilot-metrics/generate-snapshot failed: ${res.status}`);
  return await res.json();
}

// Mark client as saved (retention success)
export async function markClientSaved(clientId, data = {}) {
  const res = await fetch(`${BASE}/pilot-metrics/mark-saved/${clientId}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /pilot-metrics/mark-saved failed: ${res.status}`);
  return await res.json();
}

// Mark client as churned
export async function markClientChurned(clientId, data = {}) {
  const res = await fetch(`${BASE}/pilot-metrics/mark-churned/${clientId}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST /pilot-metrics/mark-churned failed: ${res.status}`);
  return await res.json();
}

// ============================================================================
// CRM INTEGRATIONS (Go High Level, Salesforce)
// ============================================================================

// Get all CRM integrations for current user
export async function getCRMIntegrations() {
  const res = await fetch(`${BASE}/crm/integrations`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /crm/integrations failed: ${res.status}`);
  return await res.json();
}

// Get a specific CRM integration with details
export async function getCRMIntegration(id) {
  const res = await fetch(`${BASE}/crm/integrations/${id}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /crm/integrations/${id} failed: ${res.status}`);
  return await res.json();
}

// Initiate CRM OAuth connection
export async function connectCRM(crmType, locationId = null) {
  const params = new URLSearchParams();
  if (locationId) params.append('location_id', locationId);

  const res = await fetch(`${BASE}/crm/oauth/${crmType}/authorize?${params.toString()}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /crm/oauth/${crmType}/authorize failed: ${res.status}`);
  return await res.json();
}

// Disconnect/delete a CRM integration
export async function disconnectCRM(integrationId) {
  const res = await fetch(`${BASE}/crm/integrations/${integrationId}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`DELETE /crm/integrations/${integrationId} failed: ${res.status}`);
  return await res.json();
}

// Update CRM integration settings
export async function updateCRMIntegration(integrationId, data) {
  const res = await fetch(`${BASE}/crm/integrations/${integrationId}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PATCH /crm/integrations/${integrationId} failed: ${res.status}`);
  return await res.json();
}

// Trigger a CRM sync
export async function triggerCRMSync(integrationId, fullSync = false) {
  const res = await fetch(`${BASE}/crm/integrations/${integrationId}/sync`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ full_sync: fullSync })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(errText || `POST /crm/integrations/${integrationId}/sync failed: ${res.status}`);
  }
  return await res.json();
}

// Get sync history for an integration
export async function getCRMSyncHistory(integrationId, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/crm/integrations/${integrationId}/sync-history${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /crm/integrations/${integrationId}/sync-history failed: ${res.status}`);
  return await res.json();
}

// Get mapped contacts for an integration
export async function getCRMMappedContacts(integrationId, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/crm/integrations/${integrationId}/contacts${query ? '?' + query : ''}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /crm/integrations/${integrationId}/contacts failed: ${res.status}`);
  return await res.json();
}

// Get default field mapping for a CRM type
export async function getCRMFieldMapping(crmType) {
  const res = await fetch(`${BASE}/crm/field-mappings/${crmType}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GET /crm/field-mappings/${crmType} failed: ${res.status}`);
  return await res.json();
}
