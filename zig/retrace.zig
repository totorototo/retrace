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

/// The plan's model, as the page reads it. It comes from the plan.json only: retrace never
/// defines a plan, so a comparison without one is `PlanFileMissing`.
pub const PlanSettings = struct {
    pace_base_s_per_km: f64,
    fatigue_coefficient: f64,
    life_base_stop_s: u32,
};

// ── Exports (camelCase: these names are the JavaScript API) ──────────────────────────────

/// What a GPX route holds, as JSON, before the activity is in. `plan_bytes` is the plan.json
/// for the route, or empty: the route's stats need no model, so it is checked (and its model
/// reported) only once it is there.
pub fn summarizePlan(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    plan_bytes: []const u8,
) ![]u8 {
    return plan_json(scratch_allocator, allocator, gpx_bytes, plan_bytes);
}

/// What fitz reads from a FIT activity, as JSON.
pub fn summarizeActivity(allocator: std.mem.Allocator, fit_bytes: []const u8) ![]u8 {
    return activity_json(scratch_allocator, allocator, fit_bytes);
}

/// debriefz's plan vs actual report, as JSON, against the plan in `plan_bytes`: required.
pub fn analyze(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    fit_bytes: []const u8,
    plan_bytes: []const u8,
) ![]u8 {
    const inputs: Inputs = .{ .gpx = gpx_bytes, .fit = fit_bytes, .plan = plan_bytes };
    return analysis_json(scratch_allocator, allocator, &inputs);
}

// ── Implementation (snake_case, testable with any pair of allocators) ────────────────────

/// The plan.json read and checked against the route: CourseMismatch for a plan made for
/// another GPX, gpxz's read errors for a bad file. The caller frees it with `deinit`.
fn plan_load(
    scratch: std.mem.Allocator,
    gpx_bytes: []const u8,
    plan_bytes: []const u8,
) !debriefz.plan_file.PlanFile {
    if (plan_bytes.len == 0) return error.PlanFileMissing;
    const file = try debriefz.plan_file.load(scratch, plan_bytes, gpx_bytes);
    assert(file.settings.weather.names.len == 0);
    return file;
}

/// PlanStale unless gpxz, run on the route with the file's model, gives the file's plan.
fn plan_check(file: *const debriefz.plan_file.PlanFile, data: *const gpxz.GPXData) !void {
    const recomputed = data.plan orelse return error.PlanMissing;
    try debriefz.plan_file.entries_check(file.parsed.value.entries, recomputed);
}

/// The model as the page reads it.
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
    /// The plan.json's model, or null before one is loaded.
    settings: ?PlanSettings,
};

