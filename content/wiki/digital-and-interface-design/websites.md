---
title: "Websites"
description: "How to design websites around real user tasks, clear content, responsive layouts, accessibility, and performance."
summary: "A website is a connected publishing and interaction system. Good website design helps people find the right information or complete a task across devices while remaining understandable, maintainable, and fast enough to use."
wiki_category: "digital-and-interface-design"
wiki_category_title: "Digital and Interface Design"
preview_image: "/images/wiki-guides/websites/preview.webp"
header_image: "/images/wiki-guides/websites/header.webp"
article_image: "/images/wiki-guides/websites/article.webp"
article_image_alt: "Responsive website canvases growing from connected content modules"
order: 10
date: 2026-10-16
lastmod: 2026-10-16
seotags: ["website design", "web design process", "responsive website design", "website information architecture", "accessible web design"]
wiki_tools: [figma, browser, photoshop]
wiki_skills: [research, systems, accessibility]
sources:
  - label: "W3C WAI: Page Structure Tutorial"
    url: "https://www.w3.org/WAI/tutorials/page-structure/"
  - label: "web.dev: Web Vitals"
    url: "https://web.dev/articles/vitals"
related_content:
  - path: "/works/dynu-video-production-landing-page/"
  - path: "/works/ux-ui-webdesign-branding-paradox/"
  - path: "/blog/how-ux-ui-is-tested/"
---

## What it is

A website is more than a collection of pages styled to look consistent. It is a route from a question or need to useful content, contact, a service, or a completed task. It has a structure, publishing workflow, visual language, interaction model, and technical behaviour. These parts should reinforce one another rather than competing for attention.

Different sites have different jobs. A studio portfolio must make work understandable; a public service must help people complete a process; a publication must make a growing archive discoverable. Begin by defining the site’s purpose and the needs it must serve, not by choosing a hero animation or a homepage layout.

## Understand tasks and content

List the main audiences and the questions they bring. Observe how they currently find information, what terms they use, and where they get stuck. Audit existing pages and assets for accuracy, duplication, ownership, and gaps. Search logs, support requests, and conversations with staff can reveal needs that are not visible in a design brief.

Turn those findings into a content model: page types, required fields, relationships, and update owners. A website that will grow needs rules for new articles, projects, products, or locations. Otherwise every new page becomes a one-off design and navigation slowly loses coherence.

## Make the structure navigable

### Name things in the reader's language

Organise content around tasks and subjects people recognise. Navigation labels should predict what a visitor will find, not mirror internal departments without explanation. Provide more than one route when useful: browsing, search, contextual links, and clear paths back to broader sections. Use descriptive page titles and headings that tell readers where they are.

Sketch the journey from likely entry points, not just from the homepage. A person may arrive from a search result on a deep article or project page. The page should give enough context to be useful alone and a sensible path onward. W3C's page-structure guidance explains how meaningful regions and heading hierarchy also help assistive-technology navigation.

### Design a responsive system

Create layouts that adapt to content and viewport rather than reproducing a desktop composition at smaller scale. Test long headings, missing images, translated copy, narrow screens, zoom, and large text. Set clear roles for type, spacing, colour, media, cards, forms, and feedback. [Design systems](/wiki/digital-and-interface-design/design-systems/) help teams reuse decisions without making every page visually identical.

Prototype the real interaction states: menus open and closed, search with and without results, form errors, loading states, and empty collections. A static perfect-state mock-up does not reveal whether the site remains usable when content or network conditions change.

## Build accessibility and performance in

Use semantic structure, keyboard-reachable controls, visible focus, readable contrast, meaningful alternatives for images, and labels that describe actions. Treat [accessibility and inclusive interface design](/wiki/digital-and-interface-design/accessibility-and-inclusive-interface-design/) as a design constraint throughout the project, not as a final audit. Test with actual content and, where possible, people using different devices and assistive technologies.

Keep pages lean. Large images, heavy scripts, and unnecessary motion can delay the content people came for or make interaction feel unstable. web.dev's Web Vitals offer a way to discuss loading, responsiveness, and visual stability, but performance work should also focus on the site's most important user journeys. Review mobile devices and slower connections, not only a fast office machine.

## Test and maintain the site

Give participants realistic tasks and observe where they hesitate. Look beyond clicks: did they understand the information, choose the right option, and feel confident about the result? Fix structural problems before polishing transitions. Check the published site after launch because live content, analytics, and support feedback reveal issues prototypes miss.

Define who can add content, who checks it, and when it is reviewed. Document reusable components, naming rules, media requirements, and editorial standards. A maintainable site can evolve without becoming visually or structurally inconsistent.

## Practical checks

- Can someone entering on a deep page understand where they are and what to do next?
- Are content types and ownership clear enough for future additions?
- Does the layout work with long, short, missing, and translated content?
- Can key journeys be completed by keyboard and on a small screen?
- Are loading and interaction quality tested on real devices and connections?

## Common mistake

Treating the homepage as the website. The real design is the connected system of content, navigation, interaction, and maintenance that helps people complete their task wherever they enter.
