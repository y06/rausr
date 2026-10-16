---
title: "Maps and Cartography"
description: "How to design maps that make place, route, and geographic patterns clear without hiding scale or uncertainty."
summary: "A map is a selective model of a place. Cartographic design decides what to show, what to simplify, and how people can interpret spatial relationships at the scale and in the context where the map will be used."
wiki_category: "information-and-data-design"
wiki_category_title: "Information and Data Design"
preview_image: "/images/wiki-guides/maps-and-cartography/preview.webp"
header_image: "/images/wiki-guides/maps-and-cartography/header.webp"
article_image: "/images/wiki-guides/maps-and-cartography/article.webp"
article_image_alt: "Transparent terrain, route, and landmark layers aligning into one fictional map"
order: 50
date: 2026-10-16
lastmod: 2026-10-16
seotags: ["map design", "cartography", "cartographic design", "map visual hierarchy", "accessible maps"]
wiki_tools: [illustrator, figma, spreadsheet]
wiki_skills: [research, technical, accessibility]
sources:
  - label: "Ordnance Survey: cartographic design principles"
    url: "https://www.ordnancesurvey.co.uk/blog/what-is-cartography"
  - label: "U.S. Geological Survey: cartographic representation"
    url: "https://www.usgs.gov/centers/cegis/science/cartographic-representation"
related_content:
  - path: "/blog/graphic-design-and-geography/"
  - path: "/blog/metro-orientation-design/"
  - path: "/blog/graphic-design-and-traffic-signs/"
---

## What it is

A map translates selected geographic information into a usable view. It can help a person find a route, understand a region, compare spatial patterns, or explore what lies nearby. No map can show everything. The designer chooses an extent, scale, projection, level of detail, symbols, labels, and visual hierarchy according to the job the map must do.

That selectivity is a strength when it is honest. A transit diagram may distort physical distance to make connections easier to follow; a thematic map may suppress roads so the data pattern remains visible. Each choice should serve the reader's question and make important limitations clear. Related [wayfinding](/wiki/environmental-and-spatial-design/wayfinding/) systems may use maps, but they also depend on signs, landmarks, and decisions made in the physical environment.

## Define the map's task and data

Write a brief with the intended reader, place, action, and viewing condition. Is this a visitor finding an entrance, a planner comparing districts, or a customer locating a nearby service? Will the map be printed at a fixed size, displayed on a phone, projected on a wall, or explored interactively? These answers determine how much detail is useful and what must be labelled.

Inspect the geographic data before styling it. Confirm its source, date, coverage, coordinate system, and known gaps. Check whether named places, boundaries, and routes match the current purpose. A precise-looking map can still be wrong if the source data is outdated or if two datasets describe boundaries differently. Record the source and update owner, especially for maps that people will rely on repeatedly.

## Build a legible visual hierarchy

### Choose scale and simplify deliberately

At a small scale, minor roads, tiny bends, and dense labels can overwhelm the task. Simplify geometry and remove detail according to the output size, but protect features that change a decision. At a larger scale, the reader may need entrances, crossings, paths, or building outlines. Ordnance Survey and USGS guidance both emphasise that symbolisation and detail must change with map scale.

Consider whether a map is the right form at all. If the question is simply “which of these five places has the highest value?”, a chart or table may be clearer. If geography matters, show enough surrounding context for orientation without letting the basemap compete with the subject. [Data visualisation](/wiki/information-and-data-design/data-visualisation/) provides a complementary approach when numbers, rather than locations, are the main comparison.

### Make symbols and labels work together

Use a small, consistent set of symbols with clear meanings. Distinguish features by shape, line style, and labels as well as colour when the distinction matters. Put labels near the features they name and prioritise the names needed to complete the task. A legend helps only if readers can connect it to visible marks; direct labels may be better for a short set of important items.

Create a clear figure–ground relationship. Routes, destinations, or data regions should stand out from contextual roads and land cover. Test the map in grayscale and under poor lighting, not only on a bright design monitor. Keep text and symbols legible at actual print size and at a realistic mobile zoom level.

## Be transparent about spatial meaning

Projection, scale, and boundaries shape what a map appears to say. For area-based data, check whether larger regions dominate attention simply because they take more space. State the measure, time period, classification method, and source. Avoid implying precise location when the data is only approximate, aggregated, or deliberately displaced for privacy.

Provide orientation aids that match the task. A scale bar, north arrow, locator inset, or legend can be useful, but none is mandatory decoration. Add each because it helps a real reader. For a route map, a clearly marked starting point and next decision may matter more than a large compass rose.

## Test in the real context

Ask someone unfamiliar with the area to complete a task using the map without verbal help. Watch where they hesitate: finding themselves, distinguishing similar symbols, reading long place names, or choosing between routes. For interactive maps, check keyboard access, focus order, zoom controls, and whether the same essential information is available in text or a list.

Review the map at final size and on the intended device. A wall map must be readable from its likely viewing distance; a phone map must survive limited width, touch targets, and changing orientation. Keep source data, style rules, and export versions separate so future corrections do not require tracing a flattened image.

## Practical checks

- Does the map answer a geographic question that a list or chart cannot answer more simply?
- Are source, date, extent, and meaningful uncertainty recorded?
- Can people identify the main subject before reading the legend?
- Are labels and symbols readable at the actual display size?
- Can someone complete the intended route or comparison without an explanation from the designer?

## Common mistake

Treating geographic data as a decorative background. A map's beauty should make its spatial logic easier to use. Start with the reader's task, then choose the data, scale, and style that support it.
