import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const mailDir = new URL("../../api/var/mail/", import.meta.url);
async function mailLink(email: string, path: string) {
  let link = "";
  await expect
    .poll(
      async () => {
        const files = await readdir(mailDir).catch(() => []);
        for (const file of files.sort().reverse()) {
          const raw = await readFile(new URL(file, mailDir), "utf8");
          if (!raw.includes(email)) continue;
          // Decode the official transport's quoted-printable fixture body only.
          const decoded = raw
            .replace(/=\r?\n/g, "")
            .replace(/=([0-9A-F]{2})/g, (_, hex: string) =>
              String.fromCharCode(parseInt(hex, 16)),
            );
          const found = decoded
            .match(/https?:\/\/[^"'<> \s]+/g)
            ?.find((url) => url.includes(path));
          if (found) {
            const token =
              new URL(found.replace(/&amp;/g, "&")).searchParams.get("token") ??
              "";
            const clean = token.match(/^[A-Za-z0-9_-]{43}/)?.[0];
            if (!clean) continue;
            const url = new URL(found);
            url.searchParams.set("token", clean);
            link = url.toString();
            return true;
          }
        }
        return false;
      },
      { timeout: 15000 },
    )
    .toBe(true);
  return link;
}

test("signup, deliberate email verification, persistent HttpOnly login, logout and password reset", async ({
  page,
}) => {
  const email = "browser-" + randomUUID() + "@example.test";
  const password = "dayjoin-browser-password";
  await page.goto("/auth/login");
  await page.getByRole("link", { name: "회원가입", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/signup$/);
  await page.getByLabel("이름", { exact: true }).fill("브라우저 테스트");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("새 비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인", { exact: true }).fill(password);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "메일함을 확인해 주세요" }),
  ).toBeVisible();
  const confirmation = await mailLink(email, "/auth/verify");
  await page.goto(confirmation);
  await expect(page).toHaveURL(/\/auth\/verify$/);
  await page.getByRole("button", { name: "이메일 확인 완료하기" }).click();
  await expect(
    page.getByRole("heading", { name: "이메일 확인을 완료했어요" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "로그인으로 돌아가기" }).click();
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("이메일 또는 비밀번호");
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "내 계정", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.cookie)).not.toContain("sid=");
  expect(await page.evaluate(() => Object.keys(localStorage))).not.toContain(
    "dayjoin-auth-v1",
  );
  await page.reload();
  await page.getByRole("button", { name: "내 계정", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "로그인", exact: true }),
  ).toBeVisible();
  await page.goto("/auth/forgot");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByRole("button", { name: "변경 링크 보내기" }).click();
  const recovery = await mailLink(email, "/auth/reset");
  await page.goto(recovery);
  await expect(page).toHaveURL(/\/auth\/reset$/);
  await page
    .getByLabel("새 비밀번호", { exact: true })
    .fill("new-browser-password");
  await page
    .getByLabel("비밀번호 확인", { exact: true })
    .fill("new-browser-password");
  await page
    .getByRole("button", { name: "비밀번호 변경", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "비밀번호를 변경했어요" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "로그인으로 돌아가기" }).click();
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("new-browser-password");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "내 계정", exact: true }),
  ).toBeVisible();
});

test("client validation and pending social providers", async ({ page }) => {
  await page.goto("/auth/signup");
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Apple로 계속하기" }),
  ).toBeDisabled();
  await page.getByLabel("이름", { exact: true }).fill("테스트");
  await page.getByLabel("이메일", { exact: true }).fill("input@example.test");
  await page.getByLabel("새 비밀번호", { exact: true }).fill("short");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("different");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page.locator("#password-error")).toContainText("12자 이상");
  await expect(page.locator("#confirm-error")).toContainText("일치하지");
});

test("an email preview does not consume confirmation and an invalid link is recoverable", async ({
  page,
}) => {
  await page.goto("/auth/verify?token=" + "A".repeat(43));
  await page.getByRole("button", { name: "이메일 확인 완료하기" }).click();
  await expect(page.getByRole("alert")).toContainText("만료되었거나");
  await expect(
    page.getByRole("link", { name: "가입 확인 메일 다시 받기" }),
  ).toBeVisible();
});