fn plan_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    gpx_bytes: []const u8,
    plan_bytes: []const u8,
) ![]u8 {
    var file: ?debriefz.plan_file.PlanFile = if (plan_bytes.len == 0)
        null
    else
        try plan_load(scratch, gpx_bytes, plan_bytes);
    defer if (file) |*loaded| loaded.deinit();
    // Without a plan.json the route's stats still need a parse, and gpxz's parse runs the pace
    // model: its defaults, whose times are dropped below, never shown.
    const settings: gpxz.Settings = if (file) |*loaded| loaded.settings else .{};
    var data = try gpxz.parse(scratch, gpx_bytes, &settings);
    defer data.deinit(scratch);
    if (file) |*loaded| try plan_check(loaded, &data);

    const report: PlanReport = .{
        .name = data.metadata.name,
        .description = data.metadata.description,
        .distance_m = data.trace.distance_m,
        .elevation_gain_m = data.trace.elevation_gain_m,
        .elevation_loss_m = data.trace.elevation_loss_m,
        .climbs = data.trace.climbs,
        .waypoints = data.waypoints,
        // Their durations are the pace model's: without the plan.json, gpxz's defaults.
        .sections = if (file != null) data.sections else null,
        .stages = if (file != null) data.stages else null,
        .plan = if (file != null) data.plan else null,
        .settings = if (file) |*loaded| settings_report(&loaded.settings) else null,
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
/// session, and this shows what else the device wrote. Lenient, as debriefz reads the file: a
/// Coros field of the wrong size must not refuse a file debriefz has just read.
fn messages_count(allocator: std.mem.Allocator, fit_bytes: []const u8) ![]MessageCount {
    var parser = try fitz.Parser.init_options(allocator, fit_bytes, .{
        .field_size_mismatch = .bytes,
    });
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
) ![]u8 {
    var file = try plan_load(scratch, inputs.gpx, inputs.plan);
    defer file.deinit();
    const gpxz_settings = file.settings;
    var data = try gpxz.parse(scratch, inputs.gpx, &gpxz_settings);
    defer data.deinit(scratch);
    if (data.trace.points.len < 2) return error.TraceTooShort;
    try plan_check(&file, &data);

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
/// From python-fitparse's tests (MIT), through fitz: a Coros file with a mis-sized field.
const fixture_coros_fit = @embedFile("fixture.coros.fit");

/// The plan.json the e2e tests pick: a v1 file, written before gpxz added fueling.
const fixture_plan_v1 = @embedFile("fixture.plan.json");

/// The v2 plan.json the e2e tests pick: fueling planned, as Regimen writes it. The test below
/// keeps it byte for byte what gpxz writes, so the browser test can't pass on a stale file.
const fixture_plan_v2 = @embedFile("fixture.plan.v2.json");

/// plan.json for the fixture route with `settings`, as gpxz writes it (Regimen's file), with
/// fueling at gpxz's default supplies when `fueling_planned`.
fn plan_file_test(settings: *const gpxz.Settings) ![]u8 {
    return plan_file_fueling_test(settings, false);
}

fn plan_file_fueling_test(settings: *const gpxz.Settings, fueling_planned: bool) ![]u8 {
    var data = try gpxz.parse(testing.allocator, fixture_gpx, settings);
    defer data.deinit(testing.allocator);
    const entries = data.plan.?;

    const supplies = try testing.allocator.alloc(gpxz.fueling.Supply, entries.len);
    defer testing.allocator.free(supplies);
    gpxz.fueling.supplies_default(entries, supplies);
    const times = try testing.allocator.alloc(gpxz.fueling.Times, entries.len);
    defer testing.allocator.free(times);
    gpxz.fueling.times_from_entries(entries, times);
    const carry = try testing.allocator.alloc(?gpxz.fueling.Carry, entries.len);
    defer testing.allocator.free(carry);
    const fuel_plan: gpxz.fueling.FuelPlan = .{
        .fueling = .{
            .carbs_g_per_h = 60,
            .fluid_ml_per_h = 500,
            .sodium_mg_per_h = 400,
            .reserve_s = 600,
            .supplies = supplies,
        },
        .carry = carry,
    };
    gpxz.fueling.carry_compute(times, &fuel_plan.fueling, carry);

    const plan = gpxz.plan_build(
        fixture_gpx,
        data.metadata.name,
        data.trace.distance_m,
        entries,
        settings,
        if (fueling_planned) &fuel_plan else null,
    );
    assert((plan.model.fueling != null) == fueling_planned);
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

fn json_parse(json: []const u8) !std.json.Parsed(std.json.Value) {
    return std.json.parseFromSlice(std.json.Value, testing.allocator, json, .{});
}

test "summarizePlan: the route's stats before the plan.json, and no model's times" {
    const json = try plan_json(testing.allocator, testing.allocator, fixture_gpx, "");
    defer testing.allocator.free(json);
    const parsed = try json_parse(json);
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("distance_m").?.float > 0);
    try testing.expect(root.get("waypoints").?.array.items.len >= 2);
    try testing.expect(root.get("settings").? == .null);
    try testing.expect(root.get("plan").? == .null);
    try testing.expect(root.get("sections").? == .null);
}

test "summarizePlan: with the plan.json, its model and its checkpoints" {
    const settings: gpxz.Settings = .{ .pace_base_s_per_km = 420, .life_base_stop_s = 600 };
    const plan_bytes = try plan_file_test(&settings);
    defer testing.allocator.free(plan_bytes);
    const json = try plan_json(testing.allocator, testing.allocator, fixture_gpx, plan_bytes);
    defer testing.allocator.free(json);
    const parsed = try json_parse(json);
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expectEqual(@as(f64, 420), settings_number(root, "pace_base_s_per_km"));
    try testing.expectEqual(@as(f64, 600), settings_number(root, "life_base_stop_s"));
    try testing.expect(root.get("plan").?.array.items.len >= 2);
}

test "summarizeActivity: samples and message counts" {
    const json = try activity_json(testing.allocator, testing.allocator, fixture_fit);
    defer testing.allocator.free(json);
    const parsed = try json_parse(json);
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("samples").?.integer > 0);
    try testing.expect(root.get("messages").?.array.items.len > 0);
}

test "analyze: a report with every checkpoint, on the plan.json's model" {
    const plan_bytes = try plan_file_test(&.{ .pace_base_s_per_km = 450 });
    defer testing.allocator.free(plan_bytes);
    const inputs: Inputs = .{ .gpx = fixture_gpx, .fit = fixture_fit, .plan = plan_bytes };
    const json = try analysis_json(testing.allocator, testing.allocator, &inputs);
    defer testing.allocator.free(json);
    const parsed = try json_parse(json);
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("checkpoints").?.array.items.len >= 2);
    try testing.expect(root.get("totals").?.object.get("finished").?.bool);
    try testing.expectEqual(@as(f64, 450), settings_number(root, "pace_base_s_per_km"));
    // The stages the pace chart toggles to: at least one, covering the plan.
    try testing.expect(root.get("stages").?.array.items.len >= 1);
    // The descents the climbs section lists beside the climbs.
    try testing.expect(root.get("descents").? == .array);
    // The series the story's profile and map draw.
    try testing.expect(root.get("profile").?.array.items.len >= 2);
    try testing.expect(root.get("track").?.array.items.len >= 2);
}

test "analyze: Regimen's v2 plan.json with fueling, on the same model as without" {
    const settings: gpxz.Settings = .{ .pace_base_s_per_km = 450, .life_base_stop_s = 600 };
    const plan_bytes = try plan_file_fueling_test(&settings, true);
    defer testing.allocator.free(plan_bytes);
    try testing.expect(std.mem.indexOf(u8, plan_bytes, "\"schema_version\": 2") != null);
    try testing.expect(std.mem.indexOf(u8, plan_bytes, "\"carbs_g_per_h\": 60") != null);

    const inputs: Inputs = .{ .gpx = fixture_gpx, .fit = fixture_fit, .plan = plan_bytes };
    const json = try analysis_json(testing.allocator, testing.allocator, &inputs);
    defer testing.allocator.free(json);
    const parsed = try json_parse(json);
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("checkpoints").?.array.items.len >= 2);
    try testing.expectEqual(@as(f64, 450), settings_number(root, "pace_base_s_per_km"));
    try testing.expectEqual(@as(f64, 600), settings_number(root, "life_base_stop_s"));
}

