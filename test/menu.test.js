import test from "node:test";
import assert from "node:assert/strict";
import { defaultMenuConfig, menuView, withFooter } from "../lib/menu.js";

test("default menu has courses and app", () => {
  const config = defaultMenuConfig();
  const main = menuView(config, "menu_main");
  assert.equal(main.reply_markup.inline_keyboard.length, 2);
  assert.match(main.text, /Savolingiz bo‘lsa/);
});

test("course and app details are available", () => {
  const config = defaultMenuConfig();
  assert.match(menuView(config, "course_two_weeks").text, /150 000/);
  assert.match(menuView(config, "app_premium").text, /Platinum/);
});

test("footer is not duplicated", () => {
  const once = withFooter("Ma’lumot");
  assert.equal(withFooter(once), once);
});
