import { expect, test as setup } from "@playwright/test";

import { AUTH_STATE, REFERENCE_USER, signIn } from "../support/e2e";

setup("login do usuário de referência", async ({ page }) => {
  await signIn(page, REFERENCE_USER.email, REFERENCE_USER.password);
  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: AUTH_STATE });
});
