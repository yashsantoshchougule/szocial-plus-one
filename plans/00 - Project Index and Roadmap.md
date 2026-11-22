# Szocial Plus One — Project Index and Roadmap

**Task PO-00 · Must Fix · Planned**  
Planning baseline: 20 November 2026. Audience: Szocial product, design, engineering, QA and pilot operations.

## Product and launch

Plus One lets signed-in Szocial residents book an approved person by the hour for an in-person, platonic activity. The paid Mumbai pilot covers the path from an existing Szocial account through discovery, paid booking, and private coordination. It also covers the application, approval, registration, and scheduling work that makes the directory usable.

- [Original product brief](Szocial-Plus-One-Product-Brief.md) defines confirmed requirements and labels its own recommendations and open decisions.
- [Project rules](rules/Szocial%20Plus%20One%20-%20Project%20Rules.md) define implementation, review, and release requirements for both repositories.
- [Szocial](https://github.com/vishv-tech/Szocial) owns the current login experience and one-click entry. Main baseline: `cc0cd335`.
- [Szocial Plus One](https://github.com/vishv-tech/Szocial-Plus-One) is the separate implementation repository. Its contents endpoint reported an empty repository during planning.
- **Confirmed by the project owner:** integrate real shared auth into Szocial main and plan a paid Mumbai team pilot with compensation handled by operations.
- **Performance requirement:** keep Plus One fast on mobile and responsive during peak concurrent traffic. PO-11 defines proposed capacity targets and how to verify them.
- **Proposed pilot defaults:** the rate and schedule rules in PO-08 and the screening, support, and chat policies in PO-06 and PO-09 require approval before live use.

## Numbered plans

| ID | Plan | Priority | Depends on |
|---|---|---|---|
| PO-01 | [Project and Code Structure](01%20-%20Project%20and%20Code%20Structure.md) | Must Fix | PO-02 for toolchain pinning |
| PO-02 | [Languages, Stack and Research](02%20-%20Languages%2C%20Stack%20and%20Research.md) | Must Fix | Repository baseline |
| PO-03 | [Shared Szocial Account and Entry Link](03%20-%20Shared%20Szocial%20Account%20and%20Entry%20Link.md) | Must Fix | PO-01, PO-02 for staging setup |
| PO-04 | [Features, Roles and User Workflows](04%20-%20Features%2C%20Roles%20and%20User%20Workflows.md) | Must Fix | Product inputs |
| PO-05 | [Customer Screen Outlines](05%20-%20Customer%20Screen%20Outlines.md) | Must Fix | PO-04 |
| PO-06 | [Application, Team Member and Reviewer Screens](06%20-%20Application%2C%20Team%20Member%20and%20Reviewer%20Screens.md) | Must Fix | PO-04, PO-07 |
| PO-07 | [Data Model and Access Rules](07%20-%20Data%20Model%20and%20Access%20Rules.md) | Must Fix | PO-03 identity contract, PO-04 |
| PO-08 | [Availability, Booking and Payments](08%20-%20Availability%2C%20Booking%20and%20Payments.md) | Must Fix | PO-05, PO-06, PO-07 |
| PO-09 | [Private Chat, Moderation and Safety](09%20-%20Private%20Chat%2C%20Moderation%20and%20Safety.md) | Must Fix | PO-07, PO-08 confirmed booking contract |
| PO-10 | [Testing, Rollout and Operations](10%20-%20Testing%2C%20Rollout%20and%20Operations.md) | Must Fix | PO-01 through PO-09 and PO-11 release evidence |
| PO-11 | [Scalability and Performance](11%20-%20Scalability%20and%20Performance.md) | Must Fix | Starts with PO-01 and PO-03. Full verification needs booking and chat. |

## Execution sequence

1. Review the stack, confirm the canonical staging host, and run the auth branch baseline. Scaffold enough of both deployments to verify one real session end to end. Set up the page and API timing measurements in PO-11 from the start.
2. Finalize the workflows and screen outlines in parallel. Add the Plus One data boundary, then implement application, reviewer approval, team setup, directory, and profiles.
3. Implement schedules and booking integrity. Integrate Razorpay in test mode, expose payment status and refund workflow, and give operations a reconciliation surface.
4. Open paid chat and add per-user history controls and moderation. Verify all brief checks and the PO-11 peak traffic and recovery scenarios on isolated staging fixtures before operating the pilot.
5. Record evidence per task. Mark a task Resolved only after the positive and negative paths pass. Record missing dependencies as Blocked and keep independent tasks moving.

## Brief-to-test traceability

| Brief check | Primary plans | Release evidence |
|---|---|---|
| 1. One-click shared account | PO-03, PO-05 | QA-01 |
| 2. Card, profile, posts and locked chat | PO-05, PO-06, PO-07 | QA-02 |
| 3. Purpose, duration, slot and INR total | PO-05, PO-08 | QA-03 |
| 4. Busy, booked and free periods | PO-08 | QA-04 |
| 5. Concurrent checkout and provider events | PO-08 | QA-05, QA-06 |
| 6. Paid participant-only chat | PO-07, PO-09 | QA-06, QA-07 |
| 7. Persistent history and moderation | PO-09 | QA-07, QA-08 |
| 8. Application and approved registration | PO-06, PO-07 | QA-09 |

## Review and acceptance

The product owner approves user workflows and pilot policies. Engineering verifies ownership boundaries and deployability. QA owns the evidence for the brief checks. Operations owns screening, cases, refunds, compensation, and pilot coverage. PO-10 defines the evidence required for release.

This index is ready when all eleven linked plans and the preserved brief open, the eight brief checks and the load gate have owners and evidence locations, and open decisions have a release gate. Current task statuses describe planned software work.
