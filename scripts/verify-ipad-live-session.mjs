import { chromium, devices } from "playwright";

const ACTIVE_SESSION_KEY = "trimtrack-active-session";
const MASTER_DATA_KEY = "trimtrack-master-data";

function makeEmployees(count) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `emp-${n}`,
      employeeNumber: n,
      legalName: n === 15 ? "Xiuqun Li" : `Employee ${n} With A Very Long Legal Name`,
      nickname: n % 3 === 0 ? `Nick${n}` : undefined,
      active: true,
    };
  });
}

function makeSession(employees) {
  const now = Date.now();
  return {
    id: "test-session",
    facilityId: "fac-1",
    facilityName: "Test Facility",
    roomId: "room-1",
    roomName: "Room A",
    supervisorId: "sup-1",
    supervisorName: "Supervisor",
    workType: "trim",
    employeeIds: employees.map((e) => e.id),
    employees: employees.map((e) => ({
      id: e.id,
      employeeNumber: e.employeeNumber,
      legalName: e.legalName,
      nickname: e.nickname,
    })),
    startedAt: now,
    entries: employees.map((e, i) => ({
      id: `entry-${i}`,
      employeeId: e.id,
      category: "regular",
      weight: i === 14 ? 1019 : 100 + i * 17,
      timestamp: now - i * 1000,
    })),
  };
}

function makeMasterData(employees) {
  return {
    employees,
    facilities: [{ id: "fac-1", code: "TST", name: "Test Facility", active: true }],
    rooms: [{ id: "room-1", facilityId: "fac-1", name: "Room A", active: true }],
    supervisors: [{ id: "sup-1", name: "Supervisor", active: true }],
  };
}

