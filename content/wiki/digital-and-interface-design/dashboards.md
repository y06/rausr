---
title: "Dashboards"
description: "How to design dashboards that support decisions with clear metrics, trustworthy context, accessible charts, and useful interaction."
summary: "A dashboard is a working view of changing information. It should help a person notice what matters, understand why it changed, and decide what to do next without hiding the assumptions behind the data."
wiki_category: "digital-and-interface-design"
wiki_category_title: "Digital and Interface Design"
preview_image: "/images/wiki-guides/dashboards/preview.webp"
header_image: "/images/wiki-guides/dashboards/header.webp"
article_image: "/images/wiki-guides/dashboards/article.webp"
article_image_alt: "Dashboard interface with a focused chart, supporting measures, filters, and data context"
order: 100
date: 2026-10-15
lastmod: 2026-10-15
seotags: ["dashboard design", "analytics dashboard UX", "data dashboard", "dashboard information hierarchy", "accessible charts"]
wiki_tools: [figma, spreadsheet, browser]
wiki_skills: [systems, accessibility, technical]
sources:
  - label: "U.S. Web Design System: data visualizations"
    url: "https://designsystem.digital.gov/components/data-visualizations/"
  - label: "W3C WAI: accessible complex images and charts"
    url: "https://www.w3.org/WAI/tutorials/images/complex/"
related_content:
  - path: "/works/ux-ui-webdesign-presentation-systems-madness/"
  - path: "/blog/how-ux-ui-is-tested/"
  - path: "/blog/how-graphic-design-boosts-ecommerce-sales/"
---

## What it is

A dashboard is a view designed for a recurring decision, not a wall of available metrics. It brings together signals that a person needs to monitor, investigate, or act on. A useful dashboard answers three questions: what is happening, how do we know, and what can I do with that information?

The answer depends on the user's role. An operations team watching live exceptions needs different timing and detail from a manager reviewing a monthly trend. Begin with those decisions, then choose the measures and views that support them. [Data visualisation](/wiki/information-and-data-design/data-visualisation/) supplies chart principles; dashboard design adds task flow, filtering, state, and ongoing maintenance.

## Define the questions before the metrics

Interview people who use the information. Ask what decisions they make, how often, what signal prompts action, and which data they trust. Separate monitoring from analysis. Monitoring needs clear status and exceptions; analysis needs comparison, context, and a path into the underlying data. One screen can support both, but each deserves a deliberate hierarchy.

Write a plain-language question for every element. “Are orders delayed today?” is more useful than “show order data.” Agree on definitions with data owners: what counts as an order, when the day begins, whether refunds are included, and when the figure was last refreshed. A precise chart of a poorly defined number is still misleading.

## Build an information hierarchy

### Lead with the next useful signal

Put the most actionable status near the top, followed by context: comparison period, target, range, or explanation. Choose whether the user needs a number, trend, distribution, or list of exceptions. A large number alone may be dramatic but cannot explain whether the change is normal.

Group related measures and give each group a name that describes its job. Avoid filling every open area with a card. White space and a restrained visual scale help people find the few signals that deserve attention. Keep units, time windows, and labels visible rather than burying them in a tooltip.

### Choose charts for the relationship

Use familiar chart forms when they communicate the question clearly: a line for change over time, bars for comparing categories, a table for exact values or inspection. Use colour consistently, pair it with labels or shapes, and make the important comparison visible without requiring a hover. The U.S. Web Design System recommends simple charts and a clear main idea for accessible data communication.

Show uncertainty or missing information honestly. A broken data feed, incomplete period, changed definition, or outlier should be explained near the affected view. If a chart is too dense to read at phone width, reorganise the decision rather than shrinking the desktop dashboard.

## Design the investigation path

Filters and drill-downs should answer natural follow-up questions. Keep the current date range, filters, and units visible. Make it easy to reset a filtered view and understand why two people see different numbers. Provide a route from an alert to the underlying rows or explanation, with appropriate permissions.

Design loading, empty, error, and stale-data states. “No incidents” and “no data returned” must look different. A refreshing spinner cannot make an old value current. Test the interface with realistic large numbers, long category names, unusual time zones, and small screens.

## Make the data available to more people

Charts need readable labels and contrast, keyboard-accessible controls, and a text explanation of the main finding. Where exact values matter, offer a table or an equivalent structured view. W3C guidance for complex images explains why a short chart label alone cannot convey all of its information. [Accessible interface design](/wiki/digital-and-interface-design/accessibility-and-inclusive-interface-design/) applies to the whole flow, not only the chart.

Check what happens at zoom and with a screen reader. Ensure focus follows the user's action when a panel opens or data updates. Motion can help reveal change, but it should never be the sole signal. Avoid hiding important detail behind a pointer-only interaction.

## Validate the decision, then maintain the view

Give users a realistic task: notice a problem, explain the likely cause, and identify a next action. Watch where they hesitate. If they must ask an analyst what a metric means, the interface needs clearer definitions or context. Measure whether the dashboard improves the decision rather than counting how many widgets it contains.

Assign ownership for metric definitions, quality checks, and review dates. As the product and organisation change, retire measures that no longer serve a decision. A smaller dashboard with trusted data will usually be more useful than a comprehensive one that nobody believes.

## Practical checks

- Can a user state the main finding and the data's last update without opening a tooltip?
- Are units, filters, comparison periods, and missing values explicit?
- Can the same insight be reached with a keyboard and through text or table equivalents?
- Does a realistic task lead from a signal to an explanation and a next step?

## Common mistake

Treating every requested metric as a design requirement. Start with the decisions, then earn each number's place on the screen.