test "the v2 fixture plan.json is what gpxz writes with fueling" {
    const settings: gpxz.Settings = .{ .pace_base_s_per_km = 450, .life_base_stop_s = 600 };
    const plan_bytes = try plan_file_fueling_test(&settings, true);
    defer testing.allocator.free(plan_bytes);
    try testing.expect(std.mem.indexOf(u8, fixture_plan_v2, "\"schema_version\": 2") != null);
    try testing.expect(std.mem.indexOf(u8, fixture_plan_v2, "\"fueling\": {") != null);
    // A mismatch prints both: regenerate testdata/route.plan.v2.json from the expected bytes.
    try testing.expectEqualStrings(plan_bytes, fixture_plan_v2);
}

test "analyze: the v1 fixture plan.json, from before fueling, still compares" {
    try testing.expect(std.mem.indexOf(u8, fixture_plan_v1, "\"schema_version\": 1") != null);
    const inputs: Inputs = .{ .gpx = fixture_gpx, .fit = fixture_fit, .plan = fixture_plan_v1 };
    const json = try analysis_json(testing.allocator, testing.allocator, &inputs);
    defer testing.allocator.free(json);
    const parsed = try json_parse(json);
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(root.get("checkpoints").?.array.items.len >= 2);
    // 7:30/km and a 10 min stop, as e2e/analysis.spec.js reads it.
    try testing.expectEqual(@as(f64, 450), settings_number(root, "pace_base_s_per_km"));
    try testing.expectEqual(@as(f64, 600), settings_number(root, "life_base_stop_s"));
}

