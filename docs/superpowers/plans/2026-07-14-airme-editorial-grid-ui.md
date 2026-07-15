# AirMe Editorial Grid UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 將 AirMe 的 Web、iOS 與 Android 前端全面改造成參考圖式的編輯方格風格，同時保留既有產品流程、資料契約與安全行為。

**Architecture:** 以既有 Expo Router 單一 client 為基礎，先集中重製 design tokens 與 UI primitives，再由共用導覽與 pattern surface 將視覺語言傳到五個作用中頁面。響應式差異只存在於版面與導覽呈現，所有平台仍使用相同資料來源、狀態與互動元件。

**Tech Stack:** Expo 57、Expo Router、React 19、React Native 0.86、react-native-web、TypeScript 6、Vitest、Testing Library。

## Global Constraints

- 固定亮色編輯方格主題：珊瑚紅、亮黃、青綠、天藍、奶油白與炭黑。
- 所有作用中卡片使用 2–3 px 炭黑框與 4–6 px 無模糊硬陰影；互動目標至少 44 × 44 pt。
- Web、iOS、Android 共用同一套元件與產品流程；不得建立 Web 專屬角色或第二套產品。
- 不修改 `services/api`、`packages/contracts`、資料 Schema、Azure、外部 API、安全規則或裝置端資料行為。
- 不將參考圖或其品牌素材加入 repository。
- 不新增 UI framework、字型套件或圖樣依賴；圖樣以跨平台 React Native 元件完成。
- 未經使用者另行明確要求，不 stage、不 commit、不 push。

---

## File Structure

- Create `apps/client/src/components/ui/pattern-surface.tsx`: 跨平台 grid、dots、stripes 背景圖樣。
- Create `apps/client/src/features/design/editorial-grid.test.tsx`: 驗證固定色票、卡片框線、圖樣可存取性與按鈕狀態。
- Modify `apps/client/src/design/tokens.ts`: 固定亮色 palette、字體、圓角、外框與硬陰影 token。
- Modify `apps/client/src/global.css`: Web 背景、focus、selection 與 reduced-motion。
- Modify `apps/client/src/app/_layout.tsx`: 固定 light StatusBar。
- Modify `apps/client/src/components/ui/{screen,card,app-button,app-text,chip}.tsx`: 全域 UI primitives。
- Modify `apps/client/src/components/{app-header,bottom-nav,page-shell}.tsx`: 桌面頂部導覽與手機底部導覽。
- Modify `apps/client/src/app/{index,onboarding,recommendation,history,settings}.tsx`: 五個作用中頁面的版面層級。
- Modify `apps/client/src/components/{environment-hero,activity-composer,profile-form,action-card,follow-up-panel,feedback-panel,history-list,source-disclosure}.tsx`: 產品卡片與狀態樣式。
- Modify `apps/client/README.md`: 將舊有 light／dark 敘述更新為固定亮色編輯方格主題。
- Modify `docs/superpowers/specs/2026-07-14-airme-editorial-grid-ui-design.md`: 實作完成後將狀態更新為已實作並記錄驗證。

### Task 1: Lock the editorial design system with tests

**Files:**
- Create: `apps/client/src/features/design/editorial-grid.test.tsx`
- Modify: `apps/client/src/design/tokens.ts`
- Modify: `apps/client/src/global.css`
- Modify: `apps/client/src/app/_layout.tsx`

**Interfaces:**
- Produces: `palette`, `borders`, `shadows`, `radii`, `spacing`, `typography`, and `usePalette()` consumed by every UI component.
- `usePalette()` always returns the fixed light `palette`; it does not depend on system color scheme.

- [x] **Step 1: Write the failing token tests**

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { borders, lightPalette, shadows } from '../../design/tokens';

describe('editorial grid design system', () => {
  it('uses the approved reference palette and hard geometry', () => {
    expect(lightPalette.background).toBe('#FFF9EC');
    expect(lightPalette.coral).toBe('#F75B4B');
    expect(lightPalette.yellow).toBe('#FFD447');
    expect(lightPalette.teal).toBe('#08A6A6');
    expect(lightPalette.sky).toBe('#5BC0EB');
    expect(lightPalette.ink).toBe('#292827');
    expect(borders.thick).toBe(3);
    expect(shadows.offset).toEqual({ width: 5, height: 5 });
  });
});
```

- [x] **Step 2: Run the targeted test and confirm RED**

Run: `npm run test --workspace airme -- src/features/design/editorial-grid.test.tsx`

Expected: FAIL because `borders`, `shadows`, and the editorial palette keys do not exist.

- [x] **Step 3: Implement the fixed palette and geometry tokens**

Use these exact public values in `tokens.ts`:

```ts
export const borders = { thin: 2, thick: 3 } as const;
export const shadows = {
  offset: { width: 5, height: 5 },
  color: '#292827',
} as const;

