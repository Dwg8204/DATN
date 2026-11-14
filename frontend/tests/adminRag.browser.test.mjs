import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const origin = "http://127.0.0.1:4203";
let server, browser;
before(async () => {
  server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "4203",
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

for (const language of ["en", "vi"])
  for (const width of [390, 1280])
    test(
      `R6 admin filters, sources, confirmation and polling ${language} ${width}`,
      { timeout: 60000 },
      async () => {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
        });
        await context.addInitScript(
          (lang) => localStorage.setItem("aptimate-language", lang),
          language,
        );
        await context.route("**/*", (route) => {
          const url = route.request().url();
          return url.startsWith(origin) || url.includes("/api/v1/")
            ? route.continue()
            : route.abort();
        });
        const page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        let posts = 0,
          body,
          statusReads = 0,
          gapUrl;
        const skills = [
          "GRAMMAR_VOCAB",
          "READING",
          "LISTENING",
          "WRITING",
          "SPEAKING",
        ];
        await page.route("**/api/v1/**", async (route) => {
          const url = new URL(route.request().url()),
            path = url.pathname.replace("/api/v1", "");
          let json = { items: [], count: 0, unreadCount: 0 };
          if (path === "/auth/me" || path === "/profile/me")
            json = {
              id: "admin",
              role: "ADMIN",
              firstName: "QA",
              lastName: "Admin",
            };
          if (path === "/admin/rag/status") {
            statusReads++;
            json = {
              enabled: true,
              coverage: skills.map((component) => ({
                component,
                total: 10,
                embedded: 10,
                percent: 100,
              })),
              jobs: [
                {
                  component: "READING",
                  pending: posts ? 1 : 0,
                  completed: 10,
                  failed: 0,
                },
              ],
              missingTopics: [
                { code: "reading-time", name: "Time prepositions" },
              ],
              missingCriteria: [{ component: "WRITING", criterion: "GRAMMAR" }],
            };
          }
          if (path === "/admin/rag/gaps") {
            gapUrl = url;
            json = {
              data: [
                {
                  component: "READING",
                  part_number: 1,
                  topic: "reading-time",
                  occurrences: 12,
                  learners: 3,
                  average_similarity: 0.4,
                  samples: [
                    {
                      questionId: "q",
                      testId: "test",
                      title: "Time practice",
                      partNumber: 1,
                      excerpt: "Use on with weekdays",
                    },
                  ],
                },
              ],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 1,
                totalPages: 1,
              },
            };
          }
          if (
            path === "/admin/rag/reembed" &&
            route.request().method() === "POST"
          ) {
            posts++;
            body = route.request().postDataJSON();
            json = { queued: 2 };
          }
          if (path === "/chatbot/status") json = { data: { enabled: false } };
          return route.fulfill({
            status:
              path === "/admin/rag/reembed" &&
              posts === 1 &&
              language === "en" &&
              width === 390
                ? 503
                : 200,
            json,
            headers: {
              "access-control-allow-origin": origin,
              "access-control-allow-credentials": "true",
              "access-control-allow-headers": "content-type",
              "access-control-allow-methods": "GET,POST,OPTIONS",
            },
          });
        });
        const vi = language === "vi";
        try {
          await page.goto(origin + "/admin/rag", {
            waitUntil: "domcontentloaded",
          });
          await page.getByText("Time prepositions", { exact: false }).waitFor();
          assert.equal(
            await page.getByText("100%", { exact: true }).count(),
            5,
          );
          await page
            .getByRole("button", {
              name: vi ? "Thiếu hụt" : "Retrieval gaps",
              exact: true,
            })
            .click();
          await page.getByRole("link", { name: /Time practice/ }).waitFor();
          assert.equal(
            await page
              .getByRole("link", { name: /Time practice/ })
              .getAttribute("href"),
            "/admin/tests/reading/test/edit/part/1",
          );
          await page
            .getByLabel(vi ? "Kỹ năng" : "Skill", { exact: true })
            .selectOption("READING");
          await page
            .getByLabel(vi ? "Tính năng" : "Feature", { exact: true })
            .selectOption("PLAN");
          await page
            .getByLabel(vi ? "Từ ngày" : "From", { exact: true })
            .fill("2026-11-01");
          await page.getByRole("link", { name: /Time practice/ }).waitFor();
          assert.equal(gapUrl.searchParams.get("feature"), "PLAN");
          assert.equal(gapUrl.searchParams.get("from"), "2026-11-01");
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            JSON.stringify(
              await page.evaluate(() =>
                [...document.querySelectorAll("main *")]
                  .filter(
                    (e) => e.getBoundingClientRect().right > innerWidth + 1,
                  )
                  .slice(0, 12)
                  .map((e) => ({
                    tag: e.tagName,
                    cls: e.className,
                    width: e.getBoundingClientRect().width,
                    text: e.textContent?.slice(0, 40),
                  })),
              ),
            ),
          );
          await page
            .getByRole("button", {
              name: vi ? "Thao tác" : "Actions",
              exact: true,
            })
            .click();
          await page
            .getByLabel(vi ? "Kỹ năng" : "Skill", { exact: true })
            .selectOption("READING");
          await page
            .getByRole("button", {
              name: vi ? "Lập chỉ mục lại" : "Reindex questions",
              exact: true,
            })
            .click();
          await page.getByRole("dialog").waitFor();
          assert.equal(posts, 0);
          await page
            .getByRole("button", { name: vi ? "Hủy" : "Cancel", exact: true })
            .click();
          assert.equal(posts, 0);
          await page
            .getByRole("button", {
              name: vi ? "Lập chỉ mục lại" : "Reindex questions",
              exact: true,
            })
            .click();
          await page
            .getByRole("button", {
              name: vi ? "Xác nhận" : "Confirm",
              exact: true,
            })
            .click();
          if (language === "en" && width === 390) {
            await page
              .getByRole("dialog")
              .getByText(/Unable to load or update/)
              .waitFor();
            await page
              .getByRole("button", { name: "Confirm", exact: true })
              .click();
          }
          await page
            .getByText(vi ? "Đã xếp hàng 2 đề" : "2 tests queued", {
              exact: true,
            })
            .waitFor();
          assert.equal(posts, language === "en" && width === 390 ? 2 : 1);
          assert.deepEqual(body, { component: "READING" });
          const reads = statusReads;
          await new Promise((r) => setTimeout(r, 11000));
          assert.ok(statusReads > reads, "10-second progress refresh");
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      },
    );
