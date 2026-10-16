---
title: "Diagrams"
description: "How to turn relationships, systems, and processes into diagrams that people can follow and verify."
summary: "A diagram is a selective visual model. It uses shapes, connections, labels, and sequence to explain how parts relate, not merely to make a complex subject look organised."
wiki_category: "information-and-data-design"
wiki_category_title: "Information and Data Design"
preview_image: "/images/wiki-guides/diagrams/preview.webp"
header_image: "/images/wiki-guides/diagrams/header.webp"
article_image: "/images/wiki-guides/diagrams/article.webp"
article_image_alt: "Raw relationships resolving into structured flows, branches, and feedback loops"
order: 40
date: 2026-10-16
lastmod: 2026-10-16
seotags: ["diagram design", "process diagram", "systems diagram", "flowchart design", "accessible diagrams"]
wiki_tools: [illustrator, figma, spreadsheet]
wiki_skills: [research, systems, technical]
sources:
  - label: "W3C WAI: Complex Images"
    url: "https://www.w3.org/WAI/tutorials/images/complex/"
  - label: "W3C WAI: Page Structure Tutorial"
    url: "https://www.w3.org/WAI/tutorials/page-structure/"
related_content:
  - path: "/blog/graphic-design-and-geography/"
  - path: "/works/mrp-document-export-layouts-madness/"
---

## What it is

A diagram is a visual explanation of relationships. It can show a sequence of steps, a hierarchy, a feedback loop, the parts of an object, or the dependencies inside a system. Unlike a decorative infographic, a diagram should let someone reason about the subject: follow a connection, compare branches, or identify what changes when one part changes.

Every diagram simplifies. That is useful only when the simplification preserves the relationships the reader needs. A beautiful arrangement of boxes may imply a linear process where real work loops back; a neat hierarchy may hide shared ownership. Define what the diagram claims to represent and what it intentionally leaves out.

## Choose the relationship before the shape

Write the question the reader needs to answer. “What happens next?” suggests a process. “Who owns this?” suggests a hierarchy or responsibility map. “How do these components exchange information?” suggests a system map. A timeline, map, chart, or ordinary paragraph may be better for some questions. Do not choose a fashionable diagram form before understanding the structure.

Collect terms and relationships from subject experts. Define each node and connection in plain language. Ask what is mandatory, optional, repeated, or conditional. Record unresolved contradictions rather than smoothing them away with arrows. A diagram can reveal that the underlying process is unclear; that is valuable discovery, not a failure of drawing.

## Build a readable model

### Establish a path through the information

Give the reader an entry point and a predictable direction of reading. Group related parts and use consistent spacing. Reserve size, weight, and colour for meaningful distinctions such as main stages, secondary detail, and exceptions. If the diagram must be viewed on a phone, consider a vertical sequence or several linked panels instead of shrinking one giant canvas.

Use connection lines carefully. Arrows should indicate a specific relationship—flow, dependency, reference, or influence—and similar arrows should mean the same thing. Crossings and loops should be intentional. Labels placed on or near a connection can prevent readers from guessing what the line means.

### Keep language inside the model

Short labels make a diagram scannable, but abbreviations can turn it into a code known only to the team that built it. Spell out unfamiliar terms nearby and use captions or accompanying text for nuance. A decision node should state the actual question; “yes” and “no” branches should be clearly attached to their answers. If every box needs a paragraph, simplify the model or split it into layers.

Test in grayscale and at final size. Do not rely on colour alone for categories or states. Check that type remains legible and that the visual order matches the logical order. [Infographics](/wiki/information-and-data-design/infographics/) may wrap a diagram in a broader editorial story; [data visualisation](/wiki/information-and-data-design/data-visualisation/) is a better home when measured values are the central subject.

## Make the information accessible

A short image description can identify the diagram, but a complex process often needs more than one sentence to convey its relationships. W3C guidance for complex images recommends providing a longer text equivalent where the diagram carries essential information. This can be a structured explanation adjacent to the graphic, not hidden in a tiny tooltip. For interactive diagrams, ensure controls and focus order also match the reading sequence.

Keep the source model separate from the illustration file. A list of nodes and links, a process document, or a data table makes it possible to check whether the graphic is still accurate after a policy or product change. Name an owner and date for diagrams that may be reused long after they were created.

## Validate with a real task

Ask a new reader to answer a question using only the diagram and its caption. Can they find the start, follow a branch, and explain the result? Then ask a subject expert whether any simplification changes the meaning. These are different tests: one checks comprehension, the other checks fidelity. Both matter.

Review the diagram in its published context. A complex image that works in a slide deck may become unreadable as a web thumbnail. Provide a full-size view, a simpler overview, or a step-by-step alternative where needed. Design the route into the detail instead of forcing all detail into one frame.

## Practical checks

- Does the chosen form match the actual relationship being explained?
- Are node and connection meanings consistent throughout?
- Can a first-time reader identify the entry point and follow a branch?
- Is essential information available in text as well as the image?
- Can the underlying model be checked and updated without redrawing from memory?

## Common mistake

Using geometry to create the appearance of clarity before the subject itself is understood. Resolve what the parts mean and how they connect; then make the diagram as simple as that truth allows.
