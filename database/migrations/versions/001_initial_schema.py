"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. website_scans
    op.create_table(
        "website_scans",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hostname", sa.String(length=255), nullable=False),
        sa.Column("url_redacted", sa.Text(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("overall_score", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.String(length=20), nullable=False),
        sa.Column("third_party_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tracker_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cookie_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("permission_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("insecure_resource_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rule_version", sa.String(length=20), nullable=False, server_default="1.0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_website_scans_user_id", "website_scans", ["user_id"])
    op.create_index("ix_website_scans_hostname", "website_scans", ["hostname"])

    # 3. domains
    op.create_table(
        "domains",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("hostname", sa.String(length=255), nullable=False),
        sa.Column("registrable_domain", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False, server_default="Unknown"),
        sa.Column("is_tracker", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.UniqueConstraint("hostname", name="uq_domain_hostname"),
    )
    op.create_index("ix_domains_hostname", "domains", ["hostname"])

    # 4. scan_domains
    op.create_table(
        "scan_domains",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("scan_id", sa.String(length=36), sa.ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("domain_id", sa.String(length=36), sa.ForeignKey("domains.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_third_party", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("insecure_request_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_scan_domains_scan_id", "scan_domains", ["scan_id"])

    # 5. findings
    op.create_table(
        "findings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("scan_id", sa.String(length=36), sa.ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("finding_type", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("what_was_observed", sa.Text(), nullable=False),
        sa.Column("why_it_matters", sa.Text(), nullable=False),
        sa.Column("limitation_note", sa.Text(), nullable=False),
        sa.Column("evidence_summary", sa.Text(), nullable=True),
        sa.Column("score_penalty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_findings_scan_id", "findings", ["scan_id"])

    # 6. cookies_metadata
    op.create_table(
        "cookies_metadata",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("scan_id", sa.String(length=36), sa.ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("domain", sa.String(length=255), nullable=False),
        sa.Column("path", sa.String(length=255), nullable=False, server_default="/"),
        sa.Column("is_secure", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_http_only", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("same_site", sa.String(length=20), nullable=False, server_default="Unspecified"),
        sa.Column("is_session", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_third_party", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("expiration_days", sa.Integer(), nullable=True),
    )
    op.create_index("ix_cookies_metadata_scan_id", "cookies_metadata", ["scan_id"])

    # 7. permission_findings
    op.create_table(
        "permission_findings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("scan_id", sa.String(length=36), sa.ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("permission_name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
    )
    op.create_index("ix_permission_findings_scan_id", "permission_findings", ["scan_id"])

    # 8. score_components
    op.create_table(
        "score_components",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("scan_id", sa.String(length=36), sa.ForeignKey("website_scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("max_penalty", sa.Integer(), nullable=False),
        sa.Column("applied_penalty", sa.Integer(), nullable=False),
        sa.Column("details_json", sa.JSON(), nullable=True),
    )
    op.create_index("ix_score_components_scan_id", "score_components", ["scan_id"])

    # 9. user_preferences
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("opt_in_cloud_sync", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("default_redaction_strict", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("theme", sa.String(length=20), nullable=False, server_default="dark"),
    )

    # 10. tracker_rules_version
    op.create_table(
        "tracker_rules_version",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("version", sa.String(length=20), nullable=False, unique=True),
        sa.Column("source_name", sa.String(length=100), nullable=False),
        sa.Column("license_type", sa.String(length=50), nullable=False, server_default="MIT"),
        sa.Column("rule_count", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("tracker_rules_version")
    op.drop_table("user_preferences")
    op.drop_table("score_components")
    op.drop_table("permission_findings")
    op.drop_table("cookies_metadata")
    op.drop_table("findings")
    op.drop_table("scan_domains")
    op.drop_table("domains")
    op.drop_table("website_scans")
    op.drop_table("users")
