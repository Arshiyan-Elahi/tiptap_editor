from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from .database import get_db
from .models import (
    SOP, SOPVersion, Deviation, Capa, AuditFinding, Decision,
    SopDeviationLink, DeviationCapaLink, CapaAuditLink, AuditDecisionLink, DecisionSopLink
)
from .schemas import (
    # Editor compat request bodies
    CreateDocumentRequest,
    UpdateDocumentRequest,
    CreateVersionRequest,
    UpdateVersionStatusRequest,
    # Editor compat response shapes
    EditorDocResponse,
    EditorVersionResponse,
    # Native domain response shapes
    SOPResponse,
    SOPVersionResponse,
    DeviationResponse,
    CapaResponse,
    AuditFindingResponse,
    DecisionResponse,
    DeviationContextResponse,
    SopRelatedResponse,
)
import uuid
import os

# ==========================================
# CONSTANTS
# ==========================================

# Fixed tenant for dev/seed environment
FIXED_TENANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


# ==========================================
# HELPERS
# ==========================================

def check_mock_mode():
    """Guard: only allow mutation routes when MOCK_EDITOR_MODE=true."""
    if os.getenv("MOCK_EDITOR_MODE", "false").lower() != "true":
        raise HTTPException(
            status_code=403,
            detail="System is in Read-Only mode. Document mutation is disabled."
        )


def _is_tiptap_empty(doc_json: dict | None) -> bool:
    """
    Return True if a TipTap JSON document has no meaningful text content.

    A document is empty when:
    - It is None or not a dict
    - It has no 'content' list, or the list is empty
    - Every text leaf in the tree is whitespace-only
    - The only nodes are blank paragraphs (paragraph with no 'content' children)

    This mirrors the frontend isEditorContentEmpty() in src/utils/editorUtils.js.
    """
    if not doc_json or not isinstance(doc_json, dict):
        return True

    nodes = doc_json.get("content", [])
    if not nodes:
        return True

    def extract_text(node: dict) -> str:
        if node.get("type") == "text":
            return node.get("text", "").strip()
        return " ".join(
            filter(None, [extract_text(c) for c in node.get("content", [])])
        ).strip()

    # Check for any non-whitespace text in the entire tree
    all_text = extract_text(doc_json).strip()
    if all_text:
        return False

    # Also accept non-text meaningful nodes (image, table, codeBlock, etc.)
    meaningful_types = {"image", "horizontalRule", "codeBlock", "table"}
    for node in nodes:
        if node.get("type") in meaningful_types:
            return False

    return True


def _build_editor_doc_response(sop: SOP, version: SOPVersion) -> dict:
    """
    Compatibility adapter: maps SOP + SOPVersion onto old editor response shape.
    doc_json   <- sop_versions.content_json
    status     <- sop_versions.external_status
    """
    return {
        "id": str(sop.id),
        "title": sop.title,
        "doc_type": "sop",
        "doc_json": version.content_json,               # KEY MAPPING
        "metadata_json": version.metadata_json,
        "current_version_id": str(sop.current_version_id) if sop.current_version_id else None,
        "version_number": version.version_number,
        "status": version.external_status or "draft",   # KEY MAPPING
        "created_at": sop.created_at,
        "updated_at": sop.updated_at,
    }


def _build_editor_version_response(version: SOPVersion) -> dict:
    """
    Compatibility adapter: maps SOPVersion onto old editor version response shape.
    doc_id     <- sop_versions.sop_id
    doc_json   <- sop_versions.content_json
    status     <- sop_versions.external_status
    """
    return {
        "id": str(version.id),
        "doc_id": str(version.sop_id),                 # KEY MAPPING
        "version_number": version.version_number,
        "status": version.external_status or "draft",   # KEY MAPPING
        "doc_json": version.content_json,               # KEY MAPPING
        "metadata_json": version.metadata_json,
        "effective_date": version.effective_date,
        "review_date": version.review_date,
        "created_at": version.created_at,
        "updated_at": version.updated_at,
    }