const light = {
  background: '#FFF9EC', surface: '#FFFFFF', surfaceRaised: '#FFFFFF',
  text: '#292827', textMuted: '#5E5A55', border: '#292827',
  primary: '#F75B4B', onPrimary: '#FFFFFF', accent: '#08A6A6',
  accentSoft: '#C9F2EE', airSoft: '#C9F2EE', air: '#08A6A6',
  coral: '#F75B4B', yellow: '#FFD447', teal: '#08A6A6',
  sky: '#5BC0EB', cream: '#FFF9EC', ink: '#292827',
  destructive: '#B42318', destructiveSoft: '#FFD9D4',
  warning: '#765000', warningSoft: '#FFF0A8', success: '#176B53',
  successSoft: '#CFF3DF', high: '#9B3B0A', highSoft: '#FFD4B8',
  overlay: 'rgba(41,40,39,0.48)',
} as const;
```

Set `usePalette()` to return `light`, set `radii.sm/md/lg` to `8/10/12`, enlarge display typography to a responsive-safe 40 px maximum, and set `<StatusBar style="dark" />`.

- [x] **Step 4: Update Web global styling**

Set the `body` background to `#FFF9EC`, text to `#292827`, focus outline to `3px solid #292827`, selection background to `#FFD447`, and remove the dark-scheme recoloring block while retaining reduced-motion handling.

- [x] **Step 5: Run the targeted test and typecheck**

Run: `npm run test --workspace airme -- src/features/design/editorial-grid.test.tsx && npm run typecheck --workspace airme`

Expected: token test PASS and TypeScript exits 0.

### Task 2: Build reusable patterns and editorial primitives

**Files:**
- Create: `apps/client/src/components/ui/pattern-surface.tsx`
- Modify: `apps/client/src/features/design/editorial-grid.test.tsx`
- Modify: `apps/client/src/components/ui/screen.tsx`
- Modify: `apps/client/src/components/ui/card.tsx`
- Modify: `apps/client/src/components/ui/app-button.tsx`
- Modify: `apps/client/src/components/ui/app-text.tsx`
- Modify: `apps/client/src/components/ui/chip.tsx`

**Interfaces:**
- Produces: `PatternSurface({ pattern, color, children, style })`, where `pattern` is `'grid' | 'dots' | 'stripes' | 'none'`.
- Extends: `Card` with optional `pattern` while preserving all existing `ViewProps` and call sites.
- Preserves: existing `AppButton`, `AppText`, and `Chip` props so product behavior tests remain unchanged.

- [x] **Step 1: Add failing primitive assertions**

Append tests that render `<Card testID="editorial-card" />`, `<PatternSurface pattern="grid" />`, and disabled `<AppButton />`; assert the card flattened style contains `borderWidth: 3`, the pattern surface has accessibility elements hidden, and the button keeps `aria-disabled="true"`.

```tsx
const card = screen.getByTestId('editorial-card');
expect(StyleSheet.flatten(card.props.style).borderWidth).toBe(3);
expect(screen.getByTestId('pattern-grid').getAttribute('aria-hidden')).toBe('true');
expect(screen.getByRole('button', { name: '測試按鈕' }).getAttribute('aria-disabled')).toBe('true');
```

- [x] **Step 2: Run the targeted test and confirm RED**

Run: `npm run test --workspace airme -- src/features/design/editorial-grid.test.tsx`

Expected: FAIL because `PatternSurface` does not exist and `Card` still uses a 1 px border.

- [x] **Step 3: Implement `PatternSurface`**

Render decorative layers with `pointerEvents="none"`, `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`, and `aria-hidden`. Use at most 48 grid lines, 180 dots, or 18 diagonal stripes per surface. Put children in a `zIndex: 1` content container and clip the pattern with `overflow: 'hidden'`.

