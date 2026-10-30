# Architecture rules
- Uniforms use the existing authenticated Django API, not browser-persisted catalog or order data, so inventory and accounting have a single authoritative source.
- Uniform order pricing, stock reservations, starter fulfillment, finance posting and payment confirmation are server-authoritative operations; clients submit selections, never authoritative totals.
- Student uniform and statement endpoints derive identity from the authenticated linked student account, never a caller-supplied student ID, to prevent cross-student access.