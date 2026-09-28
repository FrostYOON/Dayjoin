import { test, expect } from "@playwright/test";

// These tests exercise the real SDK and our UI contract with a simulated
// provider boundary. They do not prove Google/Apple credentials or consent.
for (const [provider, name] of [
  ["google", "Google"],
  ["apple", "Apple"],
] as const) {
  test(`${provider}: SDK starts PKCE OAuth and safely handles cancellation`, async ({
    page,
  }) => {
    await page.route("**/auth/v1/settings", (route) =>
      route.fulfill({
        json: { external: { google: true, apple: true } },
      }),
    );
    let authorization: URL | undefined;
    await page.route("**/auth/v1/authorize?**", async (route) => {
      authorization = new URL(route.request().url());
      await route.fulfill({
        status: 302,
        headers: {
          location:
            "http://127.0.0.1:4180/auth/callback?error=access_denied&error_description=private-provider-details",
        },
      });
    });
    await page.goto("/auth/login");
    await page.getByRole("button", { name: `${name}로 계속하기` }).click();
    await expect(page.getByRole("alert")).toContainText("로그인이 취소");
    await expect(page).toHaveURL("http://127.0.0.1:4180/auth/callback");
    expect(authorization?.searchParams.get("provider")).toBe(provider);
    expect(authorization?.searchParams.get("redirect_to")).toBe(
      "http://127.0.0.1:4180/auth/callback",
    );
    expect(authorization?.searchParams.get("code_challenge_method")).toBe(
      "s256",
    );
    expect(authorization?.searchParams.get("code_challenge")).toMatch(
      /^[A-Za-z0-9_-]{43}$/,
    );
    expect(authorization?.searchParams.has("code_verifier")).toBe(false);
    expect(authorization?.searchParams.has("scopes")).toBe(false);
    await expect(page.getByText("private-provider-details")).toHaveCount(0);
    await page.getByRole("link", { name: "로그인으로 돌아가기" }).click();
    await expect(
      page.getByRole("button", { name: `${name}로 계속하기` }),
    ).toBeEnabled();
  });
}

test("disabled providers stay unavailable; a settings failure can be retried without blocking email", async ({
  page,
}) => {
  // Real local Auth has neither provider configured.
  await page.goto("/auth/login");
  await expect(page.getByText("준비 중", { exact: true })).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Apple로 계속하기" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "로그인", exact: true }),
  ).toBeEnabled();
  let failed = true;
  await page.route("**/auth/v1/settings", (route) =>
    failed
      ? route.fulfill({
          status: 503,
          json: { error: "private-settings-error" },
        })
      : route.fulfill({ json: { external: { google: true, apple: false } } }),
  );
  await page.reload();
  await expect(page.getByRole("status")).toContainText(
    "상태를 불러오지 못했어요",
  );
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "로그인", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("private-settings-error")).toHaveCount(0);
  failed = false;
  await page.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Apple로 계속하기" }),
  ).toBeDisabled();
});

test("malformed settings fail closed and callback errors never exchange an attached code", async ({
  page,
}) => {
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({
      json: { external: { google: "true", apple: true } },
    }),
  );
  await page.goto("/auth/signup");
  await expect(page.getByRole("status")).toContainText(
    "상태를 불러오지 못했어요",
  );
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Apple로 계속하기" }),
  ).toBeDisabled();
  let exchanges = 0;
  await page.route("**/auth/v1/token?**", async (route) => {
    exchanges++;
    await route.fulfill({ status: 400, json: { error: "invalid_grant" } });
  });
  await page.goto(
    "/auth/callback?code=synthetic-code#error=server_error&error_description=hidden-details",
  );
  await expect(page.getByRole("alert")).toContainText(
    "로그인을 완료하지 못했어요",
  );
  await expect(page).toHaveURL("http://127.0.0.1:4180/auth/callback");
  expect(exchanges).toBe(0);
  await expect(page.getByText("hidden-details")).toHaveCount(0);
});
