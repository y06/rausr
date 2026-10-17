---
title: "Charts and Graphs"
description: "How to choose, label, test, and publish charts that make quantitative comparisons clear without distorting the evidence."
summary: "A chart is a visual argument about data. Its type, scale, labels, and omissions determine what readers can honestly see."
wiki_category: "information-and-data-design"
wiki_category_title: "Information and Data Design"
preview_image: "/images/wiki-guides/charts-and-graphs/preview.webp"
header_image: "/images/wiki-guides/charts-and-graphs/header.webp"
article_image: "/images/wiki-guides/charts-and-graphs/article.webp"
article_image_alt: "Fictional data tokens resolving into bars, points, uncertainty bands, and table alternatives"
order: 30
date: 2026-10-16
lastmod: 2026-10-16
wiki_tools: [spreadsheet, illustrator, figma]
wiki_skills: [research, technical, accessibility]
seotags: ["chart design", "graph design", "data visualization charts", "chart accessibility", "data chart best practices"]
sources:
  - label: "ONS: choosing a chart type"
    url: "https://service-manual.ons.gov.uk/data-visualisation/chart-types/choosing-a-chart-type"
  - label: "ONS: axes and gridlines"
    url: "https://service-manual.ons.gov.uk/data-visualisation/guidance/axes-and-gridlines"
  - label: "W3C WAI: complex images"
    url: "https://www.w3.org/WAI/tutorials/images/complex/"
related_content:
  - path: "/blog/graphic-design-and-geography/"
  - path: "/works/mrp-document-export-layouts-madness/"
---

## What it is

Charts and graphs encode quantities in position, length, area, colour, or another visual property. They help readers compare categories, follow change, see a distribution, or understand a relationship. This is a narrower craft within data visualisation: the practical decisions that make one quantitative display accurate and readable.

The chart should answer a question that matters to its audience. A technically correct plot can still fail if the question is buried, the axes are ambiguous, or the important difference is invisible at the size where it will be published.

## Start with the question and the data

Write the comparison in a sentence before selecting a chart. Are readers comparing amounts, proportions, change over time, distribution, or association? Check what the dataset actually measures, its unit, time period, geography, source, exclusions, and uncertainty. Do not treat missing values as zero or combine unlike categories simply because the resulting shape looks tidy.

Choose the visual encoding that makes the comparison easiest. Bars support comparing category magnitudes; lines usually show change across ordered time; scatter plots can reveal relationships between two quantitative variables. These are starting points, not magic rules. A table may be better when exact values or many precise lookups are the real task.

## Make the encoding honest

### Scales and axes

Set axis limits deliberately. Bars use length to represent amount, so a truncated scale can make small differences look enormous. A line chart can use a focused range when that makes a meaningful change visible, but the range and context must be clear. Keep comparable charts on comparable scales where side-by-side reading is intended. Label units and intervals rather than making readers infer them.

Use gridlines and ticks as reading aids, not decoration. Too many compete with the data; too few make values hard to judge. Sort categories to support the question, while preserving meaningful order such as time or process. Explain transformations such as per-capita rates, indexes, or log scales near the chart.

### Labels, colour, and uncertainty

Give the chart a title that says what it shows and, where appropriate, the main finding. Include source, period, unit, and important caveats. Directly label data where practical so readers do not have to jump repeatedly to a legend. Use colour to encode a meaningful difference, and ensure the comparison remains understandable without colour alone.

If estimates have uncertainty, show or explain it instead of implying false precision. Resist smoothing that hides volatility or a dramatic annotation that exaggerates a minor movement. Ask someone unfamiliar with the dataset what conclusion they draw before you explain the intended message.

## Publish for more than one way of reading

Test the chart at its final print or mobile width. Fine lines, small labels, and crowded keys often fail there first. For digital use, provide a concise text alternative describing the important relationship and a table or accessible data source when readers need exact values. Check the reading order and contrast of interactive controls. A screenshot of a chart is not a complete accessible data experience.

Maintain a traceable connection to the approved dataset and analysis. Record source, extraction date, transformations, chart version, and review owner. When the data changes, update the title and annotations along with the marks. A persuasive visual must still be reproducible.

## Practical review questions

- Does the chart answer one clear question, and is that question supported by the data?
- Could another scale, category order, or omitted baseline reverse the impression?
- Can readers understand the claim, unit, time, and source without a presenter beside them?

## Common mistake

Choosing the chart form for visual novelty before defining the comparison. A memorable image is useful only when the geometry and labels help readers reach a fair conclusion.