test "summarizePlan: a plan.json newer than gpxz reads is refused" {
    const plan_bytes = try plan_file_test(&.{});
    defer testing.allocator.free(plan_bytes);
    const v3 = try std.mem.replaceOwned(
        u8,
        testing.allocator,
        plan_bytes,
        "\"schema_version\": 2",
        "\"schema_version\": 3",
    );
    defer testing.allocator.free(v3);
    try testing.expect(!std.mem.eql(u8, v3, plan_bytes));
    try testing.expectError(
        error.SchemaVersionUnsupported,
        plan_json(testing.allocator, testing.allocator, fixture_gpx, v3),
    );
}

test "messages_count: a Coros file with a mis-sized field reads, as fitparse counts it" {
    const counts = try messages_count(testing.allocator, fixture_coros_fit);
    defer testing.allocator.free(counts);
    var total: u32 = 0;
    for (counts) |count| total += count.count;
    // fitparse's and the FIT SDK's message count for this file.
    try testing.expectEqual(@as(u32, 11293), total);
}

test "analyze: no plan.json is PlanFileMissing, never a model of retrace's own" {
    const inputs: Inputs = .{ .gpx = fixture_gpx, .fit = fixture_fit, .plan = "" };
    try testing.expectError(
        error.PlanFileMissing,
        analysis_json(testing.allocator, testing.allocator, &inputs),
    );
}

test "analyze: garbage bytes are an error, not a crash" {
    const inputs: Inputs = .{ .gpx = "nope", .fit = "nope", .plan = "nope" };
    const result = analysis_json(testing.allocator, testing.allocator, &inputs);
    try testing.expect(std.meta.isError(result));
}

test "summarizePlan and analyze: a plan.json for another route, or a stale one, is refused" {
    const allocator = testing.allocator;
    const plan_bytes = try plan_file_test(&.{});
    defer allocator.free(plan_bytes);
    const edited = fixture_gpx[0 .. fixture_gpx.len - 1];
    try testing.expectError(
        error.CourseMismatch,
        plan_json(allocator, allocator, edited, plan_bytes),
    );
    const other: Inputs = .{ .gpx = edited, .fit = fixture_fit, .plan = plan_bytes };
    try testing.expectError(error.CourseMismatch, analysis_json(allocator, allocator, &other));

    // A model that no longer gives the file's times: as if gpxz's had changed since.
    const stale = try std.mem.replaceOwned(
        u8,
        allocator,
        plan_bytes,
        "\"pace_base_s_per_km\": 500",
        "\"pace_base_s_per_km\": 501",
    );
    defer allocator.free(stale);
    try testing.expect(!std.mem.eql(u8, stale, plan_bytes));
    try testing.expectError(error.PlanStale, plan_json(allocator, allocator, fixture_gpx, stale));
    try testing.expectError(
        error.SyntaxError,
        plan_json(allocator, allocator, fixture_gpx, "nope"),
    );
}
