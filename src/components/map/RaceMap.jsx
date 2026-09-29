import "mapbox-gl/dist/mapbox-gl.css";

import { MapPin } from "@styled-icons/feather/MapPin";
import { Maximize2 } from "@styled-icons/feather/Maximize2";
import { Minimize2 } from "@styled-icons/feather/Minimize2";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Map, { Layer, Marker, Source } from "react-map-gl/mapbox";
import { useTheme } from "styled-components";

import { useIsOnline } from "../../hooks/useIsOnline.js";
import useStore from "../../store/store.js";
import { profileAt } from "../story/debrief.js";
import OfflineRoutePreview from "./OfflineRoutePreview.jsx";
import {
  bounds as boundsOf,
  checkpointPositions,
  plannedCoordinates,
  trackGeoJSON,
  trackRuns,
} from "./raceGeometry.js";
import style from "./RaceMap.style.js";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_KEY;

// Adapted from Terminus's trailData/Map: the same Mapbox outdoors style with terrain, fit
// then tilt, fullscreen (native or a CSS fallback), and an SVG preview offline. Here it
// draws the plan and the race: the planned route under the actual track, the track's
// off-route runs in the accent colour, a pin per checkpoint, and a marker at the chart
// cursor, so pointing along any chart shows where that was.

// iPhone Safari only gives <video> the element Fullscreen API (see Terminus).
const hasFullscreenApi =
  typeof document !== "undefined" &&
  Boolean(document.fullscreenEnabled ?? document.webkitFullscreenEnabled);

