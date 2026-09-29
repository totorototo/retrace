// As Terminus's, on retrace's one page: warnings, not failures.
module.exports = {
  ci: {
    collect: {
      url: [`${process.env.NETLIFY_SITE_URL}/`],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        screenEmulation: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.65 }],
        "categories:accessibility": ["warn", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.95 }],
        "categories:seo": ["warn", { minScore: 0.85 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 1000 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 1500 }],
        "total-blocking-time": ["warn", { maxNumericValue: 600 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.2 }],
        "speed-index": ["warn", { maxNumericValue: 1500 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
