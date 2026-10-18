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
/// Used only without a plan.json, and then they must match the ones the plan was made with.
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

/// The plan gpxz builds from a GPX route, as JSON. `plan_bytes` is the plan.json for the
/// route, or empty: with one, its model replaces `settings` (see `model_resolve`).
pub fn summarizePlan(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    plan_bytes: []const u8,
    settings: PlanSettings,
) ![]u8 {
    return plan_json(scratch_allocator, allocator, gpx_bytes, plan_bytes, settings);
}

/// What fitz reads from a FIT activity, as JSON.
pub fn summarizeActivity(allocator: std.mem.Allocator, fit_bytes: []const u8) ![]u8 {
    return activity_json(scratch_allocator, allocator, fit_bytes);
}

/// debriefz's plan vs actual report, as JSON. `plan_bytes` as in `summarizePlan`.
pub fn analyze(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    fit_bytes: []const u8,
    plan_bytes: []const u8,
    settings: PlanSettings,
) ![]u8 {
    const inputs: Inputs = .{ .gpx = gpx_bytes, .fit = fit_bytes, .plan = plan_bytes };
    return analysis_json(scratch_allocator, allocator, &inputs, settings);
}

// ── Implementation (snake_case, testable with any pair of allocators) ────────────────────

/// The model gpxz runs with: plan.json's when the page gave one, checked against the route,
/// else the pickers'. The file stays loaded until `plan_check`, which needs its entries.
const Model = struct {
    settings: gpxz.Settings,
    file: ?debriefz.plan_file.PlanFile,

    fn deinit(self: *Model) void {
        if (self.file) |*file| file.deinit();
        self.* = undefined;
    }
};

fn model_resolve(
    scratch: std.mem.Allocator,
    gpx_bytes: []const u8,
    plan_bytes: []const u8,
    settings: PlanSettings,
) !Model {
    if (plan_bytes.len == 0) {
        assert(settings.pace_base_s_per_km > 0);
        return .{ .settings = settings.to_gpxz(), .file = null };
    }
    // CourseMismatch for a plan made for another GPX, gpxz's read errors for a bad file.
    const file = try debriefz.plan_file.load(scratch, plan_bytes, gpx_bytes);
    assert(file.settings.weather.names.len == 0);
    return .{ .settings = file.settings, .file = file };
}

/// PlanStale unless gpxz, run on the route with the file's model, gives the file's plan.
fn plan_check(model: *const Model, data: *const gpxz.GPXData) !void {
    const file = model.file orelse return;
    const recomputed = data.plan orelse return error.PlanMissing;
    try debriefz.plan_file.entries_check(file.parsed.value.entries, recomputed);
}

/// Settings as the page reads them: what the story was computed with, from the file or not.
fn settings_report(settings: *const gpxz.Settings) PlanSettings {
    return .{
        .pace_base_s_per_km = settings.pace_base_s_per_km,
        .fatigue_coefficient = settings.fatigue_coefficient,
        .life_base_stop_s = settings.life_base_stop_s,
    };
}

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
    /// The model the plan was computed with, and whether it came from a plan.json.
    settings: PlanSettings,
    plan_file: bool,
};

fn plan_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    gpx_bytes: []const u8,
    plan_bytes: []const u8,
    settings: PlanSettings,
) ![]u8 {
    var model = try model_resolve(scratch, gpx_bytes, plan_bytes, settings);
    defer model.deinit();
    var data = try gpxz.parse(scratch, gpx_bytes, &model.settings);
    defer data.deinit(scratch);
    try plan_check(&model, &data);

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
        .settings = settings_report(&model.settings),
        .plan_file = model.file != null,
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

/// The files `analyze` reads: the route, the activity, and the plan.json or nothing.
const Inputs = struct {
    gpx: []const u8,
    fit: []const u8,
    plan: []const u8,
};

fn analysis_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    inputs: *const Inputs,
    settings: PlanSettings,
) ![]u8 {
    var model = try model_resolve(scratch, inputs.gpx, inputs.plan, settings);
    defer model.deinit();
    const gpxz_settings = model.settings;
    var data = try gpxz.parse(scratch, inputs.gpx, &gpxz_settings);
    defer data.deinit(scratch);
    if (data.trace.points.len < 2) return error.TraceTooShort;
    try plan_check(&model, &data);

    var activity = try debriefz.activity.parse(scratch, inputs.fit);
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
    const json = try plan_json(testing.allocator, testing.allocator, fixture_gpx, "", .{});
    defer testing.allocator.free(json);
    const parsed = try std.json.parseFromSlice(std.json.Value, testing.allocator, json, .{});
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("distance_m").?.float > 0);
    try testing.expect(root.get("waypoints").?.array.items.len >= 2);
    try testing.expect(!root.get("plan_file").?.bool);
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
    const inputs: Inputs = .{ .gpx = fixture_gpx, .fit = fixture_fit, .plan = "" };
    const json = try analysis_json(testing.allocator, testing.allocator, &inputs, .{});
    defer testing.allocator.free(json);
    const parsed = try std.json.parseFromSlice(std.json.Value, testing.allocator, json, .{});
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("checkpoints").?.array.items.len >= 2);
    try testing.expect(root.get("totals").?.object.get("finished").?.bool);
    // The stages the pace chart toggles to: at least one, covering the plan.
    try testing.expect(root.get("stages").?.array.items.len >= 1);
    // The descents the climbs section lists beside the climbs.
    try testing.expect(root.get("descents").? == .array);
    // The series the story's profile and map draw.
    try testing.expect(root.get("profile").?.array.items.len >= 2);
    try testing.expect(root.get("track").?.array.items.len >= 2);
}

