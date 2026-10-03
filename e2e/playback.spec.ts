import { expect, test } from "@playwright/test";

type Lobby = {
  id: string;
  joinCode: string;
};

test("player goes live after fixture stream", async ({ page, request }) => {
  const created = await request.post("http://127.0.0.1:5551/api/lobbies", {
    data: { name: "play" },
  });
  expect(created.ok()).toBe(true);
  const lobby = (await created.json()) as Lobby;

  await page.goto("/");
  await page.getByLabel("Name").fill("ear");
  await page.getByLabel("Join code").fill(lobby.joinCode);
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByRole("heading", { name: "play" })).toBeVisible();

  const started = await request.post("http://127.0.0.1:5551/api/stream/start", {
    data: { lobbyId: lobby.id },
  });
  expect(started.ok()).toBe(true);
  await expect(page.getByTestId("player-state")).toHaveText("live", { timeout: 10_000 });
  await request.post("http://127.0.0.1:5551/api/stream/stop", {
    data: { lobbyId: lobby.id },
  });
});