function useFullscreen(containerRef) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!hasFullscreenApi) return undefined;
    const handleChange = () => {
      const active = document.fullscreenElement ?? document.webkitFullscreenElement;
      setIsFullscreen(active === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, [containerRef]);

  // The CSS fallback has no native Escape-to-exit or scroll lock: wired by hand.
  useEffect(() => {
    if (hasFullscreenApi || !isFullscreen) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const toggle = useCallback(() => {
    if (!hasFullscreenApi) {
      setIsFullscreen((previous) => !previous);
      return;
    }
    if (document.fullscreenElement ?? document.webkitFullscreenElement) {
      (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
      return;
    }
    const container = containerRef.current;
    (container?.requestFullscreen ?? container?.webkitRequestFullscreen)
      ?.call(container)
      ?.catch(() => {});
  }, [containerRef]);

  return [isFullscreen, toggle];
}

const RaceMap = memo(function RaceMap({ className }) {
  const report = useStore((state) => state.report);
  const cursor_m = useStore((state) => state.cursor_m);
  const theme = useTheme();
  const isOnline = useIsOnline();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, toggleFullscreen] = useFullscreen(containerRef);

  const geometry = useMemo(() => {
    const planned = plannedCoordinates(report);
    return {
      planned,
      plannedGeoJSON: { type: "Feature", geometry: { type: "LineString", coordinates: planned } },
      track: trackGeoJSON(report.track),
      runs: trackRuns(report.track),
      checkpoints: checkpointPositions(report),
      bounds: boundsOf([
        ...planned,
        ...report.track.map((point) => [point.longitude, point.latitude]),
      ]),
    };
  }, [report]);

  const cursor = cursor_m == null ? null : profileAt(report.profile, cursor_m);

  // Mapbox paints from values, not CSS custom properties: the theme's, as in Terminus.
  // The planned route takes the background colour: the outdoors basemap is light whatever
  // the theme, and the dark theme's text colour vanishes on it.
  const colors = theme.colors[theme.currentVariant];
  const plannedColor = colors["--color-background"];
  const trackColor = colors["--color-primary"];
  const offRouteColor = colors["--color-accent"];
  const pinColor = colors["--color-secondary"];

  const fitToBounds = useCallback(() => {
    if (!mapRef.current) return;
    // fitBounds zooms out too far with a pitch set: fit flat, then tilt (see Terminus).
    // A gentler tilt and more padding than Terminus's 55° and 32 px: a route that runs
    // east-west, like most point-to-points, otherwise loses both ends out of the frame.
    mapRef.current.fitBounds(geometry.bounds, { padding: 56, duration: 0 });
    mapRef.current.getMap()?.easeTo({ pitch: 40, duration: 0 });
  }, [geometry.bounds]);

  useEffect(() => {
    fitToBounds();
  }, [fitToBounds]);

  // The declarative `terrain` prop tries once, before the DEM source exists: set it when
  // the source has loaded instead (see Terminus).
  const handleLoad = useCallback(() => {
    fitToBounds();
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const applyTerrain = () => {
      if (!map.getSource("mapbox-dem")) return;
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      map.off("sourcedata", applyTerrain);
    };
    applyTerrain();
    map.on("sourcedata", applyTerrain);
  }, [fitToBounds]);

  // Entering or leaving fullscreen resizes the container without a window resize event.
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return undefined;
    const id = requestAnimationFrame(() => map.resize());
    return () => cancelAnimationFrame(id);
  }, [isFullscreen]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className={className}>
        <div className="map-message">Set VITE_MAPBOX_KEY in .env to display the map.</div>
      </div>
    );
  }

  const fullscreenButton = (
    <button
      type="button"
      className="fullscreen-btn"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? "Exit fullscreen map" : "View map fullscreen"}
    >
      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );
  const containerClassName = `${className}${isFullscreen ? " is-fullscreen" : ""}`;
  // The CSS fallback's position: fixed must escape any transformed ancestor: portal it.
  const renderFullscreenable = (node) =>
    isFullscreen && !hasFullscreenApi ? createPortal(node, document.body) : node;

  if (!isOnline) {
    return renderFullscreenable(
      <div ref={containerRef} className={containerClassName}>
        {fullscreenButton}
        <OfflineRoutePreview
          lines={[
            {
              coordinates: geometry.planned,
              color: colors["--color-text"],
              width: 4,
              opacity: 0.35,
            },
            ...geometry.runs.map((run) => ({
              coordinates: run.coordinates,
              color: run.on_route ? trackColor : offRouteColor,
              width: run.on_route ? 2 : 3,
              opacity: 1,
            })),
          ]}
          marker={cursor && [cursor.longitude, cursor.latitude]}
          markerColor={colors["--color-text"]}
        />
      </div>,
    );
  }

  return renderFullscreenable(
    <div ref={containerRef} className={containerClassName}>
      {fullscreenButton}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: 0, latitude: 0, zoom: 1, pitch: 40 }}
        maxPitch={70}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        style={{ width: "100%", height: "100%" }}
        cooperativeGestures
        onLoad={handleLoad}
      >
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
        <Source id="planned" type="geojson" data={geometry.plannedGeoJSON}>
          <Layer
            id="planned-line"
            type="line"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": plannedColor, "line-width": 6, "line-opacity": 0.45 }}
          />
        </Source>
        <Source id="track" type="geojson" data={geometry.track}>
          <Layer
            id="track-line"
            type="line"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": ["case", ["get", "on_route"], trackColor, offRouteColor],
              "line-width": ["case", ["get", "on_route"], 2.5, 4],
            }}
          />
        </Source>
        {geometry.checkpoints.map((checkpoint, index) => (
          <Marker
            key={`${checkpoint.name}-${index}`}
            longitude={checkpoint.longitude}
            latitude={checkpoint.latitude}
            anchor="bottom"
          >
            <MapPin
              className="waypoint-marker"
              size={24}
              style={{ "--waypoint-color": pinColor }}
              role="img"
              aria-label={checkpoint.name}
              title={checkpoint.name}
            />
          </Marker>
        ))}
        {cursor && (
          <Marker longitude={cursor.longitude} latitude={cursor.latitude} anchor="center">
            <div className="cursor-marker" data-testid="map-cursor" />
          </Marker>
        )}
      </Map>
    </div>,
  );
});

export default style(RaceMap);
