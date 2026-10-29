# Method

## The story the map tells

The map answers one question — **who is responsible for what in Ukraine's national cybersecurity system** — and shows it so that a practitioner in an ordinary organisation, an official, an analyst and a foreign partner can all follow. The documents in force do not answer it: the law lists the actors, the OTM describes "infrastructures" and "forces", the action plan lists tasks, but nowhere does it say who exactly is responsible for each function, under which authority and on what basis.

For the answer to be complete, the question has to be broken down. We break it down with the **Zachman Framework**: six questions — *what, how, where, who, when, why* — at three levels: the **system** as a whole, one **institution** with its units, one **organisation** or citizen the requirements address. Zachman only gives the list of questions, so nothing is missed. Recognised frameworks answer them:

- **How** — ENISA NCAF 2.0: what the state must be able to do (20 objectives, the spine of the capability map); NIST CSF 2.0 — the same at the level of an organisation; the OTM — how the same function is written in the Ukrainian act (a crosswalk only).
- **Who** — Klimburg's mandates (NATO CCDCOE): under which authority a body acts; NIS2 and EU member-state practice: which bodies are expected and which are missing.
- **Where** — the structural view after interface's German map: levels × lines of work.
- **When** — dates when bodies, roles and links came into and went out of force; regimes (martial law, crisis).
- **Why** — legal bases from the GRC foundation register; NCAF objectives as the purpose of functions.
- **What** — the information that passes between bodies: exchange, reporting (so far the map's weakest point).

Each cell of the table below holds the concrete questions the map must answer, the framework that grounds the answer and the view that shows it. The same questions lead into the site's viewpoints: a viewpoint (after ISO/IEC/IEEE 42010) is the set of questions of one group of readers.

<!--zachman-->

The lower rows of the Zachman Framework — technical design, components, operations (systems, networks, protection tools) — are deliberately outside the map: the openness boundary says so.

## Who: three questions under one

"Who is responsible for what" is three different questions, and the map keeps them apart.

- **Hierarchy** — who reports to whom. Links of type "Subordination" and "Membership".
- **Function** — what is done. The actors' roles and the ENISA NCAF 2.0 objectives those roles serve.
- **Mandate** — under which authority it is done: military, police, counter-intelligence, regulatory or diplomatic. Set by the legal regime of the act that grants the role.

A mandate reduces neither to hierarchy nor to function. Two bodies can share a function and differ in mandate (the Cyber Police and the SBU both counter cybercrime: the first to obtain a conviction, the second to neutralise a threat to state security). One body can hold two mandates at once, as most security services do.

## Metamodel

The map is a graph of fourteen entities (see the Data model page). Every view on the site is a projection of the same graph for one question; the checks and the catalogue of expected institution types are tools on top of it that add nothing to the data.

| Entity | File | What it is |
| --- | --- | --- |
| Actor | `actors.csv` | A body, unit, response team, platform, class of entities or international partner |
| Role | `roles.csv` | What the actor does in the system; carries a mandate, legal basis, regime and status |
| Mandate | `mandates.csv` | Klimburg's five mandates plus two service columns: cross-mandate coordination and outside mandates |
| Legal act | GRC foundation register | The act that grants a role or sets a link. There is no table of its own: the build takes title, status and links from a pinned copy of the register |
| Framework | `frameworks.csv`, `framework_items.csv` | NCAF 2.0 (the spine), Klimburg's mandates, NIST CSF 2.0, the OTM and their items |
| Function | `capabilities.csv`, `realizations.csv` | What the system must be able to do (one NCAF objective each), and who performs each through which role and under which act |
| Secondary source | `refs.csv` | Explainers and reports the map relies on |
| Expected institution type | `expected_types.csv` | A type of body a national system is expected to have (NIS2, NCAF 2.0, EU practice), and whether Ukraine has one |
| Link | `links.csv` | A typed relation between two actors with a legal basis |
| Step and handover | `flow_steps.csv`, `flow_handoffs.csv` | The incident-flow view: who does what at which stage, and where a case passes between mandates |
| Vocabularies | `vocab.csv` | Levels, actor types, roles, link types, regimes, statuses, confidence levels |

A platform (such as the NCCC) is modelled apart from a body on purpose: it brings participants together but holds no powers of its own.

**An institution and its units.** A unit or response team is recorded as an actor of its own with a `parent`, and a role is recorded for whoever actually performs it. An institution's profile collects the roles of all its units and groups them into "hats": policy, regulation, supervision, operations, service provision, coordination. A body with many functions — such as SSSCIP, which at once makes policy, regulates, supervises, responds to incidents through CERT-UA and provides special communications services — is thus visible on one screen, and combining regulation or supervision with service provision is flagged as a segregation-of-duties question. A ministry under the Cabinet or the General Staff under the Ministry of Defence is a separate body: there "parent" means subordination, not membership of the institution.

**Expected institution types.** The catalogue `expected_types.csv` lists the bodies a national system is expected to have, where the expectation comes from (NIS2, NCAF 2.0, the Cybersecurity Act, the CVE programme, EU member-state practice) and who stands in for them in Ukraine. Presence: present, partial, planned, absent, unknown. "Absent" is a finding, not a missing row: this is how the lack of a CVE numbering authority (CNA), ISACs, a national cybersecurity certification authority and others shows up.

## Coding rules

**A role's mandate** follows the legal regime of the act that grants it:

- **M1 Military cyber operations** — laws on defence and the Armed Forces, the Cyber Forces bill;
- **M2 Counter-cybercrime** — Criminal Procedure Code, law on the National Police;
- **M3 Intelligence and counter-intelligence** — laws on the SBU, on intelligence, on counter-intelligence, on operational-investigative activity;
- **M4 CI protection and crisis management** — cybersecurity and critical infrastructure laws, the OTM, the National Response Plan, the NBU's powers;
- **M5 Cyber diplomacy** — law on diplomatic service, international commitments;
- **Cross-mandate coordination** — the NCCC decree, the NSDC law;
- **Outside mandates** — education, research, awareness, digital identity, data protection.

An actor gets two mandates when acts give it tasks under two different legal regimes. Article 8 of Law No. 2163-VIII does not distinguish mandates by itself, so each role is traced to a specific law.

**An NCAF 2.0 objective** is not coded separately: its primary subjects are those leading its functions, and its mandates are the mandates of the roles through which those functions are performed. An objective under two mandates, or under cross-mandate coordination, is marked as a "mandate boundary": that is where disputes over powers arise. The map does not assess NCAF maturity levels: ENISA's method uses 871 indicators and an inter-agency group with internal evidence.

**A link** without a type is not accepted. Types: subordination, membership, oversight, reporting, approval, information exchange, donor support, help, sanction, requirements and warnings. The last three serve the personal card: a link from a class of organisations (public bodies, CI operators, other organisations, citizens) to a body reads as "whom I report to", "where I turn", "who supervises me". An empty section of the card is a gap in the system.

## Recognised frameworks first

The map rests on recognised frameworks first and does not invent its own classification. The spine is ENISA NCAF 2.0: cluster, objective, function. Every function (`capabilities.csv`) belongs to exactly one NCAF objective (the `spine` column). The NCAF inherits NIS2's exclusion of defence and national security, so the functions it cannot see (cyber defence, intelligence, counter-intelligence, attribution, special communications) sit under Klimburg's mandates. The other frameworks are crosswalks (the `also` column): NIST CSF 2.0 shows how a function is written at the level of an organisation (SSSCIP's 2026 methodological recommendations use the same framework), and the organisational and technical model of cyber protection (Resolution No. 1426) shows how it is written in the Ukrainian act. Frameworks and their items are kept in `frameworks.csv` and `framework_items.csv`; Klimburg's mandates once, in `mandates.csv`.

The OTM is taken into account, but not as a frame. It describes the functions of "infrastructures" and "cyber forces" in general and does not say which body is responsible for what — which is exactly what the map sorts out. So the OTM is only a crosswalk here: its provisions are numbered by the points of the Regulation, and the Frameworks page shows what in the OTM has no counterpart on the map and which NCAF objectives have none in the OTM. SSSCIP's explainer may lag behind the current edition, so every reference still has to be checked.

## The capability map

Who performs a function is recorded in `realizations.csv`: the actor, its part ("leads" or "contributes"), the role and the act. The role is the authority the actor acts with (its power and mandate); the act is the instrument that actually governs the function (a procedure, a methodology, a regulation). Taking part with neither a role nor an act shows up as a gap.

## Keeping the model whole

Each fact is stored in one place. Whatever can be derived is not coded twice: who is responsible for an NCAF objective and which mandates it lies in follow from who performs its functions and through which roles; an expected body's NCAF objective follows from its function. The schema of every table is defined once (`scripts/mapdata.py`): it checks the references, builds the site and draws the Data model page. The checks also make sure different views do not tell the same fact two ways: an expected body is present only if the named body performs its function, and an actor on the incident path must perform the function of its step.

## Time

Actors, roles and links carry `valid_from` and `valid_to`. A role's date is when the function first had a legal basis; the `act` column holds today's basis, which may be later (e.g. CERT-UA: the government team since 2007, the national team under Law No. 2163-VIII, in its current form under 4336-IX). A blank date means "before 2014 or not established": such rows are shown in every snapshot and drawn dotted. Drafts and entities not yet set up are not shown in past snapshots.

A chosen date applies to every view, card and check until it is cleared. The same toolkit can thus assess any change to the system: code the dates and compare two snapshots.

## Confidence levels

| Level | When |
| --- | --- |
| Checked against the act | The row was checked against the current text on zakon.rada.gov.ua; `last_verified` is filled in |
| From a secondary source | An official release, the CCDCOE report, trade media; the act's text not checked |
| Compiler's inference | Inferred from other rows; needs confirmation |

## The openness boundary

The map describes the system at the level of legal acts and open sources. It holds and will hold no infrastructure objects, systems, networks, addresses, contacts or personal names — only bodies and positions. Proposals beyond this boundary are not accepted.

## Prototype limits

- The data was coded by one person; edge decisions (say, the mandate of the Border Guard or MinDigital) can be contested — every cell carries its legal basis for that reason.
- Regimes (peacetime, martial law, crisis) are only built into the model: roles that change with the regime are not yet coded.
- The incident-flow view follows the logic of the mandates, not the text of the National Response Plan.
- Some military and intelligence powers may be set by restricted acts the map cannot see.

## Next

1. Check every row against the act and raise its confidence.
2. Code the 2026 action plan and compute NCAF 2.0 coverage by cluster.
3. Add a "regimes" view: what changes under martial law and in a crisis.
4. Code reporting deadlines and forms, and sanctions, for the classes of organisations.
5. Add an ArchiMate Open Exchange export for those who work in Archi.
6. A discrimination test: the same toolkit for Germany on the interface project's data.
