import { scaleLinear } from "d3-scale";

// Copied from Terminus's helpers/d3.js: only the scales the story charts use.

export const createXScale = (domain = { min: 0, max: 0 }, range = { min: 0, max: 0 }) =>
  scaleLinear().domain([domain.min, domain.max]).range([range.min, range.max]);

// Pass range { min: height, max: 0 } to flip it to SVG's downward y.
export const createYScale = (domain = { min: 0, max: 0 }, range = { min: 0, max: 0 }) =>
  scaleLinear().domain([domain.min, domain.max]).range([range.min, range.max]);
