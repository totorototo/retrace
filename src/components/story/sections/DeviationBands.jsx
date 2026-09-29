import { formatKm } from "../../../utils/format.js";

// The stretches run off the planned trace, behind a distance chart: a neutral shade the
// full height, and a strip along the top. Styled by chartCss.
// why: a shape, not a colour of its own: the charts already spend red on "behind" and
// green on "ahead", so a tinted band would read as one more stretch of lost time.
const STRIP = 3;

export default function DeviationBands({ spans, scaleX, top, height }) {
  return spans.map((span, index) => {
    const x = scaleX(span.start_m);
    const width = Math.max(scaleX(span.end_m) - x, 0.8);
    return (
      <g key={index} className="deviation">
        <title>{`Off the planned trace: ${formatKm(span.distance_m, 2)} run`}</title>
        <rect className="deviation-band" x={x} y={top} width={width} height={height} />
        <rect className="deviation-strip" x={x} y={top} width={width} height={STRIP} />
      </g>
    );
  });
}
