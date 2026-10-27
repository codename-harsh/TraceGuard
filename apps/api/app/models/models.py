"""SQLAlchemy 2.0 ORM Models — TraceGuard"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# users
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    scans: Mapped[list["WebsiteScan"]] = relationship("WebsiteScan", back_populates="user", cascade="all, delete-orphan")
    preferences: Mapped["UserPreferences | None"] = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# website_scans
# ---------------------------------------------------------------------------
class WebsiteScan(Base):
    __tablename__ = "website_scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    hostname: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    url_redacted: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    third_party_count: Mapped[int] = mapped_column(Integer, default=0)
    tracker_count: Mapped[int] = mapped_column(Integer, default=0)
    cookie_count: Mapped[int] = mapped_column(Integer, default=0)
    permission_count: Mapped[int] = mapped_column(Integer, default=0)
    insecure_resource_count: Mapped[int] = mapped_column(Integer, default=0)
    rule_version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped["User"] = relationship("User", back_populates="scans")
    findings: Mapped[list["Finding"]] = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")
    cookies: Mapped[list["CookieMetadataRecord"]] = relationship("CookieMetadataRecord", back_populates="scan", cascade="all, delete-orphan")
    permissions: Mapped[list["PermissionFindingRecord"]] = relationship("PermissionFindingRecord", back_populates="scan", cascade="all, delete-orphan")
    score_components: Mapped[list["ScoreComponent"]] = relationship("ScoreComponent", back_populates="scan", cascade="all, delete-orphan")
    scan_domains: Mapped[list["ScanDomain"]] = relationship("ScanDomain", back_populates="scan", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# domains
# ---------------------------------------------------------------------------
class Domain(Base):
    __tablename__ = "domains"
    __table_args__ = (UniqueConstraint("hostname", name="uq_domain_hostname"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    hostname: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    registrable_domain: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="Unknown")
    is_tracker: Mapped[bool] = mapped_column(Boolean, default=False)

    scan_domains: Mapped[list["ScanDomain"]] = relationship("ScanDomain", back_populates="domain")


# ---------------------------------------------------------------------------
# scan_domains
# ---------------------------------------------------------------------------
class ScanDomain(Base):
    __tablename__ = "scan_domains"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    domain_id: Mapped[str] = mapped_column(String(36), ForeignKey("domains.id", ondelete="CASCADE"), nullable=False)
    is_third_party: Mapped[bool] = mapped_column(Boolean, default=False)
    request_count: Mapped[int] = mapped_column(Integer, default=1)
    insecure_request_count: Mapped[int] = mapped_column(Integer, default=0)

    scan: Mapped["WebsiteScan"] = relationship("WebsiteScan", back_populates="scan_domains")
    domain: Mapped["Domain"] = relationship("Domain", back_populates="scan_domains")


# ---------------------------------------------------------------------------
# findings
# ---------------------------------------------------------------------------
class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    finding_type: Mapped[str] = mapped_column(String(80), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_was_observed: Mapped[str] = mapped_column(Text, nullable=False)
    why_it_matters: Mapped[str] = mapped_column(Text, nullable=False)
    limitation_note: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    score_penalty: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    scan: Mapped["WebsiteScan"] = relationship("WebsiteScan", back_populates="findings")


# ---------------------------------------------------------------------------
# cookies_metadata — value field intentionally absent
# ---------------------------------------------------------------------------
class CookieMetadataRecord(Base):
    __tablename__ = "cookies_metadata"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(255), default="/")
    is_secure: Mapped[bool] = mapped_column(Boolean, default=False)
    is_http_only: Mapped[bool] = mapped_column(Boolean, default=False)
    same_site: Mapped[str] = mapped_column(String(20), default="Unspecified")
    is_session: Mapped[bool] = mapped_column(Boolean, default=True)
    is_third_party: Mapped[bool] = mapped_column(Boolean, default=False)
    expiration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    scan: Mapped["WebsiteScan"] = relationship("WebsiteScan", back_populates="cookies")


# ---------------------------------------------------------------------------
# permission_findings
# ---------------------------------------------------------------------------
class PermissionFindingRecord(Base):
    __tablename__ = "permission_findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    scan: Mapped["WebsiteScan"] = relationship("WebsiteScan", back_populates="permissions")


# ---------------------------------------------------------------------------
# score_components
# ---------------------------------------------------------------------------
class ScoreComponent(Base):
    __tablename__ = "score_components"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    max_penalty: Mapped[int] = mapped_column(Integer, nullable=False)
    applied_penalty: Mapped[int] = mapped_column(Integer, nullable=False)
    details_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    scan: Mapped["WebsiteScan"] = relationship("WebsiteScan", back_populates="score_components")


# ---------------------------------------------------------------------------
# user_preferences
# ---------------------------------------------------------------------------
class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    opt_in_cloud_sync: Mapped[bool] = mapped_column(Boolean, default=False)
    default_redaction_strict: Mapped[bool] = mapped_column(Boolean, default=True)
    theme: Mapped[str] = mapped_column(String(20), default="dark")

    user: Mapped["User"] = relationship("User", back_populates="preferences")


# ---------------------------------------------------------------------------
# tracker_rules_version
# ---------------------------------------------------------------------------
class TrackerRulesVersion(Base):
    __tablename__ = "tracker_rules_version"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    version: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    license_type: Mapped[str] = mapped_column(String(50), default="MIT")
    rule_count: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
