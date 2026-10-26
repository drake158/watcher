<!--
Sync Impact Report
Version change: placeholder → 1.0.0 (initial complete constitution)
Modified principles: placeholder principles → Specification-First Development; TypeScript and Maintainability; Local-Only Processing and Data Ownership; Secure and Private by Design; Accessible, Responsive, Authentic Visual Design
Added sections: Technical and Deployment Constraints; Acceptance and Verification
Removed sections: none
Follow-up TODOs: Confirm the original ratification date.
-->
# WATCHER Constitution

## Core Principles

### I. Specification-First Development and Traceability
Every feature MUST begin with an approved specification that states user needs and observable acceptance criteria. Plans and tasks MUST trace to that specification. Implementation MUST satisfy the criteria, and changes to scope MUST be reflected in the specification and related artifacts before implementation proceeds. This keeps project decisions reviewable and prevents undocumented scope drift.

### II. TypeScript and Maintainable Modularity
Application code MUST use TypeScript and be organized into cohesive modules with clear responsibilities. Contributors MUST favor readable, maintainable designs and the smallest dependency set that meets the requirement. New dependencies MUST have a documented purpose and undergo review for maintenance, licensing, security, and bundle impact before adoption.

### III. Local-Only Processing and Data Ownership
WATCHER MUST process audio and other user content entirely in the browser. It MUST NOT require a backend, send user content to a server, or depend on paid APIs. Local audio files MUST remain on the user's device; features MUST NOT upload, transmit, or persist their contents outside the user's explicit local control. These rules preserve privacy and keep the application usable as a free static site.

### IV. Secure and Private by Design
File handling MUST validate supported types and handle malformed or oversized input safely. User-controlled content MUST be rendered as data, never executable markup. The application MUST request only permissions necessary for its stated features, explain permission use, and release temporary resources such as object URLs when no longer needed. Dependencies and browser capabilities MUST be reviewed for security and privacy implications.

### V. Accessible, Responsive, and Visually Authentic
All controls MUST be keyboard operable, have accessible names and visible focus, and maintain sufficient contrast. Layouts MUST adapt to mobile and desktop viewports. Motion MUST respect the user's reduced-motion preference, and essential information MUST not depend on animation or color alone. The visual language MUST reflect authentic Y2K and early-2000s references while allowing users to customize psychedelic visuals without reducing usability.

## Technical and Deployment Constraints

WATCHER MUST be implementable as a client-side TypeScript application and deployable for free on GitHub Pages. Runtime features MUST continue to work without server-side computation or paid services. Build and routing choices MUST be compatible with static hosting. Any proposed exception to these constraints requires a specification amendment before implementation.

## Acceptance and Verification

Every feature specification MUST include acceptance criteria that are observable, testable, and tied to user needs. Acceptance criteria MUST cover applicable privacy, accessibility, responsive behavior, file safety, and reduced-motion requirements. A feature is complete only when its criteria have been verified through appropriate checks, such as automated tests, static analysis, or documented manual review. Contributors MUST report what was verified and disclose unverified criteria; completion MUST NOT be claimed when required verification is missing or failing.

## Governance

This constitution governs specifications, plans, implementation, and reviews for WATCHER. Amendments MUST be proposed in writing, explain their motivation and impact, and be reflected in the constitution before dependent work proceeds. Each amendment MUST update the version and last-amended date.

Versioning follows semantic versioning: MAJOR for incompatible changes to principles or governance, MINOR for added principles or materially expanded requirements, and PATCH for clarifications that do not change requirements. The original ratification date is retained across amendments. Until the original adoption date is confirmed, it is recorded as `TODO(RATIFICATION_DATE): Confirm the date WATCHER's constitution was first adopted.`

Every specification and implementation review MUST check applicable principles and acceptance criteria. Reviewers MUST confirm traceability, client-only processing, local file handling, security, accessibility, and deployment constraints where applicable. Exceptions require an explicit constitution amendment; unresolved violations or missing verification block a completion claim.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): Confirm original adoption date | **Last Amended**: 2026-10-26
