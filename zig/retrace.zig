//! retrace: the WebAssembly boundary. JavaScript hands over the raw bytes of a GPX and a FIT
//! file, and gets JSON back. All the work lives in the three libraries:
//!
//! - gpxz: GPX parsing and the plan (pace model, sections, checkpoint ETAs).
//! - fitz: FIT parsing.
//! - debriefz: plan vs actual, built on the two.
//!
//! JSON rather than Zig structs crosses the boundary on purpose: the reports are trees of
//! optional fields and slices, which Zigar would expose as proxies over WASM memory that the
//! caller must free. A JSON string is copied out once, and the worker posts a plain object.

const std = @import("std");
const builtin = @import("builtin");
const assert = std.debug.assert;
const gpxz = @import("gpxz");
const fitz = @import("fitz");
const debriefz = @import("debriefz");

/// Scratch memory for parsing and comparing. The allocator Zigar passes in is only used for
/// the returned JSON, so JavaScript owns exactly one allocation per call.
const scratch_allocator = if (builtin.target.cpu.arch.isWasm())
    std.heap.wasm_allocator
else
    std.heap.smp_allocator;

/// The plan's pace settings, as JavaScript passes them. Missing fields take gpxz's defaults.
/// They must match the ones the plan was made with.
pub const PlanSettings = struct {
    pace_base_s_per_km: f64 = 500,
    fatigue_coefficient: f64 = 0.002,
    life_base_stop_s: u32 = 3600,

    fn to_gpxz(self: PlanSettings) gpxz.Settings {
        return .{
            .pace_base_s_per_km = self.pace_base_s_per_km,
            .fatigue_coefficient = self.fatigue_coefficient,
            .life_base_stop_s = self.life_base_stop_s,
        };
    }
};

// ── Exports (camelCase: these names are the JavaScript API) ──────────────────────────────

/// The plan gpxz builds from a GPX route, as JSON.
pub fn summarizePlan(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    settings: PlanSettings,
) ![]u8 {
    return plan_json(scratch_allocator, allocator, gpx_bytes, settings);
}

/// What fitz reads from a FIT activity, as JSON.
pub fn summarizeActivity(allocator: std.mem.Allocator, fit_bytes: []const u8) ![]u8 {
    return activity_json(scratch_allocator, allocator, fit_bytes);
}

/// debriefz's plan vs actual report, as JSON.
pub fn analyze(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    fit_bytes: []const u8,
    settings: PlanSettings,
) ![]u8 {
    return analysis_json(scratch_allocator, allocator, gpx_bytes, fit_bytes, settings);
}

// ── Implementation (snake_case, testable with any pair of allocators) ────────────────────

/// Everything in gpxz's GPXData except the per-point arrays, which run to several MiB on a
/// long route. Mirrors what `gpxz --json` prints.
const PlanReport = struct {
    name: ?[]const u8,
    description: ?[]const u8,
    distance_m: f64,
    elevation_gain_m: f64,
    elevation_loss_m: f64,
    climbs: []const gpxz.ClimbStats,
    waypoints: []const gpxz.Waypoint,
    sections: ?[]const gpxz.SectionStats,
    stages: ?[]const gpxz.StageStats,
    plan: ?[]const gpxz.PlanEntry,
};

fn plan_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    gpx_bytes: []const u8,
    settings: PlanSettings,
) ![]u8 {
    assert(settings.pace_base_s_per_km > 0);
    const gpxz_settings = settings.to_gpxz();
    var data = try gpxz.parse(scratch, gpx_bytes, &gpxz_settings);
    defer data.deinit(scratch);

    const report: PlanReport = .{
        .name = data.metadata.name,
        .description = data.metadata.description,
        .distance_m = data.trace.distance_m,
        .elevation_gain_m = data.trace.elevation_gain_m,
        .elevation_loss_m = data.trace.elevation_loss_m,
        .climbs = data.trace.climbs,
        .waypoints = data.waypoints,
        .sections = data.sections,
        .stages = data.stages,
        .plan = data.plan,
    };
    return json_stringify(output, report);
}

const MessageCount = struct {
    name: []const u8,
    count: u32,
};

const ActivityReport = struct {
    samples: u64,
    records_without_position: u32,
    duration_s: f64,
    epoch_s_start: i64,
    utc_offset_s: ?i32,
    session: debriefz.activity.Session,
    /// Every message type in the file and how often it occurs, in order of first appearance.
    messages: []const MessageCount,
};

/// A FIT file holds a few dozen message types at most; the bound only guards a hostile file.
const message_types_max = 1024;

