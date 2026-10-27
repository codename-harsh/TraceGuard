"""Pydantic v2 schemas for TraceGuard API request/response validation."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.core.sanitizer import assert_no_forbidden_fields, sanitize_url


EMAIL_PATTERN = r"^[\w\.\+\-]+@[\w\.\-]+\.[a-zA-Z0-9\-_]+$"
EmailType = Annotated[str, Field(pattern=EMAIL_PATTERN, max_length=320)]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailType
    password: Annotated[str, Field(min_length=8, max_length=128)]
    full_name: str | None = None


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailType
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut | None = None


# ---------------------------------------------------------------------------
# Scans
# ---------------------------------------------------------------------------
class CookieIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    domain: str
    path: str = "/"
    is_secure: bool = False
    is_http_only: bool = False
    same_site: str = "Unspecified"
    is_session: bool = True
    is_third_party: bool = False
    expiration_days: int | None = None


class PermissionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    permission_name: str
    status: str
    note: str | None = None


class ScoreComponentIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: str
    max_penalty: int
    applied_penalty: int
    details_json: dict | None = None


class FindingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: str
    finding_type: str
    severity: str
    title: str
    description: str | None = None
    what_was_observed: str
    why_it_matters: str
    limitation_note: str
    evidence_summary: str | None = None
    score_penalty: int = 0


class ScanDomainIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hostname: str
    registrable_domain: str
    category: str = "Unknown"
    is_tracker: bool = False
    is_third_party: bool = False
    request_count: int = 1
    insecure_request_count: int = 0


class CreateScanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hostname: str
    url_redacted: str
    started_at: datetime
    completed_at: datetime | None = None
    overall_score: Annotated[int, Field(ge=0, le=100)]
    risk_level: str
    third_party_count: int = 0
    tracker_count: int = 0
    cookie_count: int = 0
    permission_count: int = 0
    insecure_resource_count: int = 0
    rule_version: str = "1.0.0"
    findings: list[FindingIn] = []
    cookies: list[CookieIn] = []
    permissions: list[PermissionIn] = []
    score_components: list[ScoreComponentIn] = []
    domains: list[ScanDomainIn] = []

    @model_validator(mode="before")
    @classmethod
    def check_forbidden_fields_and_sanitize(cls, data: Any) -> Any:
        if isinstance(data, dict):
            assert_no_forbidden_fields(data)
            if "url_redacted" in data and isinstance(data["url_redacted"], str):
                data["url_redacted"] = sanitize_url(data["url_redacted"])
        return data


class ScanOut(BaseModel):
    id: str
    hostname: str
    url_redacted: str
    started_at: datetime
    completed_at: datetime | None
    overall_score: int
    risk_level: str
    third_party_count: int
    tracker_count: int
    cookie_count: int
    permission_count: int
    insecure_resource_count: int
    rule_version: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CookieOut(BaseModel):
    id: str
    scan_id: str
    name: str
    domain: str
    path: str
    is_secure: bool
    is_http_only: bool
    same_site: str
    is_session: bool
    is_third_party: bool
    expiration_days: int | None

    model_config = ConfigDict(from_attributes=True)


class PermissionOut(BaseModel):
    id: str
    scan_id: str
    permission_name: str
    status: str
    note: str | None

    model_config = ConfigDict(from_attributes=True)


class FindingOut(BaseModel):
    id: str
    scan_id: str
    category: str
    finding_type: str
    severity: str
    title: str
    description: str | None
    what_was_observed: str
    why_it_matters: str
    limitation_note: str
    evidence_summary: str | None
    score_penalty: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScoreComponentOut(BaseModel):
    category: str
    max_penalty: int
    applied_penalty: int
    details_json: dict | None

    model_config = ConfigDict(from_attributes=True)


class DomainOut(BaseModel):
    id: str
    hostname: str
    registrable_domain: str
    category: str
    is_tracker: bool

    model_config = ConfigDict(from_attributes=True)


class ScanDomainOut(BaseModel):
    id: str
    scan_id: str
    domain_id: str
    is_third_party: bool
    request_count: int
    insecure_request_count: int
    domain: DomainOut | None = None

    model_config = ConfigDict(from_attributes=True)


class ScanDetailOut(ScanOut):
    findings: list[FindingOut] = []
    cookies: list[CookieOut] = []
    permissions: list[PermissionOut] = []
    score_components: list[ScoreComponentOut] = []
    scan_domains: list[ScanDomainOut] = []

    model_config = ConfigDict(from_attributes=True)


class ScoreBreakdown(BaseModel):
    scan_id: str
    overall_score: int
    risk_level: str
    components: list[ScoreComponentOut]


# ---------------------------------------------------------------------------
# Sites overview / compare
# ---------------------------------------------------------------------------
class RiskDistribution(BaseModel):
    MINIMAL: int = 0
    LOW: int = 0
    MODERATE: int = 0
    ELEVATED: int = 0
    HIGH: int = 0


class SitesOverview(BaseModel):
    total_scans: int
    unique_hostnames: int
    average_score: float
    total_trackers: int
    total_third_parties: int
    risk_distribution: RiskDistribution
    recent_scans: list[ScanOut]


class ScanCompare(BaseModel):
    scan_a: ScanOut
    scan_b: ScanOut
    score_delta: int
    tracker_delta: int
    third_party_delta: int


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
class SettingsOut(BaseModel):
    opt_in_cloud_sync: bool
    default_redaction_strict: bool
    theme: str

    model_config = ConfigDict(from_attributes=True)


class SettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    opt_in_cloud_sync: bool | None = None
    default_redaction_strict: bool | None = None
    theme: str | None = None


# ---------------------------------------------------------------------------
# User update
# ---------------------------------------------------------------------------
class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str | None = None