test "analyze: garbage bytes are an error, not a crash" {
    const inputs: Inputs = .{ .gpx = "nope", .fit = "nope", .plan = "" };
    const result = analysis_json(testing.allocator, testing.allocator, &inputs, .{});
    try testing.expect(std.meta.isError(result));
}

/// plan.json for the fixture route with `settings`, as gpxz writes it (Regimen's file).
fn plan_file_test(settings: *const gpxz.Settings) ![]u8 {
    var data = try gpxz.parse(testing.allocator, fixture_gpx, settings);
    defer data.deinit(testing.allocator);
    const plan = gpxz.plan_build(
        fixture_gpx,
        data.metadata.name,
        data.trace.distance_m,
        data.plan.?,
        settings,
    );
    var out: std.Io.Writer.Allocating = .init(testing.allocator);
    errdefer out.deinit();
    try gpxz.plan_write(&out.writer, &plan);
    return out.toOwnedSlice();
}

fn settings_number(root: std.json.ObjectMap, name: []const u8) f64 {
    const value = root.get("settings").?.object.get(name).?;
    return switch (value) {
        .float => |float| float,
        .integer => |integer| @floatFromInt(integer),
        else => unreachable,
    };
}

test "summarizePlan and analyze: a plan.json's model replaces the pickers'" {
    const file_settings: gpxz.Settings = .{ .pace_base_s_per_km = 420, .life_base_stop_s = 600 };
    const plan_bytes = try plan_file_test(&file_settings);
    defer testing.allocator.free(plan_bytes);
    // The pickers say something else: the file wins.
    const pickers: PlanSettings = .{ .pace_base_s_per_km = 600 };

    const allocator = testing.allocator;
    const summary = try plan_json(allocator, allocator, fixture_gpx, plan_bytes, pickers);
    defer testing.allocator.free(summary);
    const parsed = try std.json.parseFromSlice(std.json.Value, testing.allocator, summary, .{});
    defer parsed.deinit();
    try testing.expect(parsed.value.object.get("plan_file").?.bool);
    const root = parsed.value.object;
    try testing.expectEqual(@as(f64, 420), settings_number(root, "pace_base_s_per_km"));
    try testing.expectEqual(@as(f64, 600), settings_number(root, "life_base_stop_s"));

    const inputs: Inputs = .{ .gpx = fixture_gpx, .fit = fixture_fit, .plan = plan_bytes };
    const report = try analysis_json(testing.allocator, testing.allocator, &inputs, pickers);
    defer testing.allocator.free(report);
    const analysed = try std.json.parseFromSlice(std.json.Value, allocator, report, .{});
    defer analysed.deinit();
    const pace = settings_number(analysed.value.object, "pace_base_s_per_km");
    try testing.expectEqual(@as(f64, 420), pace);
}

test "summarizePlan and analyze: a plan.json for another route, or a stale one, is refused" {
    const plan_bytes = try plan_file_test(&.{});
    defer testing.allocator.free(plan_bytes);
    const edited = fixture_gpx[0 .. fixture_gpx.len - 1];
    try testing.expectError(
        error.CourseMismatch,
        plan_json(testing.allocator, testing.allocator, edited, plan_bytes, .{}),
    );
    const other: Inputs = .{ .gpx = edited, .fit = fixture_fit, .plan = plan_bytes };
    try testing.expectError(
        error.CourseMismatch,
        analysis_json(testing.allocator, testing.allocator, &other, .{}),
    );

    // A model that no longer gives the file's times: as if gpxz's had changed since.
    const stale = try std.mem.replaceOwned(
        u8,
        testing.allocator,
        plan_bytes,
        "\"pace_base_s_per_km\": 500",
        "\"pace_base_s_per_km\": 501",
    );
    defer testing.allocator.free(stale);
    try testing.expect(!std.mem.eql(u8, stale, plan_bytes));
    try testing.expectError(
        error.PlanStale,
        plan_json(testing.allocator, testing.allocator, fixture_gpx, stale, .{}),
    );
    try testing.expectError(
        error.SyntaxError,
        plan_json(testing.allocator, testing.allocator, fixture_gpx, "nope", .{}),
    );
}