def _build_sop_dict(sop: SOP, include_current_version: bool = False, db: Session = None) -> dict:
    """
    Build native SOPResponse dict, optionally embedding the current_version object.
    Keeps native field names: content_json, external_status, etc.
    """
    result = {
        "id": sop.id,
        "tenant_id": sop.tenant_id,
        "external_id": sop.external_id,
        "sop_number": sop.sop_number,
        "title": sop.title,
        "department": sop.department,
        "source_system": sop.source_system,
        "is_active": sop.is_active,
        "current_version_id": sop.current_version_id,
        "current_version": None,
        "created_at": sop.created_at,
        "updated_at": sop.updated_at,
    }
    if include_current_version and db and sop.current_version_id:
        cv = db.query(SOPVersion).filter(SOPVersion.id == sop.current_version_id).first()
        if cv:
            result["current_version"] = {
                "id": cv.id,
                "sop_id": cv.sop_id,
                "external_version_id": cv.external_version_id,
                "version_number": cv.version_number,
                "external_status": cv.external_status,
                "content_json": cv.content_json,
                "metadata_json": cv.metadata_json,
                "effective_date": cv.effective_date,
                "review_date": cv.review_date,
                "created_at": cv.created_at,
                "updated_at": cv.updated_at,
            }
    return result


# ==========================================
# ROUTER
# ==========================================

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


# ==========================================
# OLD EDITOR COMPATIBILITY ROUTES
# All field mappings live here — NOT in the DB
# doc_json = content_json, status = external_status, doc_id = sop_id
# ==========================================

@router.post("/api/editor/docs")
def create_document(
    payload: CreateDocumentRequest,
    db: Session = Depends(get_db),
    _=Depends(check_mock_mode),
):
    """
    Create a new SOP + its first version.
    Accepts doc_json from the old editor — stores it as content_json in DB.
    """
    sop = SOP(
        tenant_id=FIXED_TENANT_ID,
        title=payload.title,
        sop_number=f"SOP-{uuid.uuid4().hex[:8].upper()}",
        department="Quality",
        is_active=True,
    )
    db.add(sop)
    db.commit()
    db.refresh(sop)

    initial_version = SOPVersion(
        sop_id=sop.id,
        version_number="1",
        content_json=payload.doc_json if payload.doc_json is not None else {"type": "doc", "content": []},
        metadata_json=payload.metadata_json if payload.metadata_json is not None else {},
        external_status="draft",
    )
    db.add(initial_version)
    db.commit()
    db.refresh(initial_version)

    sop.current_version_id = initial_version.id
    db.commit()
    db.refresh(sop)

    return _build_editor_doc_response(sop, initial_version)


