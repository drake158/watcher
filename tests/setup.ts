import AxeBuilder from "@axe-core/playwright";
import { expect, test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

const WCAG_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

type AccessibilityFixtures = {
  checkAccessibility: () => Promise<void>;
};

export const test = base.extend<AccessibilityFixtures>({
  checkAccessibility: async ({ page }, use) => {
    await use(async () => {
      await expectPageToMeetAutomatedWcagChecks(page);
    });
  },
});

export { expect };

/**
 * Run axe's automated WCAG A/AA checks on the currently rendered page.
 * This does not replace manual keyboard, screen-reader, reduced-motion,
 * or contrast verification required by the acceptance criteria.
 */
export async function expectPageToMeetAutomatedWcagChecks(
  page: Page,
): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_AA_TAGS)
    .analyze();

  const summary = violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    elements: nodes.map(({ target }) => target),
  }));

  expect(
    summary,
    `Automated WCAG A/AA violations: ${JSON.stringify(summary)}`,
  ).toEqual([]);
}
