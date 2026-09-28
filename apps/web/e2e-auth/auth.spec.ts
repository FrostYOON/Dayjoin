import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";

const mailbox = "http://127.0.0.1:55434";
// Synthetic accounts only. Never use a real user's credentials in these tests.
const password = "Dayjoin-test-only!47";
async function emailLink(
  request: APIRequestContext,
  email: string,
  recovery = false,
) {
  let link = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(`${mailbox}/api/v1/messages`);
        const inbox = await response.json();
        for (const message of inbox.messages ?? []) {
          if (
            !message.To?.some(
              (recipient: { Address: string }) => recipient.Address === email,
            )
          )
            continue;
          const detail = await (
            await request.get(`${mailbox}/api/v1/message/${message.ID}`)
          ).json();
          const links =
            String(detail.HTML ?? "").match(/https?:[^"\s<>]+/g) ?? [];
          const candidate = links
            .map((value: string) => value.replaceAll("&amp;", "&"))
            .find(
              (value: string) =>
                value.includes("/auth/v1/verify") &&
                value.includes(`type=${recovery ? "recovery" : "signup"}`),
            );
          if (candidate) {
            link = candidate;
            return true;
          }
        }
        return false;
      },
      {
        timeout: 20000,
        message: "Expected locally captured confirmation email",
      },
    )
    .toBe(true);
  return link;
}
async function login(page: Page, email: string, value = password) {
  await page.goto("/auth/login");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(value);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "내 계정", exact: true }).click();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "로그인", exact: true }),
  ).toBeVisible();
}

test("signup confirmation, wrong-password rejection, persistent login, session refresh and logout", async ({
  page,
  request,
  context,
}) => {
  const email = `dayjoin-${crypto.randomUUID()}@example.test`;
  await page.goto("/auth/signup");
  await page.getByLabel("이름", { exact: true }).fill("테스트 지우");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("새 비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인", { exact: true }).fill(password);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "메일함을 확인해 주세요" }),
  ).toBeVisible();
  const link = await emailLink(request, email);
  // Failed login must not grant access before email verification.
  await login(page, email);
  await expect(page.getByRole("alert")).toContainText("이메일 확인을 먼저");
  await page.goto(link);
  await expect(page).toHaveURL("http://127.0.0.1:4180/");
  await page.getByRole("button", { name: "내 계정", exact: true }).click();
  await expect(page.getByText("테스트 지우님, 반가워요.")).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByText("이메일 확인을 완료했어요.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "내 계정", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByRole("button", { name: "내 계정", exact: true }),
  ).toBeVisible();
  await second.getByRole("button", { name: "새 기록", exact: true }).click();
  await second
    .getByLabel("일정 제목", { exact: true })
    .fill("이전 계정의 작성 중 기록");
  await logout(page);
  await expect(
    second.getByRole("link", { name: "로그인", exact: true }),
  ).toBeVisible();
  await expect(second.getByLabel("일정 제목", { exact: true })).toHaveCount(0);
  await login(page, email, "Wrong-test-password!47");
  await expect(page.getByRole("alert")).toContainText("이메일 또는 비밀번호");
  await login(page, email);
  await expect(page).toHaveURL("http://127.0.0.1:4180/");
  // Expire only the persisted access-token timestamp to exercise SDK refresh.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("dayjoin-auth-v1")!);
    data.expires_at = 1;
    localStorage.setItem("dayjoin-auth-v1", JSON.stringify(data));
  });
  const refresh = page.waitForResponse(
    (response) =>
      response.url().includes("grant_type=refresh_token") &&
      response.status() === 200,
  );
  await page.reload();
  await refresh;
  await page.getByRole("button", { name: "내 계정", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await logout(page);
  expect(
    await page.evaluate(() => localStorage.getItem("dayjoin-auth-v1")),
  ).toBeNull();
  await second.close();
});

test("invalid callback, form validation, mobile layout and dark theme", async ({
  page,
}) => {
  await page.goto(
    "/auth/callback?error=access_denied&error_description=untrusted-message",
  );
  await expect(page.getByRole("alert")).toContainText("로그인이 취소");
  await expect(page.getByText("untrusted-message")).toHaveCount(0);
  await expect(page).toHaveURL("http://127.0.0.1:4180/auth/callback");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/auth/signup");
  await page.getByLabel("이름", { exact: true }).fill("테스트");
  await page.getByLabel("이메일", { exact: true }).fill("form@example.test");
  await page.getByLabel("새 비밀번호", { exact: true }).fill("short");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("different");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(
    page.getByText("12자 이상 입력해 주세요.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("비밀번호가 일치하지 않아요.")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/auth/reset");
  await expect(
    page.getByRole("heading", { name: "변경 링크를 먼저 열어 주세요" }),
  ).toBeVisible();
});

test("password recovery changes the password and rejects the former password", async ({
  page,
  request,
}) => {
  const email = `recovery-${crypto.randomUUID()}@example.test`;
  await page.goto("/auth/signup");
  await page.getByLabel("이름", { exact: true }).fill("복구 테스트");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("새 비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인", { exact: true }).fill(password);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "메일함을 확인해 주세요" }),
  ).toBeVisible();
  await page.goto(await emailLink(request, email));
  await expect(page).toHaveURL("http://127.0.0.1:4180/");
  await logout(page);
  await page.goto("/auth/forgot");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByRole("button", { name: "변경 링크 보내기" }).click();
  await expect(
    page.getByRole("heading", { name: "메일함을 확인해 주세요" }),
  ).toBeVisible();
  await page.goto(await emailLink(request, email, true));
  await expect(page).toHaveURL("http://127.0.0.1:4180/auth/reset");
  const replacement = "Changed-test-only!58";
  await page.getByLabel("새 비밀번호", { exact: true }).fill(replacement);
  await page.getByLabel("비밀번호 확인", { exact: true }).fill(replacement);
  await page
    .getByRole("button", { name: "비밀번호 변경", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "비밀번호를 변경했어요" }),
  ).toBeVisible();
  await login(page, email);
  await expect(page.getByRole("alert")).toContainText("이메일 또는 비밀번호");
  await login(page, email, replacement);
  await expect(page).toHaveURL("http://127.0.0.1:4180/");
  await logout(page);
});
