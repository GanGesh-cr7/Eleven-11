import { test, expect, firefox, type Page } from "@playwright/test";
test.skip(
  ({ browserName }) => browserName !== "chromium",
  "The live multiplayer suite runs once; UI runs in both engines.",
);
const state = async (p: Page) =>
  p.evaluate(async () => {
    const session = (window as any).__elevenSession;
    return session.getSnapshot();
  });
async function create(page: Page) {
  await page.goto("/create");
  await page.getByPlaceholder("Enter your name").fill("Alex");
  await page
    .getByRole("button", { name: "Create a Game", exact: true })
    .click();
  await page.waitForURL("**/room/**");
  return page.url().split("/").pop()!;
}
async function join(page: Page, code: string, name = "Sam") {
  await page.goto(`/join/${code}`);
  await page.getByPlaceholder("Enter your name").fill(name);
  await page
    .getByRole("button", { name: "Join this Game", exact: true })
    .click();
}
test("real WebRTC: admission, star connections, acknowledgement, refresh, expiry, summary, host loss", async ({
  browser,
  page: host,
}) => {
  const contexts = [];
  for (let i = 0; i < 2; i++) contexts.push(await browser.newContext());
  const guest = await contexts[0].newPage();
  const second = await contexts[1].newPage();
  await host.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const code = await create(host);
  await expect(
    host.getByRole("button", { name: "Let’s play", exact: true }),
  ).toBeDisabled();
  await host.getByRole("button", { name: "Copy invite link" }).click();
  await expect(
    host.getByRole("button", { name: "Copied invitation" }),
  ).toBeVisible();
  await join(guest, code);
  await expect(host.getByText("Sam", { exact: true })).toBeVisible();
  await join(second, code, "Taylor");
  await expect(host.getByText("Taylor", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await state(guest)).metrics.connections)
    .toBe(1);
  await expect
    .poll(async () => (await state(host)).metrics.connections)
    .toBe(2);
  await expect
    .poll(async () => (await state(second)).metrics.connections)
    .toBe(1);
  const duplicateContext = await browser.newContext();
  const duplicate = await duplicateContext.newPage();
  const stored = await guest.evaluate(() =>
    sessionStorage.getItem("eleven-session"),
  );
  await duplicate.addInitScript(
    (value) => sessionStorage.setItem("eleven-session", value!),
    stored,
  );
  await duplicate.goto(`/room/${code}`);
  await expect(
    duplicate.getByText("This player is already connected in another tab.", {
      exact: true,
    }),
  ).toBeVisible();
  expect((await state(guest)).status).toBe("connected");
  await duplicateContext.close();
  await host
    .getByRole("combobox", { name: "Questions", exact: true })
    .selectOption("3");
  await host
    .getByRole("combobox", { name: "Time to decide", exact: true })
    .selectOption("15");
  await host.getByRole("button", { name: "Let’s play", exact: true }).click();
  await guest.waitForURL("**/game/**");
  await second.waitForURL("**/game/**");
  const first = await state(host);
  expect((await state(guest)).state.round.id).toBe(first.state.round.id);
  expect((await state(second)).state.round.deadline).toBe(
    first.state.round.deadline,
  );
  await guest.locator(".candidate").filter({ hasText: "Alex" }).click();
  await guest.getByRole("button", { name: "Submit Vote" }).click();
  await expect(
    guest.getByText("Your vote has been submitted! Waiting for everyone..."),
  ).toBeVisible();
  await expect(host.getByText("1 / 3 votes received")).toBeVisible();
  // Retry the same and a different ballot against the real coordinating host.
  await guest.evaluate(async () => {
    const session = (window as any).__elevenSession;
    session.vote(
      session
        .getSnapshot()
        .state.players.find((p: { name: string }) => p.name === "Alex").id,
    );
    session.vote(
      session
        .getSnapshot()
        .state.players.find((p: { name: string }) => p.name === "Taylor").id,
    );
  });
  await expect.poll(async () => (await state(host)).state.round.voted).toBe(1);
  await guest.reload();
  await expect(
    guest.getByText("Your vote has been submitted! Waiting for everyone..."),
  ).toBeVisible();
  await expect.poll(async () => (await state(guest)).status).toBe("connected");
  // Only one ballot: the authoritative host timer must close this round.
  await host.waitForURL("**/results/**", { timeout: 22000 });
  await guest.waitForURL("**/results/**");
  await second.waitForURL("**/results/**");
  expect((await state(guest)).state.round.results).toEqual(
    (await state(host)).state.round.results,
  );
  expect((await state(host)).state.round.voted).toBe(1);
  await host.getByRole("button", { name: "Next Question" }).click();
  await guest.waitForURL("**/game/**");
  expect((await state(host)).state.round.question.id).not.toBe(
    first.state.round.question.id,
  );
  // All submit early and receive identical tied results.
  for (const p of [host, guest, second]) {
    await p.locator(".candidate:enabled").first().click();
    await p.getByRole("button", { name: "Submit Vote" }).click();
  }
  await host.waitForURL("**/results/**");
  await guest.waitForURL("**/results/**");
  expect((await state(guest)).state.round.results).toEqual(
    (await state(host)).state.round.results,
  );
  await host.getByRole("button", { name: "Next Question" }).click();
  await guest.waitForURL("**/game/**");
  await second.waitForURL("**/game/**");
  for (const p of [host, guest, second]) {
    await p.locator(".candidate:enabled").first().click();
    await p.getByRole("button", { name: "Submit Vote" }).click();
  }
  await host.getByRole("button", { name: "See our story" }).click();
  await guest.waitForURL("**/summary/**");
  expect(
    (await state(host)).state.history.reduce(
      (n: number, r: { voted: number }) => n + r.voted,
      0,
    ),
  ).toBe(7);
  await host.getByRole("button", { name: "Play Again", exact: true }).click();
  await guest.waitForURL("**/room/**");
  await expect(host.getByText("Sam", { exact: true })).toBeVisible();
  // Close host without inventing a migrated coordinator.
  await host.close();
  await expect
    .poll(async () => (await state(guest)).status)
    .toBe("reconnecting");
  await expect(guest.getByRole("alert")).toContainText("Host disconnected");
  await Promise.all(contexts.map((c) => c.close()));
});
test("full rooms reject real admission and unknown codes time out", async ({
  browser,
  page: host,
}) => {
  const context = await browser.newContext();
  const guest = await context.newPage();
  const code = await create(host);
  await host
    .getByRole("combobox", { name: "Questions", exact: true })
    .selectOption("30");
  await host
    .getByRole("combobox", { name: "The vibe", exact: true })
    .selectOption("funny");
  await expect(
    host.getByRole("combobox", { name: "Questions", exact: true }),
  ).toHaveValue("18");
  await host
    .getByRole("combobox", { name: "The vibe", exact: true })
    .selectOption("all");
  await host.evaluate(async () => {
    const session = (window as any).__elevenSession;
    session.settings({ ...session.getSnapshot().state.settings, capacity: 2 });
  });
  await join(guest, code);
  await expect(host.getByText("Sam", { exact: true })).toBeVisible();
  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  await join(outsider, code, "Extra");
  await expect(
    outsider.getByText("This room is full.", { exact: true }),
  ).toBeVisible({ timeout: 35000 });
  expect((await state(host)).state.players.length).toBe(2);
  await outsider.goto("/join");
  await outsider.getByPlaceholder("Enter your name").fill("NoRoom");
  await outsider
    .getByPlaceholder("Paste your room code")
    .fill("00000000000000000000");
  await outsider
    .getByRole("button", { name: "Join this Game", exact: true })
    .click();
  await expect(
    outsider.getByText(/No active host could be reached/),
  ).toBeVisible({ timeout: 35000 });
  expect((await state(outsider)).state).toBeNull();
  await context.close();
  await outsiderContext.close();
});

