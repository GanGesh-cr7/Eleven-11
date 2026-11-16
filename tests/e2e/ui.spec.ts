import { test, expect } from "@playwright/test";
test("home, inputs, question editor, privacy, and direct routes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your friends/ }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Enter your name")).toHaveCount(0);
  await page.getByRole("link", { name: /Host the fun/ }).click();
  await expect(page).toHaveURL(/\/create$/);
  await expect(page.getByPlaceholder("Enter your name")).toBeVisible();
  await expect(page.getByPlaceholder("Paste your room code")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Create a game", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to home" }).click();
  await page.getByRole("link", { name: /Bring the truth/ }).click();
  await expect(page).toHaveURL(/\/join$/);
  await page.reload();
  await page.getByPlaceholder("Enter your name").fill("Robin");
  await page.getByPlaceholder("Paste your room code").fill("WRONG");
  await page
    .getByRole("button", { name: "Join this Game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("20-character");
  await page.getByRole("button", { name: "How to play", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/questions");
  await expect(page.locator(".question-library article")).toHaveCount(108);
  await page.getByRole("button", { name: /Funny/ }).click();
  await expect(page.locator(".question-library article")).toHaveCount(18);
  await page
    .getByLabel("Your questions", { exact: true })
    .fill("Who would build the best surprise treehouse?");
  await page.getByRole("button", { name: "Add question", exact: true }).click();
  await page.getByRole("button", { name: /Custom/ }).click();
  await expect(page.locator(".question-library")).toContainText(
    "surprise treehouse",
  );
  // A pasted list becomes separate questions.
  await page
    .getByLabel("Your questions", { exact: true })
    .fill("who is handsome ? who is boy ?\n1. Who is always late?");
  await page
    .getByRole("button", { name: "Add 3 questions", exact: true })
    .click();
  await expect(page.locator(".question-library article")).toHaveCount(4);
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Who can see a vote?" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Who can see a vote?" }),
  ).toBeVisible();
  await page.goto("/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "This friend took a wrong turn." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile layouts have no horizontal overflow", async ({ page }) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/", "/create", "/join", "/questions", "/privacy"]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: `test-results/home-mobile-${test.info().project.name}.png`,
    fullPage: true,
  });
});
