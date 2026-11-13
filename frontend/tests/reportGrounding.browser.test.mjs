import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const origin = "http://127.0.0.1:4202";
let server, browser;
before(async () => {
  server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "4202",
      "--strictPort",
    ],
    { stdio: "ignore", windowsHide: true },
  );
  let ready = false;
  for (let i = 0; i < 600; i++) {
    try {
      ready = (await fetch(origin)).ok;
    } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready);
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
});
after(async () => {
  await browser?.close();
  server?.kill();
});

for (const width of [1280, 390])
  test(
    `R5 report sources, lesson modal, legacy and locales at ${width}px`,
    { timeout: 120000 },
    async () => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      await context.addInitScript(() =>
        localStorage.setItem("aptimate-language", "en"),
      );
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let lessonReads = 0,
        retired = false,
        legacy = false,
        startPayload;
      await page.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname.replace(
          "/api/v1",
          "",
        );
        let json = { items: [], data: [], count: 0, unreadCount: 0 },
          status = 200;
        if (path === "/auth/me" || path === "/profile/me")
          json = {
            id: "student",
            role: "STUDENT",
            firstName: "Test",
            lastName: "Learner",
          };
        if (path.includes("/me/reports/"))
          json = {
            id: "report",
            kind: path.endsWith("final") ? "FINAL" : "WEEKLY",
            weekIndex: 1,
            status: "READY",
            source: "AI",
            coversFrom: "2026-11-01",
            coversTo: "2026-11-07",
            snapshot: {
              period: {
                completed: 1,
                activeDays: 1,
                vocabReviewed: 0,
                planDoneRatio: 0,
              },
              band: { overallEstimate: null, target: null },
              ...(legacy
                ? {}
                : {
                    errorPatterns: [
                      {
                        patternId: "lesson:d",
                        lessonTitle: "Days",
                        chunkId: "chunk",
                        count: 2,
                        priorCount: 1,
                      },
                    ],
                  }),
            },
            content: {
              headline: "Study report",
              narrative: "Review time prepositions.",
              nextSteps: ["Review the lesson."],
              ...(legacy
                ? {}
                : {
                    citations: [
                      { nextStepIndex: 0, chunkId: "chunk" },
                      { nextStepIndex: 0, candidateId: "test" },
                    ],
                  }),
            },
            sources: legacy
              ? []
              : [{ chunkId: "chunk", title: "Days", excerpt: "Use on." }],
            candidates: legacy
              ? []
              : [
                  {
                    candidateId: "test",
                    testId: "synthetic-test",
                    title: "Time practice",
                    purpose: "PRACTICE",
                    partNumber: 1,
                    component: "READING",
                  },
                ],
          };
        if (path === "/me/knowledge/chunks/chunk") {
          lessonReads++;
          if (retired) {
            status = 404;
            json = { message: "Unavailable" };
          } else
            json = {
              chunkId: "chunk",
              title: "Days",
              content: "Use on with weekdays. <script>unsafe()</script>",
            };
        }
        if (
          path === "/practice-attempts" &&
          route.request().method() === "POST"
        ) {
          startPayload = route.request().postDataJSON();
          status = 503;
          json = { message: "Unavailable" };
        }
        if (path === "/chatbot/status") json = { data: { enabled: false } };
        return route.fulfill({
          json,
          status,
          headers: {
            "access-control-allow-origin": origin,
            "access-control-allow-credentials": "true",
            "access-control-allow-headers": "content-type",
            "access-control-allow-methods": "GET,POST,OPTIONS",
          },
        });
      });
      try {
        await page.goto(origin + "/profile/reports/report", {
          waitUntil: "domcontentloaded",
        });
        await page.getByTestId("error-patterns").waitFor();
        assert.match(await page.getByTestId("error-patterns").innerText(), /2/);
        assert.equal(lessonReads, 0);
        await page.getByRole("button", { name: /Days/ }).click();
        await page.getByRole("dialog").waitFor();
        await page
          .getByText("Use on with weekdays. <script>unsafe()</script>", {
            exact: true,
          })
          .waitFor();
        assert.ok(lessonReads >= 1 && lessonReads <= 2);
        assert.equal(await page.locator("dialog script").count(), 0);
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("dialog").count(), 0);
        await page.getByRole("button", { name: /Time practice/ }).click();
        await page.locator("main [role=alert]").waitFor();
        assert.equal(startPayload.testId, "synthetic-test");
        assert.equal(startPayload.mode, "part1");
        retired = true;
        await page.getByRole("button", { name: /Days/ }).click();
        await page.locator("dialog [role=alert]").waitFor();
        await page.keyboard.press("Escape");
        await page.evaluate(async () => {
          const { default: i18n } = await import("/src/i18n/index.js");
          await i18n.changeLanguage("vi");
        });
        await page.getByText("Nhóm lỗi trong kỳ", { exact: true }).waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await page.goto(origin + "/profile/reports/final");
        await page.getByRole("button", { name: /Days/ }).waitFor();
        legacy = true;
        await page.goto(origin + "/profile/reports/legacy");
        await page.getByText("Study report", { exact: true }).waitFor();
        assert.equal(await page.getByTestId("error-patterns").count(), 0);
        assert.equal(
          await page.getByRole("button", { name: /Days/ }).count(),
          0,
        );
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    },
  );
