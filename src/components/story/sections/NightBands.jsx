// The stretches run in the dark, behind a distance chart: a faint shade the full height and a
// strip along the bottom. Styled by chartCss.
// why: the strip at the bottom, where the off-trace bands put theirs at the top, so the two
// can overlap (a detour at night) and both still read; and no hue: red and green are taken.
const STRIP = 3;

export default function NightBands({ spans, scaleX, top, height }) {
  return spans.map((span, index) => {
    const x = scaleX(span.start_m);
    const width = Math.max(scaleX(span.end_m) - x, 0.8);
    return (
      <g key={index} className="night">
        <title>{`In the dark: km ${(span.start_m / 1000).toFixed(0)} to ${(span.end_m / 1000).toFixed(0)}`}</title>
        <rect className="night-band" x={x} y={top} width={width} height={height} />
        <rect className="night-strip" x={x} y={top + height - STRIP} width={width} height={STRIP} />
      </g>
    );
  });
}