@router.get("/api/editor/docs/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Fetch SOP + current version, return in old editor shape.
    Response uses doc_json (mapped from content_json) and status (mapped from external_status).
    """
    sop = db.query(SOP).filter(SOP.id == doc_id).first()
    if not sop:
        raise HTTPException(status_code=404, detail="Document not found")

    if not sop.current_version_id:
        raise HTTPException(status_code=404, detail="SOP has no current version set")

    current_version = db.query(SOPVersion).filter(SOPVersion.id == sop.current_version_id).first()
    if not current_version:
        raise HTTPException(status_code=404, detail="Current version not found in sop_versions")

    return _build_editor_doc_response(sop, current_version)


@router.put("/api/editor/docs/{doc_id}")
def update_document(
    doc_id: str,
    payload: UpdateDocumentRequest,
    db: Session = Depends(get_db),
    _=Depends(check_mock_mode),
):
    """
    Update the current version's content in-place.
    Stores incoming doc_json into content_json — no column renamed.
    Does NOT break version history (other versions untouched).
    """
    sop = db.query(SOP).filter(SOP.id == doc_id).first()
    if not sop:
        raise HTTPException(status_code=404, detail="Document not found")

    if not sop.current_version_id:
        raise HTTPException(status_code=404, detail="SOP has no current version set")

    current_version = db.query(SOPVersion).filter(SOPVersion.id == sop.current_version_id).first()
    if not current_version:
        raise HTTPException(status_code=404, detail="Current version not found")

    # doc_json from frontend → stored as content_json in DB
    current_version.content_json = payload.doc_json
    if payload.metadata_json is not None:
        current_version.metadata_json = payload.metadata_json

    db.commit()
    db.refresh(current_version)

    return {
        "message": "Document updated",
        "current_version_id": str(current_version.id),
        "status": current_version.external_status or "draft",
    }


@router.get("/api/editor/docs/{doc_id}/versions")
def list_versions(doc_id: str, db: Session = Depends(get_db)):
    """
    Return all versions for a SOP using old editor field names.
    doc_json   <- content_json
    doc_id     <- sop_id
    status     <- external_status
    """
    sop = db.query(SOP).filter(SOP.id == doc_id).first()
    if not sop:
        raise HTTPException(status_code=404, detail="Document not found")

    versions = (
        db.query(SOPVersion)
        .filter(SOPVersion.sop_id == doc_id)
        .order_by(SOPVersion.created_at.asc())
        .all()
    )
    return [_build_editor_version_response(v) for v in versions]


@router.post("/api/editor/docs/{doc_id}/versions")
def create_version(
    doc_id: str,
    payload: CreateVersionRequest,
    db: Session = Depends(get_db),
    _=Depends(check_mock_mode),
):
    """
    Create a new sop_versions row under the same parent sops.id.
    Guards against empty content — raises 422 if doc_json has no real text.
    Updates sops.current_version_id to the new version.
    """
    sop = db.query(SOP).filter(SOP.id == doc_id).first()
    if not sop:
        raise HTTPException(status_code=404, detail="Document not found")

    # ── Empty-content guard ──────────────────────────────────────────────────
    # The frontend should already prevent this, but we enforce it server-side
    # as well so stale clients or direct API calls cannot create blank versions.
    if _is_tiptap_empty(payload.doc_json):
        raise HTTPException(
            status_code=422,
            detail=(
                "Cannot create a new version with empty content. "
                "Please add content to the document before creating a new version."
            ),
        )
    # ────────────────────────────────────────────────────────────────────────

    versions_count = (
        db.query(func.count(SOPVersion.id))
        .filter(SOPVersion.sop_id == doc_id)
        .scalar()
    )
    next_version = str(versions_count + 1)

    version = SOPVersion(
        sop_id=sop.id,                          # same parent sops.id — NEVER changed
        version_number=next_version,
        content_json=payload.doc_json,           # doc_json → content_json
        external_status="draft",
        metadata_json=payload.metadata_json or {},
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    sop.current_version_id = version.id         # pointer updated to new version
    db.commit()
    db.refresh(sop)

    return _build_editor_version_response(version)


@router.get("/api/editor/docs/{doc_id}/versions/{version_id}")
def get_version(doc_id: str, version_id: str, db: Session = Depends(get_db)):
    """
    Fetch a specific version by doc_id (= sop_id) and version_id.
    Returns old editor field names.
    """
    version = (
        db.query(SOPVersion)
        .filter(SOPVersion.sop_id == doc_id, SOPVersion.id == version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    return _build_editor_version_response(version)


@router.post("/api/editor/docs/{doc_id}/duplicate")
def duplicate_document(
    doc_id: str,
    payload: CreateDocumentRequest,
    db: Session = Depends(get_db),
    _=Depends(check_mock_mode),
):
    """
    Duplicate an existing SOP as a brand-new parent document.

    Creates:
    - A new row in `sops` with a new unique sops.id
    - A new first row in `sop_versions` linked to the new sops.id
    - Sets sops.current_version_id to the new v1

    This is distinct from POST /versions which creates a new version
    under the SAME parent sops.id.

    Use cases:
    - "Duplicate as New Document" in the UI
    - Creating a variant of an existing SOP under a new permanent ID
    """
    source_sop = db.query(SOP).filter(SOP.id == doc_id).first()
    if not source_sop:
        raise HTTPException(status_code=404, detail="Source document not found")

    # ── Read source content if caller didn't supply doc_json ──
    if payload.doc_json is None:
        source_version = (
            db.query(SOPVersion)
            .filter(SOPVersion.id == source_sop.current_version_id)
            .first()
        )
        content = source_version.content_json if source_version else {"type": "doc", "content": []}
    else:
        content = payload.doc_json

    # ── Create the new parent sops record ───────────────────────────────────
    new_sop = SOP(
        tenant_id=FIXED_TENANT_ID,
        title=payload.title or f"Copy of {source_sop.title}",
        sop_number=f"SOP-{uuid.uuid4().hex[:8].upper()}",
        department=source_sop.department,
        source_system=source_sop.source_system,
        is_active=True,
    )
    db.add(new_sop)
    db.commit()
    db.refresh(new_sop)

    # ── Create v1 under the new parent ──────────────────────────────────────
    new_version = SOPVersion(
        sop_id=new_sop.id,
        version_number="1",
        content_json=content,
        external_status="draft",
        metadata_json=payload.metadata_json or {},
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    new_sop.current_version_id = new_version.id
    db.commit()
    db.refresh(new_sop)

    return _build_editor_doc_response(new_sop, new_version)


@router.put("/api/editor/docs/{doc_id}/versions/{version_id}/status")
def update_version_status(
    doc_id: str,
    version_id: str,
    payload: UpdateVersionStatusRequest,
    db: Session = Depends(get_db),
    _=Depends(check_mock_mode),
):
    """
    Update sop_versions.external_status.
    Supports: draft, under_review, effective, obsolete.
    """
    VALID_STATUSES = {"draft", "under_review", "effective", "obsolete"}
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}"
        )

    version = (
        db.query(SOPVersion)
        .filter(SOPVersion.sop_id == doc_id, SOPVersion.id == version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    version.external_status = payload.status
    if payload.metadata_json is not None:
        version.metadata_json = payload.metadata_json

    db.commit()
    db.refresh(version)

    return {
        "message": "Version status updated",
        "id": str(version.id),
        "status": version.external_status,
    }


# ==========================================
# NEW SOP NATIVE ROUTES
# All field names match DB schema exactly: content_json, external_status, sop_id
# ==========================================

@router.get("/api/sops")
def get_all_sops(db: Session = Depends(get_db)):
    """
    Return all SOPs for the fixed tenant.
    Each entry includes current_version embedded summary for convenience.
    """
    sops = db.query(SOP).filter(SOP.tenant_id == FIXED_TENANT_ID).all()
    return [_build_sop_dict(sop, include_current_version=True, db=db) for sop in sops]


@router.get("/api/sops/{id}")
def get_sop_by_id(id: str, db: Session = Depends(get_db)):
    """
    Return one SOP by id, with current_version embedded as a nested object.
    Uses native DB field names: content_json, external_status.
    """
    sop = db.query(SOP).filter(SOP.id == id, SOP.tenant_id == FIXED_TENANT_ID).first()
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    return _build_sop_dict(sop, include_current_version=True, db=db)


@router.get("/api/sops/{id}/versions", response_model=list[SOPVersionResponse])
def get_sop_versions(id: str, db: Session = Depends(get_db)):
    """
    Return all sop_versions rows where sop_id = {id}.
    Native field names preserved.
    """
    sop = db.query(SOP).filter(SOP.id == id, SOP.tenant_id == FIXED_TENANT_ID).first()
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    return (
        db.query(SOPVersion)
        .filter(SOPVersion.sop_id == id)
        .order_by(SOPVersion.created_at.asc())
        .all()
    )


@router.get("/api/sops/{id}/related")
def get_sop_related_context(id: str, db: Session = Depends(get_db)):
    """
    Return full related context for the SOP traversing the full link chain:
    sop → deviations → CAPAs → audit_findings → decisions
    Also resolves decision → sop back-links.
    """
    sop = db.query(SOP).filter(SOP.id == id, SOP.tenant_id == FIXED_TENANT_ID).first()
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    # Linked Deviations
    dev_links = db.query(SopDeviationLink).filter(SopDeviationLink.sop_id == sop.id).all()
    dev_ids = [l.deviation_id for l in dev_links]
    related_deviations = db.query(Deviation).filter(Deviation.id.in_(dev_ids)).all() if dev_ids else []

    # Linked CAPAs (via deviation → capa links)
    capa_links = db.query(DeviationCapaLink).filter(DeviationCapaLink.deviation_id.in_(dev_ids)).all() if dev_ids else []
    capa_ids = [l.capa_id for l in capa_links]
    related_capas = db.query(Capa).filter(Capa.id.in_(capa_ids)).all() if capa_ids else []

    # Linked Audit Findings (via capa → audit links)
    audit_links = db.query(CapaAuditLink).filter(CapaAuditLink.capa_id.in_(capa_ids)).all() if capa_ids else []
    audit_ids = [l.audit_finding_id for l in audit_links]
    related_audits = db.query(AuditFinding).filter(AuditFinding.id.in_(audit_ids)).all() if audit_ids else []

    # Linked Decisions via audit chain
    decision_links_from_audit = (
        db.query(AuditDecisionLink).filter(AuditDecisionLink.audit_finding_id.in_(audit_ids)).all()
        if audit_ids else []
    )
    decision_ids = {l.decision_id for l in decision_links_from_audit}

    # Also include decisions directly linked to this SOP via decision_sop_links
    direct_decision_links = db.query(DecisionSopLink).filter(DecisionSopLink.sop_id == sop.id).all()
    for l in direct_decision_links:
        decision_ids.add(l.decision_id)

    related_decisions = db.query(Decision).filter(Decision.id.in_(list(decision_ids))).all() if decision_ids else []

    return {
        "sop": _build_sop_dict(sop, include_current_version=True, db=db),
        "related_deviations": related_deviations,
        "related_capas": related_capas,
        "related_audits": related_audits,
        "related_decisions": related_decisions,
    }


# ==========================================
# DEVIATION ROUTES
# ==========================================

@router.get("/api/deviations/{id}", response_model=DeviationResponse)
def get_deviation_by_id(id: str, db: Session = Depends(get_db)):
    """Return a single Deviation record."""
    dev = db.query(Deviation).filter(Deviation.id == id, Deviation.tenant_id == FIXED_TENANT_ID).first()
    if not dev:
        raise HTTPException(status_code=404, detail="Deviation not found")
    return dev


@router.get("/api/deviations/{id}/context")
def get_deviation_context(id: str, db: Session = Depends(get_db)):
    """
    Return full chain context for a Deviation:
    deviation → SOP, CAPA, audit_finding, decisions
    """
    dev = db.query(Deviation).filter(Deviation.id == id, Deviation.tenant_id == FIXED_TENANT_ID).first()
    if not dev:
        raise HTTPException(status_code=404, detail="Deviation not found")

    # Linked SOPs
    sop_links = db.query(SopDeviationLink).filter(SopDeviationLink.deviation_id == dev.id).all()
    sop_ids = [l.sop_id for l in sop_links]
    related_sops_raw = db.query(SOP).filter(SOP.id.in_(sop_ids)).all() if sop_ids else []
    related_sops = [_build_sop_dict(s, include_current_version=True, db=db) for s in related_sops_raw]

    # Linked CAPAs
    capa_links = db.query(DeviationCapaLink).filter(DeviationCapaLink.deviation_id == dev.id).all()
    capa_ids = [l.capa_id for l in capa_links]
    related_capas = db.query(Capa).filter(Capa.id.in_(capa_ids)).all() if capa_ids else []

    # Linked Audit Findings (from CAPAs)
    audit_links = db.query(CapaAuditLink).filter(CapaAuditLink.capa_id.in_(capa_ids)).all() if capa_ids else []
    audit_ids = [l.audit_finding_id for l in audit_links]
    related_audits = db.query(AuditFinding).filter(AuditFinding.id.in_(audit_ids)).all() if audit_ids else []

    # Linked Decisions (from audit findings)
    decision_links = (
        db.query(AuditDecisionLink).filter(AuditDecisionLink.audit_finding_id.in_(audit_ids)).all()
        if audit_ids else []
    )
    decision_ids = [l.decision_id for l in decision_links]
    related_decisions = db.query(Decision).filter(Decision.id.in_(decision_ids)).all() if decision_ids else []

    return {
        "deviation": dev,
        "related_sops": related_sops,
        "related_capas": related_capas,
        "related_audits": related_audits,
        "related_decisions": related_decisions,
    }