fn activity_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    fit_bytes: []const u8,
) ![]u8 {
    var activity = try debriefz.activity.parse(scratch, fit_bytes);
    defer activity.deinit(scratch);
    assert(activity.samples.len > 0);

    const messages = try messages_count(scratch, fit_bytes);
    defer scratch.free(messages);

    const report: ActivityReport = .{
        .samples = activity.samples.len,
        .records_without_position = activity.records_without_position,
        .duration_s = activity.duration_s(),
        .epoch_s_start = activity.samples[0].epoch_s,
        .utc_offset_s = activity.utc_offset_s,
        .session = activity.session,
        .messages = messages,
    };
    return json_stringify(output, report);
}

/// Counts data messages by type with fitz directly: debriefz only keeps records and the
/// session, and this shows what else the device wrote.
fn messages_count(allocator: std.mem.Allocator, fit_bytes: []const u8) ![]MessageCount {
    var parser = try fitz.Parser.init(allocator, fit_bytes);
    defer parser.deinit();

    var counts: std.ArrayList(MessageCount) = .empty;
    errdefer counts.deinit(allocator);
    var numbers: std.ArrayList(u16) = .empty;
    defer numbers.deinit(allocator);

    while (try parser.next()) |record| {
        const data = switch (record) {
            .data => |data| data,
            .definition => continue,
        };
        const number = data.global_message_number;
        const index = std.mem.indexOfScalar(u16, numbers.items, number) orelse index: {
            if (numbers.items.len == message_types_max) return error.TooManyMessageTypes;
            try numbers.append(allocator, number);
            try counts.append(allocator, .{
                .name = fitz.profile.message_name(number) orelse "unknown",
                .count = 0,
            });
            break :index numbers.items.len - 1;
        };
        counts.items[index].count += 1;
    }
    assert(counts.items.len == numbers.items.len);
    return counts.toOwnedSlice(allocator);
}

fn analysis_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    gpx_bytes: []const u8,
    fit_bytes: []const u8,
    settings: PlanSettings,
) ![]u8 {
    assert(settings.pace_base_s_per_km > 0);
    const gpxz_settings = settings.to_gpxz();
    var data = try gpxz.parse(scratch, gpx_bytes, &gpxz_settings);
    defer data.deinit(scratch);
    if (data.trace.points.len < 2) return error.TraceTooShort;

    var activity = try debriefz.activity.parse(scratch, fit_bytes);
    defer activity.deinit(scratch);

    var match = try debriefz.match.match(scratch, &data.trace, activity.samples, &.{});
    defer match.deinit(scratch);
    var report = try debriefz.compare.compare(
        scratch,
        &data,
        &gpxz_settings,
        &activity,
        &match,
        &.{},
    );
    defer report.deinit(scratch);
    assert(report.sections.len + 1 == report.checkpoints.len);

    return json_stringify(output, report);
}

fn json_stringify(allocator: std.mem.Allocator, value: anytype) ![]u8 {
    var out: std.Io.Writer.Allocating = .init(allocator);
    errdefer out.deinit();
    try std.json.Stringify.value(value, .{}, &out.writer);
    const json = try out.toOwnedSlice();
    assert(json.len > 0);
    return json;
}

// ── Tests ───────────────────────────────────────────────────────────────────────────────

const testing = std.testing;
const fixture_gpx = @embedFile("fixture.gpx");
const fixture_fit = @embedFile("fixture.fit");

test "summarizePlan: route totals and checkpoints" {
    const json = try plan_json(testing.allocator, testing.allocator, fixture_gpx, .{});
    defer testing.allocator.free(json);
    const parsed = try std.json.parseFromSlice(std.json.Value, testing.allocator, json, .{});
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("distance_m").?.float > 0);
    try testing.expect(root.get("waypoints").?.array.items.len >= 2);
}

test "summarizeActivity: samples and message counts" {
    const json = try activity_json(testing.allocator, testing.allocator, fixture_fit);
    defer testing.allocator.free(json);
    const parsed = try std.json.parseFromSlice(std.json.Value, testing.allocator, json, .{});
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("samples").?.integer > 0);
    try testing.expect(root.get("messages").?.array.items.len > 0);
}

test "analyze: a report with every checkpoint" {
    const json = try analysis_json(
        testing.allocator,
        testing.allocator,
        fixture_gpx,
        fixture_fit,
        .{},
    );
    defer testing.allocator.free(json);
    const parsed = try std.json.parseFromSlice(std.json.Value, testing.allocator, json, .{});
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("checkpoints").?.array.items.len >= 2);
    try testing.expect(root.get("totals").?.object.get("finished").?.bool);
}

test "analyze: garbage bytes are an error, not a crash" {
    const result = analysis_json(testing.allocator, testing.allocator, "nope", "nope", .{});
    try testing.expect(std.meta.isError(result));
}