test("different browser engines and simultaneous rooms remain isolated", async ({
  browser,
  page: host,
}) => {
  const ff = await firefox.launch();
  const ffContext = await ff.newContext();
  const crossGuest = await ffContext.newPage();
  const otherContext = await browser.newContext();
  const otherHost = await otherContext.newPage();
  const otherGuestContext = await browser.newContext();
  const otherGuest = await otherGuestContext.newPage();
  try {
    const [a, b] = await Promise.all([create(host), create(otherHost)]);
    expect(a).not.toBe(b);
    await join(crossGuest, a, "Firefox friend");
    await join(otherGuest, b, "Other friend");
    await expect(
      host.getByText("Firefox friend", { exact: true }),
    ).toBeVisible();
    await expect(
      otherHost.getByText("Other friend", { exact: true }),
    ).toBeVisible();
    expect(
      (await state(host)).state.players.map((p: { name: string }) => p.name),
    ).toEqual(["Alex", "Firefox friend"]);
    expect(
      (await state(otherHost)).state.players.map(
        (p: { name: string }) => p.name,
      ),
    ).toEqual(["Alex", "Other friend"]);
    await host
      .getByRole("combobox", { name: "Questions", exact: true })
      .selectOption("1");
    await host.getByRole("button", { name: "Let’s play", exact: true }).click();
    await crossGuest.waitForURL("**/game/**");
    expect((await state(otherHost)).state.phase).toBe("lobby");
    expect((await state(crossGuest)).state.round.id).toBe(
      (await state(host)).state.round.id,
    );
    for (const p of [host, crossGuest]) {
      await p.locator(".candidate:enabled").first().click();
      await p.getByRole("button", { name: "Submit Vote" }).click();
    }
    await host.waitForURL("**/results/**");
    await crossGuest.waitForURL("**/results/**");
    expect((await state(crossGuest)).state.round.results).toEqual(
      (await state(host)).state.round.results,
    );
  } finally {
    await ff.close();
    await otherContext.close();
    await otherGuestContext.close();
  }
});
