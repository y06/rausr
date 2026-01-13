---
title: "How UX & UI Are Tested: The Full Process (From Lab Sensors to Cursor Data)"
description: "A practical walkthrough of modern UX/UI testing — planning, recruiting, moderated sessions, biometrics, eye tracking, and behavior analytics like cursor heatmaps."
author: "Jakub"
date: 2026-01-11
tags: ["ux-ui", "reports", "software"]
seotags:
  - ux testing process
  - ui testing process
  - usability testing step by step
  - moderated vs unmoderated testing
  - eye tracking ux research
  - biometric user research
  - cursor tracking heatmaps
  - session replay rage clicks
  - product experimentation ab testing
draft: false
preview_image: /images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-13.jpg
header_image: /images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-1.jpg
source:
  - "Text: ISO 9241-210 (Human-centred design for interactive systems)"
  - "Book: Rubin, J., & Chisnell, D. (Handbook of Usability Testing)"
  - "Book: Tullis, T., & Albert, B. (Measuring the User Experience)"
  - "Text: Nielsen Norman Group (NN/g) research articles on usability testing and eye tracking"
  - "Text: W3C WCAG (Web Content Accessibility Guidelines)"
---

## Introduction

UX & UI testing isn’t a single method or a complicated science experiment.
It’s simply a way to check whether people can actually use what you’ve designed.

Sometimes that means sitting in a room with a few users and watching them struggle.
Other times it means looking at thousands of real sessions to see where people get stuck.

The most effective teams usually combine both approaches:

- **Qualitative testing** to understand *why* people are confused or hesitant
- **Quantitative data** to see *how often* those problems happen and whether fixes work

This guide walks through the full UX/UI testing process in plain terms — from moderated testing and eye tracking to analytics, heatmaps, and A/B experiments — without assuming you’re a researcher or data specialist.

