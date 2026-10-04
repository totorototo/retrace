import { Pause } from "@styled-icons/feather/Pause";
import { Play } from "@styled-icons/feather/Play";
import { X } from "@styled-icons/feather/X";
import { memo, useEffect, useMemo, useState } from "react";
import { Marker } from "react-map-gl/mapbox";

import useStore from "../../store/store.js";
import { formatClock, formatDelta, formatDuration, formatKm } from "../../utils/format.js";
import { toneOf } from "../story/debrief.js";
import OfflineRoutePreview from "./OfflineRoutePreview.jsx";
import {
  defaultSpeed,
  plannedTimeline,
  REPLAY_SPEEDS,
  replayAt,
  replayDuration,
} from "./replay.js";

// The race replayed on the map against the plan's runner, as Strava's Flyby replays an
// activity against others': a filled dot where the runner was, a hollow one where the plan
// had them. Every piece that moves reads `replay_s` from the store on its own, so a frame
// re-renders two markers and the controls, never the map.

/** The plan's clock and the replay's length, once per report. */
export function useReplayModel() {
  const report = useStore((state) => state.report);
  return useMemo(() => {
    const timeline = plannedTimeline(report);
    return { report, timeline, duration_s: replayDuration(report, timeline) };
  }, [report]);
}

function useReplayAt(model) {
  const replay_s = useStore((state) => state.replay_s);
  return replay_s == null ? null : replayAt(model.report, model.timeline, replay_s);
}

/**
 * Advances the replay while it plays, `speed` race seconds per second, and stops it at the
 * end. why: requestAnimationFrame, not setInterval: it runs at the display's rate, pauses in
 * a background tab, and the frame's own timestamp keeps the pace right whatever the rate.
 */
function useReplayClock(duration_s, speed) {
  const playing = useStore((state) => state.replayPlaying);

  useEffect(() => {
    if (!playing) return undefined;
    let id;
    let last = null;
    const tick = (now) => {
      const { replay_s, setReplay } = useStore.getState();
      const elapsed = last == null ? 0 : ((now - last) / 1000) * speed;
      last = now;
      const next = Math.min(duration_s, (replay_s ?? 0) + elapsed);
      setReplay(next, next < duration_s);
      if (next < duration_s) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, duration_s, speed]);
}

function Readout({ at }) {
  const gap = Math.abs(at.gap_m) < 50 ? "level" : at.gap_m > 0 ? "behind" : "ahead";
  return (
    <p className="replay-readout" data-testid="replay-readout">
      <span>
        <i className="swatch runner" /> You {formatKm(at.actual.distance_m)}
      </span>
      <span>
        <i className="swatch plan" /> Plan {formatKm(at.planned.distance_m)}
      </span>
      {at.actual.on_route ? (
        <b data-tone={toneOf(at.delta_s)}>
          {formatDelta(at.delta_s)}
          {gap !== "level" && `, ${formatKm(Math.abs(at.gap_m))} ${gap}`}
        </b>
      ) : (
        <b>off the planned trace</b>
      )}
    </p>
  );
}

/** The replay's controls, over the map's top-left corner. */
export const ReplayControls = memo(function ReplayControls() {
  const model = useReplayModel();
  const replay_s = useStore((state) => state.replay_s);
  const playing = useStore((state) => state.replayPlaying);
  const setReplay = useStore((state) => state.setReplay);
  const stopReplay = useStore((state) => state.stopReplay);
  const [speed, setSpeed] = useState(() => defaultSpeed(model.duration_s));
  useReplayClock(model.duration_s, speed);
  const at = useReplayAt(model);

  if (replay_s == null) {
    return (
      <div className="replay">
        <button type="button" className="map-btn replay-start" onClick={() => setReplay(0, true)}>
          <Play size={14} /> Replay against the plan
        </button>
      </div>
    );
  }

  const togglePlaying = () => {
    // From the end, play starts over.
    const from = !playing && replay_s >= model.duration_s ? 0 : replay_s;
    setReplay(from, !playing);
  };
  const nextSpeed = () =>
    setSpeed(REPLAY_SPEEDS[(REPLAY_SPEEDS.indexOf(speed) + 1) % REPLAY_SPEEDS.length]);

  return (
    <div className="replay is-active" role="group" aria-label="Race replay">
      <div className="replay-bar">
        <button
          type="button"
          className="map-btn"
          onClick={togglePlaying}
          aria-label={playing ? "Pause the replay" : "Play the replay"}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <input
          type="range"
          className="replay-scrubber"
          min={0}
          max={model.duration_s}
          step={1}
          value={replay_s}
          onChange={(event) => setReplay(Number(event.target.value))}
          aria-label="Race time"
          aria-valuetext={formatDuration(replay_s)}
        />
        <span className="replay-clock" data-testid="replay-clock">
          {formatDuration(replay_s)}
          <span className="replay-time">
            {formatClock(
              model.report.totals.epoch_s_start_actual + replay_s,
              model.report.totals.utc_offset_s,
            )}
          </span>
        </span>
        <button
          type="button"
          className="map-btn replay-speed"
          onClick={nextSpeed}
          aria-label={`Replay speed: ${speed} times`}
        >
          ×{speed}
        </button>
        <button
          type="button"
          className="map-btn"
          onClick={stopReplay}
          aria-label="Close the replay"
        >
          <X size={14} />
        </button>
      </div>
      <Readout at={at} />
    </div>
  );
});

/** The two runners on the Mapbox map; the runner's drawn last, over the plan's. */
export const ReplayMarkers = memo(function ReplayMarkers({ runnerColor, planColor }) {
  const at = useReplayAt(useReplayModel());
  if (!at) return null;
  return (
    <>
      <Marker longitude={at.planned.longitude} latitude={at.planned.latitude} anchor="center">
        <div className="replay-marker plan" style={{ "--marker-color": planColor }} />
      </Marker>
      <Marker longitude={at.actual.longitude} latitude={at.actual.latitude} anchor="center">
        <div
          className="replay-marker runner"
          style={{ "--marker-color": runnerColor }}
          data-testid="replay-runner"
        />
      </Marker>
    </>
  );
});

/** The offline preview, with the chart cursor or, while replaying, the two runners. */
export const OfflineReplayPreview = memo(function OfflineReplayPreview({ lines, cursor, colors }) {
  const at = useReplayAt(useReplayModel());
  const markers = at
    ? [
        {
          coordinate: [at.planned.longitude, at.planned.latitude],
          fill: colors.background,
          stroke: colors.text,
        },
        { coordinate: [at.actual.longitude, at.actual.latitude], fill: colors.runner },
      ]
    : cursor
      ? [{ coordinate: [cursor.longitude, cursor.latitude], fill: colors.text }]
      : [];
  return <OfflineRoutePreview lines={lines} markers={markers} />;
});