- [x] **Step 4: Restyle primitives**

- `Screen`: wrap content with a cream grid pattern and keep the existing safe area and max-width behavior.
- `Card`: 3 px ink border, 12 px radius, 5 px hard shadow, 20 px padding.
- `AppButton`: coral primary, yellow secondary, white ghost, destructive danger; pill radius; 3 px border; press translates 3 px and reduces shadow offset.
- `Chip`: 2 px ink border; selected yellow or teal surface; visible selected text weight; 44 px minimum height.
- `AppText`: retain the current API; use heavier display/title tracking without applying decorative stroke to body text.

- [x] **Step 5: Run primitive and existing component tests**

Run: `npm run test --workspace airme -- src/features/design/editorial-grid.test.tsx src/features/home/activity-composer.test.tsx src/features/onboarding/profile-form.test.tsx`

Expected: all selected tests PASS.

### Task 3: Implement responsive navigation and shell

**Files:**
- Modify: `apps/client/src/components/app-header.tsx`
- Modify: `apps/client/src/components/bottom-nav.tsx`
- Modify: `apps/client/src/components/page-shell.tsx`
- Create: `apps/client/src/features/design/navigation.test.tsx`

**Interfaces:**
- `AppHeader({ demoMode })` keeps its current public prop.
- Desktop breakpoint is exactly `900` logical pixels.
- `BottomNav()` returns `null` at widths `>= 900`; below 900 it keeps 今日、紀錄、設定.

- [x] **Step 1: Write navigation behavior tests**

Mock Expo Router and `useWindowDimensions` at 1440 and 375. At 1440, assert header links 今日、活動紀錄、設定 are present and the bottom `tablist` is absent. At 375, assert the bottom `tablist` is present and the three desktop navigation buttons are absent.

- [x] **Step 2: Run the navigation test and confirm RED**

Run: `npm run test --workspace airme -- src/features/design/navigation.test.tsx`

Expected: FAIL because the current header has no desktop links and bottom nav never hides.

- [x] **Step 3: Implement the responsive shell**

Add the three links to `AppHeader` only at `width >= 900`, style the AirMe mark as a thick outlined badge with hard shadow, and style DEMO／LIVE as a yellow／teal outlined pill. Hide `BottomNav` on desktop and use an ink-outlined floating dock with yellow selected state on mobile.

- [x] **Step 4: Run navigation tests and typecheck**

Run: `npm run test --workspace airme -- src/features/design/navigation.test.tsx && npm run typecheck --workspace airme`

Expected: navigation tests PASS and TypeScript exits 0.

### Task 4: Redesign onboarding and home

**Files:**
- Modify: `apps/client/src/app/onboarding.tsx`
- Modify: `apps/client/src/app/index.tsx`
- Modify: `apps/client/src/components/profile-form.tsx`
- Modify: `apps/client/src/components/environment-hero.tsx`
- Modify: `apps/client/src/components/activity-composer.tsx`
- Modify: `apps/client/src/components/source-disclosure.tsx`
- Modify: `apps/client/src/features/onboarding/profile-form.test.tsx`
- Modify: `apps/client/src/features/home/activity-composer.test.tsx`

**Interfaces:**
- All existing submit callbacks, labels, field values, accessibility labels, max lengths, DEMO indicators and source timestamps remain unchanged.
- `ProfileForm` renders five numbered editorial field cards without adding persisted fields.

- [x] **Step 1: Extend existing tests with visual hierarchy semantics**

Assert onboarding exposes labels `STEP 01` through `STEP 05`, and ActivityComposer exposes eyebrow `AIRME ACTION LAB`. Keep the existing behavioral assertions unchanged.

- [x] **Step 2: Run both tests and confirm RED**

Run: `npm run test --workspace airme -- src/features/onboarding/profile-form.test.tsx src/features/home/activity-composer.test.tsx`

Expected: FAIL because the approved hierarchy labels are not rendered.

- [x] **Step 3: Implement onboarding cards**

Wrap each profile field in a white editorial card with its exact step label, use a teal dotted privacy card, and keep the final completion button full width and yellow. Do not change the submitted object.

- [x] **Step 4: Implement the home hero**

Add a coral eyebrow and poster headline, keep environment first in source order, and at `width >= 880` present the environment and composer as an asymmetric two-column grid. Use a teal striped environment card, a white activity card, bold AQI hierarchy, thick source dots, and the unchanged error copy in a coral alert card.

