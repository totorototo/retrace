//! Native build: `zig build test` runs retrace.zig's tests against the fixtures.
//!
//! Zigar does not use this file (the Vite plugin runs with `ignoreBuildFile: true`); it builds
//! the WASM module with its own build.zig and takes the imports from build.extra.zig. Both
//! read the dependencies from build.zig.zon.

const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const dependency_options = .{ .target = target, .optimize = optimize };

    const retrace = b.createModule(.{
        .root_source_file = b.path("retrace.zig"),
        .target = target,
        .optimize = optimize,
        .imports = &.{
            .{ .name = "gpxz", .module = b.dependency("gpxz", dependency_options).module("gpxz") },
            .{ .name = "fitz", .module = b.dependency("fitz", dependency_options).module("fitz") },
            .{
                .name = "debriefz",
                .module = b.dependency("debriefz", dependency_options).module("debriefz"),
            },
        },
    });
    // @embedFile can't reach outside the module's directory tree by path, so the fixtures
    // are named imports (same approach as debriefz).
    retrace.addAnonymousImport("fixture.gpx", .{ .root_source_file = b.path("testdata/route.gpx") });
    retrace.addAnonymousImport("fixture.fit", .{ .root_source_file = b.path("testdata/activity.fit") });

    const tests = b.addTest(.{ .root_module = retrace });
    const test_step = b.step("test", "Run retrace's Zig tests");
    test_step.dependOn(&b.addRunArtifact(tests).step);
}
