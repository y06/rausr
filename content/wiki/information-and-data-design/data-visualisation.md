---
title: "Data Visualisation"
description: "A practical guide to turning data into accurate, readable charts and visual explanations without distorting the underlying relationships."
summary: "Data visualisation maps values and relationships to visual properties such as position, length, angle, area, colour, or connection so that patterns can be inspected and communicated."
wiki_category: "information-and-data-design"
wiki_category_title: "Information and Data Design"
preview_image: "/images/wiki-guides/data-visualisation/preview.webp"
header_image: "/images/wiki-guides/data-visualisation/header.webp"
article_image: "/images/wiki-guides/data-visualisation/article.webp"
article_image_alt: "Abstract dataset compared through bars, a line, and plotted points"
order: 20
date: 2026-10-07
lastmod: 2026-10-15
wiki_tools: [spreadsheet, illustrator]
wiki_skills: [research, technical, storytelling]
seotags: ["data visualisation", "data visualization", "chart design", "information design", "visual data"]
sources:
  - label: "Office for National Statistics: Choosing a chart type"
    url: "https://service-manual.ons.gov.uk/data-visualisation/chart-types/choosing-a-chart-type"
  - label: "Office for National Statistics: Axes and gridlines"
    url: "https://service-manual.ons.gov.uk/data-visualisation/guidance/axes-and-gridlines"
related_content:
  - path: "/blog/graphic-design-and-traffic-signs/"
---

## What it is

Data visualisation helps people compare values, detect patterns, inspect uncertainty, and understand relationships. It may support open-ended exploration or communicate a specific finding; the purpose determines the structure. A chart is successful when its reader can make the intended comparison without being misled by the design.

Before drawing, define the question, the audience, and the decision the graphic should support. Then inspect the dataset: what does each value represent, what is missing, how was it collected, and which comparisons are actually valid?

## Choose an encoding that fits the question

Position along a common scale is usually easier to compare precisely than area, angle, or colour intensity. Bar charts support comparisons between categories, lines can show change across an ordered sequence, scatter plots reveal relationships, and maps add geographic structure. A table may be better when exact values matter more than a pattern.

Choose the form according to the comparison. If the reader needs to judge how two groups differ, place them on a shared scale or use small multiples. If the question concerns change over time, preserve the sequence. If geography is incidental, a map may add complexity without helping the answer.

## Preserve the data relationship

Scales, baselines, intervals, aggregation, missing values, and filtering can change the apparent conclusion. Bar lengths represent magnitude, so a bar chart needs a zero baseline. A line chart can sometimes use a narrower range when the change itself is the subject, provided the axis makes that choice clear.

Do not silently connect missing periods or compare values that use different definitions. Explain transformations that a reader needs to interpret the result correctly. When estimates have meaningful uncertainty, make that visible or state it near the graphic. Visual emphasis should follow the evidence rather than manufacture a stronger story.

## Add context

Titles, units, source notes, annotations, definitions, and comparison values help a chart answer a real question. A useful title identifies the subject; a subtitle can state the measure, place, and period. Labels placed near the data usually reduce the effort of moving between a legend and the marks.

Use annotations to explain genuine turning points or definitions, not to tell readers what to conclude. Make the source and any important caveat easy to find. If the graphic will be shared without its article, it should still carry enough context to be understood responsibly.

## Design for more than one way of reading

Colour can group or emphasise, but it should not be the only way to distinguish series. Direct labels, line patterns, symbols, or spacing may be needed. Check text size, contrast, long category names, and mobile width. For digital charts, provide an accessible text explanation or data table where appropriate.

Build a simple version before adding detail. If a chart needs a long instruction to explain how to read it, consider whether another form would communicate the comparison more clearly.

## Review the interpretation

Ask a colleague who has not seen the source data to describe what the chart says. Compare their reading with the actual numbers and any caveats. Review the figure at publication size and, where possible, in the context of the page or dashboard around it. This catches both visual problems and stories that the data cannot support.

## Audit the published chart

Trace every plotted value back to a source row and inspect any transformation between the source and the final graphic. Check units, date ranges, denominators, missing observations, and whether the chosen scale changes the apparent story. A visual can be beautifully drawn and still support an invalid comparison.

Ask a new reader to describe the takeaway without hearing the intended message first. If they infer a stronger claim than the evidence supports, adjust the headline, annotation, or visual encoding. Keep the source data and an editable chart file so updates do not rely on tracing an old image. For a dense interactive view, offer a concise explanation of the key pattern and an accessible route to the underlying values.

## Practical checks

- State what is being measured, in which units, and over what period.
- Include the source and relevant methodological or uncertainty notes.
- Test colour choices for contrast and colour-vision differences.
- Remove effects that suggest depth or precision not present in the data.
- Check the chart at mobile width and with long labels.

## Common mistake

Starting with a visually impressive chart form and forcing the data into it. Begin with the comparison the reader needs to make, then choose the simplest encoding that supports that comparison honestly.
