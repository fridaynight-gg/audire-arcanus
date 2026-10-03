import { expect, test } from "@playwright/test";

type Lobby = {
  id: string;
  joinCode: string;
};

type Listener = {
  id: string;
  username: string;
};

test("join, roster, kick", async ({ page, context, request }) => {
  const created = await request.post("http://127.0.0.1:5551/api/lobbies", {
    data: { name: "e2e" },
  });
  expect(created.ok()).toBe(true);
  const lobby = (await created.json()) as Lobby;

  await page.goto("/");
  await page.getByLabel("Name").fill("alice");
  await page.getByLabel("Join code").fill(lobby.joinCode);
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByRole("heading", { name: "e2e" })).toBeVisible();

  const page2 = await context.newPage();
  await page2.goto("/");
  await page2.getByLabel("Name").fill("bob");
  await page2.getByLabel("Join code").fill(lobby.joinCode);
  await page2.getByRole("button", { name: "Join" }).click();

  await expect(page.getByRole("list", { name: "listeners" })).toContainText("alice");
  await expect(page.getByRole("list", { name: "listeners" })).toContainText("bob");
  await expect(page2.getByRole("list", { name: "listeners" })).toContainText("bob");

  const peopleRes = await request.get(`http://127.0.0.1:5551/api/lobbies/${lobby.id}/listeners`);
  const people = (await peopleRes.json()) as Array<Listener>;
  const alice = people.find((item) => item.username === "alice");
  expect(alice).toBeTruthy();
  const kicked = await request.post(`http://127.0.0.1:5551/api/lobbies/${lobby.id}/kick`, {
    data: { listenerId: alice?.id },
  });
  expect(kicked.ok()).toBe(true);

  await expect(page.getByRole("list", { name: "listeners" })).not.toContainText("alice");
  await expect(page.getByRole("list", { name: "listeners" })).toContainText("bob");
});