async function runChecks(page, label, employeeCount) {
  const issues = [];

  await page.goto("http://localhost:5173/trim-track/live", { waitUntil: "networkidle" });
  await page.waitForSelector(".tt-live-employees-scroll");

  const metrics = await page.evaluate(() => {
    const session = document.querySelector(".tt-live-session");
    const employeesSection = document.querySelector(".tt-live-employees");
    const scroll = document.querySelector(".tt-live-employees-scroll");
    const cards = [...document.querySelectorAll(".tt-employee-roster-card")];
    const entryActions = document.querySelector(".tt-live-entry-actions");
    const weightInput = document.getElementById("weight-input");
    const endBtn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("End Session"),
    );

    const cardRects = cards.map((card) => {
      const rect = card.getBoundingClientRect();
      const style = getComputedStyle(card);
      return {
        height: rect.height,
        overflowX: rect.right > window.innerWidth,
        textOverflow: card.scrollWidth > card.clientWidth,
      };
    });

    const sessionRect = session?.getBoundingClientRect();
    const sectionRect = employeesSection?.getBoundingClientRect();
    const scrollStyle = scroll ? getComputedStyle(scroll) : null;

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      sessionHeight: sessionRect?.height ?? 0,
      employeesSectionHeight: sectionRect?.height ?? 0,
      scrollOverflowY: scrollStyle?.overflowY ?? "",
      scrollClientHeight: scroll?.clientHeight ?? 0,
      scrollScrollHeight: scroll?.scrollHeight ?? 0,
      cardCount: cards.length,
      cardIssues: cardRects.filter((c) => Math.abs(c.height - 84) > 2),
      pageOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      hasEntryActions: !!entryActions,
      hasWeightInput: !!weightInput,
      endBtnVisible: endBtn ? endBtn.getBoundingClientRect().bottom <= window.innerHeight : false,
    };
  });

  if (metrics.cardCount !== employeeCount) {
    issues.push(`expected ${employeeCount} cards, got ${metrics.cardCount}`);
  }
  if (metrics.scrollOverflowY !== "auto" && metrics.scrollOverflowY !== "scroll") {
    issues.push(`employee scroll overflow-y is ${metrics.scrollOverflowY}`);
  }
  const isLandscape = metrics.viewport.w > metrics.viewport.h;
  if (employeeCount > 10 && metrics.scrollScrollHeight <= metrics.scrollClientHeight) {
    issues.push("employee list should scroll with large roster");
  }
  if (!isLandscape && metrics.employeesSectionHeight > metrics.viewport.h * 0.45) {
    issues.push(`employee section too tall: ${Math.round(metrics.employeesSectionHeight)}px`);
  }
  if (isLandscape && metrics.employeesSectionHeight > metrics.viewport.h * 0.98) {
    issues.push(`landscape employee column exceeds viewport: ${Math.round(metrics.employeesSectionHeight)}px`);
  }
  if (metrics.cardIssues.length > 0) {
    issues.push(`${metrics.cardIssues.length} cards not 84px tall`);
  }
  if (metrics.pageOverflowX) {
    issues.push("horizontal page overflow");
  }
  if (!metrics.endBtnVisible) {
    issues.push("End Session button not visible");
  }

  await page.locator("#weight-input").focus();
  await page.waitForTimeout(400);

  const focusMetrics = await page.evaluate(() => {
    const entry = document.querySelector(".tt-live-entry-actions");
    const input = document.getElementById("weight-input");
    const buttons = [...document.querySelectorAll(".tt-live-entry-actions button")].map((b) =>
      b.textContent?.trim(),
    );
    if (!entry || !input) return { ok: false, reason: "missing entry actions or input" };
    const rect = entry.getBoundingClientRect();
    return {
      ok: rect.top >= 0 && rect.bottom <= window.innerHeight,
      entryTop: rect.top,
      entryBottom: rect.bottom,
      viewportH: window.innerHeight,
      buttons,
    };
  });

  if (!focusMetrics.ok) {
    issues.push(`entry actions not fully visible after focus (${JSON.stringify(focusMetrics)})`);
  }
  if (!focusMetrics.buttons?.includes("Regular Trim")) {
    issues.push("category buttons missing from entry actions");
  }

  if (employeeCount >= 15) {
    const sampleCard = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".tt-employee-roster-card")];
      const card = cards[14];
      if (!card) return { ok: false, reason: "card #15 missing" };
      const weight = card.querySelector(".tt-employee-roster-card__weight")?.textContent?.trim();
      const id = card.querySelector(".tt-employee-roster-card__id")?.textContent?.trim();
      const name = card.querySelector(".tt-employee-roster-card__name")?.textContent?.trim();
      const rect = card.getBoundingClientRect();
      return {
        ok: id === "#15" && name === "Xiuqun Li" && weight === "1019g" && Math.abs(rect.height - 84) <= 2,
        id,
        name,
        weight,
        height: rect.height,
      };
    });
    if (!sampleCard.ok) {
      issues.push(`employee #15 card invalid: ${JSON.stringify(sampleCard)}`);
    }
  }

  return { label, issues, metrics, focusMetrics };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "iPad Portrait", ...devices["iPad (gen 7)"], viewport: { width: 768, height: 1024 } },
    { name: "iPad Landscape", ...devices["iPad (gen 7)"], viewport: { width: 1024, height: 768 } },
  ];
  const counts = [10, 50, 100];

  const results = [];

  for (const vp of viewports) {
    const context = await browser.newContext({
      ...vp,
      isMobile: true,
      hasTouch: true,
    });

    for (const count of counts) {
      const page = await context.newPage();
      const employees = makeEmployees(count);
      await page.addInitScript(
        ({ sessionKey, masterKey, session, masterData }) => {
          localStorage.setItem(sessionKey, JSON.stringify(session));
          localStorage.setItem(masterKey, JSON.stringify(masterData));
        },
        {
          sessionKey: ACTIVE_SESSION_KEY,
          masterKey: MASTER_DATA_KEY,
          session: makeSession(employees),
          masterData: makeMasterData(employees),
        },
      );

      const result = await runChecks(page, `${vp.name} / ${count} employees`, count);
      results.push(result);
      await page.close();
    }

    await context.close();
  }

  await browser.close();

  let failed = 0;
  for (const r of results) {
    if (r.issues.length === 0) {
      console.log(`PASS  ${r.label}`);
    } else {
      failed += 1;
      console.log(`FAIL  ${r.label}`);
      for (const issue of r.issues) console.log(`      - ${issue}`);
    }
  }

  if (failed > 0) process.exit(1);
  console.log(`\nAll ${results.length} iPad layout checks passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