{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-2.jpg" alt="User testing session with a researcher observing and notes on a tablet" >}}
{{< /halves >}}


### The First Rule
#### Test a question, not a screen

Testing “this new UI” doesn’t help much.
Good testing starts with a simple, concrete question you want answered.

Examples:
- Can first-time users find pricing without help?
- Where do people hesitate before paying?
- Which step causes the most confusion on mobile?

{{< interest >}}
The easiest way to waste time in UX testing is to collect lots of recordings without knowing what decision they should inform.
Decide what you might change first — then test to support that decision.
{{< /interest >}}

{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-3.jpg" alt="UX researcher writing usability test questions and tasks" >}}
{{< /halves >}}


### The Whole UX/UI Testing Process (End-to-End)

#### 1) Define the goal, constraints, and success metrics

You need one primary outcome and a few supporting signals.

**Common usability metrics (session-level):**
- **Task success:** completed / failed / completed with help
- **Time on task:** how long it takes (watch for outliers)
- **Error rate:** wrong taps, wrong paths, form mistakes
- **SEQ (Single Ease Question):** “How easy was this task?” (1–7, because middle point)
- **SUS (System Usability Scale):** broader usability benchmark (10 questions)

**Common product metrics (behavior-level):**
- conversion rate, activation, retention
- funnel drop-off per step
- support contacts / returns / cancellations

{{< quote >}}
If you don’t define “success”, you’ll end up debating opinions.
If you define it too narrowly, you’ll ship a “winner” that harms trust.
{{< /quote >}}


#### 2) Pick the right method (the “why” and the “how many”)

Most teams combine 2–4 methods, because each one answers different questions.

##### Moderated usability testing (classic)
Best for: **discovering friction, misunderstandings, missing expectations**.

- 5–8 participants per key audience segment often reveals the biggest usability issues
- you learn language, mental models, and emotional reactions

##### Unmoderated remote testing
Best for: **breadth**, quick comparisons, and less “researcher influence”.

- larger samples (often 20–100+) reduce noise
- great for first-click tests, preference tests, comprehension checks

##### Analytics + session replay + cursor tracking
Best for: **finding where to look** and validating impact at scale.

- shows patterns across thousands of sessions
- doesn’t tell you the full “why” on its own

##### Experiments (A/B, multivariate, holdouts)
Best for: **proving causality** (did the change cause the improvement?).

{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-4.jpg" alt="Overview of UX research methods: moderated, unmoderated, analytics, experiments" >}}
{{< /halves >}}


#### 3) Choose prototype fidelity (paper → clickable → coded)

The prototype should match what you’re trying to learn.

- **Paper / whiteboard:** perfect for flows and information architecture (fast, cheap, honest feedback)
- **Clickable prototype (Figma, etc.):** great for navigation and first-time understanding
- **Coded prototype / staging:** needed for performance, real data, edge cases, accessibility, and device-specific behavior

{{< interest >}}
“Wizard of Oz” testing is underrated: users interact with a realistic UI, while a human secretly powers the “AI” or complex logic behind the scenes.
It lets you test value and trust before building heavy systems.
{{< /interest >}}

{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-5.jpg" alt="Prototype fidelity from paper sketches to clickable UI to coded prototype" >}}
{{< /halves >}}


#### 4) Recruitment: who you test matters more than how many

Recruit by behavior, not demographics.
Examples:

- “Has switched email provider in the last 6 months”
- “Books hotels for work at least once a month”
- “Uses screen reader daily”

Also decide:
- device and context (phone-on-the-go vs desktop-at-work)
- incentives, NDAs, consent forms
- exclusion criteria (avoid “professional testers” if you’re testing mainstream UX)


#### 5) Write tasks that don’t give away the answer

Bad task: “Find the billing settings and change your plan.”
Better: “You were charged for the wrong plan. What would you do?”

Good task design:
- starts with a believable story
- avoids button names and UI terms
- can be completed in more than one reasonable way (so you can see real strategies)


{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-6.jpg" alt="Usability testing plan with tasks, metrics, and participant notes" >}}
{{< /halves >}}


### The “Physical” Side
#### Lab Testing With Sensors, Cameras, and Eye Tracking

This is where UX research looks almost like sports science.
It’s not always necessary — but it can reveal *how* people allocate attention, how hard a task is, and which moments create stress or confusion.


#### A typical lab setup (what’s being recorded)

- **Screen recording** + **audio** (what they do, what they say)
- **Face camera** (micro-reactions, confusion moments, trust signals)
- **Overhead camera** (hands, device handling, posture, hesitations)
- **Eye tracking** (where attention goes, what’s ignored, scan patterns)

Then, optionally:

- **EDA / GSR (skin conductance):** changes in arousal (stress/effort), not “happiness”
- **Heart rate / HRV (often via PPG wrist sensors):** workload and stress trends (noisy, context-dependent)
- **Pupil dilation (pupillometry):** cognitive load signals (strongly affected by lighting)
- **Motion sensors** (in VR/AR or physical prototypes): head/hand movement, reach, time-to-grab

{{< interest >}}
Unknown-but-important detail: eye tracking isn’t just “where they look”.
Researchers often analyze **time-to-first-fixation** (how long it takes to notice a critical element) and **revisits** (how often people must re-check something they don’t trust).
{{< /interest >}}


{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-7.jpg" alt="Participant wearing eye-tracking equipment during a usability test" >}}
{{< /halves >}}


#### What eye tracking can reveal (that interviews often miss)

Eye tracking is powerful when the problem is visual hierarchy, scanning, or attention.
Examples:

- users *say* they saw a CTA, but their gaze never landed on it
- users “read” a form label, but their eyes bounce between two fields (ambiguity)
- users over-scan navigation because information scent is weak

**Common eye tracking outputs:**
- gaze plots (scan paths)
- heatmaps (aggregated attention)
- AOI metrics (areas of interest: time spent, order, revisits)

**Limitation:** looking is not understanding.
Always pair with tasks + outcomes.


#### When biometrics help (and when they don’t)

Physiological signals can be useful for *timing*:
they can flag “something happened here” even when the participant can’t articulate it.

But they’re rarely proof of a specific emotion.
EDA spikes can mean: confusion, stress, excitement, surprise, or even a room temperature change.

Use biometrics to:
- find moments worth replaying and discussing
- compare workload between two versions (with careful setup)
- validate that a “small” UI change actually reduces effort

Avoid using biometrics to:
- label feelings (“they are happy now”)
- justify a decision without behavioral outcomes


{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-8.jpg" alt="Lab user testing setup with cameras and biometric sensors" >}}
{{< /halves >}}


### The “Digital Trail” Side
#### Cursor Data, Heatmaps, Replays, and Funnels

Not every team has a lab.
But almost every product can measure real behavior at scale.


#### Cursor tracking and heatmaps (what they measure)

Cursor data is imperfect — but still useful.
Modern tools can capture:

- **click maps:** where people actually click (and miss-click)
- **scroll depth:** how far people go before giving up
- **move maps:** where the cursor spends time (often correlates with attention on desktop)

More “hidden” signals used in mature teams:
- **rage clicks:** repeated clicks in frustration
- **dead clicks:** clicks on non-interactive elements (false affordances)
- **u-turns:** back-and-forth navigation patterns
- **hesitation time:** long pauses before committing to an action

{{< interest >}}
One of the most actionable metrics is “dead clicks per 100 sessions”.
It’s a direct measure of UI misleading people — and it’s often easier to fix than “conversion”.
{{< /interest >}}

{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-9.jpg" alt="Heatmap analytics showing clicks, scroll depth, and cursor movement" >}}
{{< /halves >}}


#### Session replay (why it’s powerful, and why it’s sensitive)

Session replay shows the full story: hesitations, loops, rage clicks, input errors, and device problems.
It’s extremely effective for debugging UX — but it comes with privacy obligations.

If you use replay:
- mask inputs by default (especially PII)
- limit retention
- restrict access (research team only)
- document consent and legal basis (GDPR/CCPA context)


#### Funnel analytics (how teams pick what to test next)

Funnels answer:
- where people drop off
- which step is unexpectedly slow
- which segment struggles the most (new users, mobile, certain regions)

The best workflow is:
1) find the friction point in analytics
2) watch replays to see patterns
3) run usability tests to learn why
4) iterate and validate with an experiment

{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-10.jpg" alt="A/B test dashboard comparing two UI variants and results" >}}
{{< /halves >}}


### Experiments: A/B Testing Isn’t “Better UX” by Default

A/B tests are incredible for causality, but they can reward short-term behavior.
Great teams pair A/B testing with “guardrails”:

- long-term retention
- refund / complaint rates
- accessibility and error rates
- trust proxies (drop-off after pricing, “account deletion” spikes)

{{< quote >}}
If an A/B test increases conversion but increases support tickets, you didn’t “win” — you just moved the cost.
{{< /quote >}}


### Accessibility Testing (The Most Ignored UX Superpower)

Accessibility testing isn’t a separate “compliance task” — it’s UX testing under real constraints.

Include sessions with:
- keyboard-only navigation
- screen readers (NVDA, VoiceOver, JAWS)
- high zoom / reflow (200–400%)
- reduced motion preferences
- color contrast and color-blindness checks

Many “mysterious” usability problems disappear once a product is built to be robust and predictable.

{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-11.jpg" alt="Accessibility testing using keyboard navigation and a screen reader" >}}
{{< /halves >}}

### A Realistic Example: One Study, Two Measurement Layers

Imagine you’re improving a checkout form.

**In a moderated test (8 participants):**
- run 3–4 tasks (add item, apply discount, pay, find invoice)
- record screen + audio
- track: task success, time, errors, SEQ
- optionally add eye tracking to see if key trust signals are noticed (delivery, returns, payment security)

**In analytics (thousands of sessions):**
- track form error rate per field
- track rage clicks / dead clicks around promo code
- compare drop-off by device and country

The overlap between these layers gives you confidence: you know what broke, why it broke, and how often it breaks.

{{< halves >}}
{{< halfimg src="/images/articles/how-ux-ui-is-tested/how-ux-ui-is-tested-12.jpg" alt="UX research findings translated into a prioritized design backlog" >}}
{{< /halves >}}


### Conclusion

Modern UX/UI testing is a loop:
**observe → measure → fix → validate**.

The “physical” side (eye tracking, sensors, cameras) can reveal attention and workload.
The “digital trail” side (cursor data, replays, funnels, experiments) shows what happens at scale.

When you combine them, you don’t just ship prettier interfaces — you ship interfaces that people can actually use, trust, and understand.