- [x] **Step 5: Run home/onboarding tests**

Run: `npm run test --workspace airme -- src/features/onboarding/profile-form.test.tsx src/features/home/activity-composer.test.tsx`

Expected: all tests PASS and the previously asserted submit payloads remain identical.

### Task 5: Redesign recommendation, history and settings

**Files:**
- Modify: `apps/client/src/app/recommendation.tsx`
- Modify: `apps/client/src/app/history.tsx`
- Modify: `apps/client/src/app/settings.tsx`
- Modify: `apps/client/src/components/action-card.tsx`
- Modify: `apps/client/src/components/follow-up-panel.tsx`
- Modify: `apps/client/src/components/feedback-panel.tsx`
- Modify: `apps/client/src/components/history-list.tsx`
- Modify: `apps/client/src/features/recommendation/action-card.test.tsx`
- Modify: `apps/client/src/features/recommendation/follow-up-panel.test.tsx`
- Modify: `apps/client/src/features/feedback/feedback-sheet.test.tsx`

**Interfaces:**
- Preserve `ActionCard({ recommendation })`, `FollowUpPanel({ onAsk })`, `FeedbackPanel(...)`, and `HistoryList({ items })` signatures.
- Risk labels, medical disclaimers, source labels, request IDs, submit behavior and local-only copy remain unchanged.

- [x] **Step 1: Add failing presentation assertions**

Assert the recommendation includes the section eyebrow `AIRME ACTION PLAN`, four plan tiles with accessible labels `建議方案：時間／地點／強度／準備`, and feedback includes eyebrow `5 SECOND CHECK-IN`.

- [x] **Step 2: Run recommendation tests and confirm RED**

Run: `npm run test --workspace airme -- src/features/recommendation/action-card.test.tsx src/features/recommendation/follow-up-panel.test.tsx src/features/feedback/feedback-sheet.test.tsx`

Expected: FAIL because the new hierarchy and accessible tile labels do not exist.

- [x] **Step 3: Implement recommendation Bento layout**

Use a risk-colored hero with ink border, a wrapping two-column plan tile grid, numbered why rows, white source card, teal safety card, yellow follow-up card and coral feedback accent. Preserve urgent and medical response copy and use text plus border treatment for dispositions.

- [x] **Step 4: Implement history and settings grids**

At widths `>= 760`, render history cards and settings sections in two columns; below 760 render one column. Keep destructive clear confirmation full width, visually separated and coral. Preserve empty state and all existing switch/button actions.

- [x] **Step 5: Run the full client test suite**

Run: `npm run test --workspace airme`

Expected: all client tests PASS with no changed product behavior.

### Task 6: Documentation, build and visual verification

**Files:**
- Modify: `apps/client/README.md`
- Modify: `docs/superpowers/specs/2026-07-14-airme-editorial-grid-ui-design.md`

**Interfaces:**
- Documentation reports only commands and platforms actually verified in this task.

- [x] **Step 1: Update documentation**

Replace the client README statement `light／dark theme` with `固定亮色編輯方格主題` and describe the responsive desktop-header/mobile-bottom-navigation behavior. Change the design spec status to `已實作，待人工裝置驗證` only after automated checks and browser QA pass.

- [x] **Step 2: Run all automated client verification**

Run: `npm run test --workspace airme && npm run lint --workspace airme && npm run typecheck --workspace airme && npm run build:web --workspace airme`

Expected: all commands exit 0 and `apps/client/dist/` is regenerated.

- [x] **Step 3: Verify the browser at required widths**

Serve the Web build and verify:

- 375 × 812: bottom nav visible, single-column main cards, no horizontal overflow.
- 768 px: onboarding and form controls remain readable with no clipped action.
- 1440 px: top navigation visible, bottom nav absent, home and settings use multi-column grid.
- Complete onboarding → home → recommendation → follow-up → feedback → history → settings.
- Confirm browser console has no new error or warning.

- [x] **Step 4: Inspect final diff without staging**

Run: `git status --short && git diff --check && git diff -- apps/client docs/superpowers`

Expected: only scoped UI, test and documentation changes; no secrets, environment files, contracts, business documents, generated credentials or unrelated edits. Do not stage or commit.
