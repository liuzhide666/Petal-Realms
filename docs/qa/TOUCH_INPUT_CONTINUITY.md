# Touch input continuity correction

This correction is based on the V5.18 source at 08771687513e480a2cacd84c52ef1a6327b154fa. It is a local follow-up, not evidence of a production release.

## Reproduction and cause

Hold the joystick, attack and defense using three distinct touch pointers. Cancel the defense pointer. The control's existing local handler correctly releases defense, but the event then bubbles to the window's unconditional resetInputs handler. That second handler also clears the other held fingers. The same defect occurs when canceling attack or the joystick.

The browser regression failed 15 of 39 assertions before the correction across 390x844, 844x390 and 320x568 Chromium viewports. The failed assertions were preservation of the other held action, preservation of joystick movement, and actual player movement after cancellation.

## Normative clarification of M003

For a canceled touch pointer p, remove only p from its owning control. Other touch pointers continue contributing until their own release, cancellation or capture loss. The existing defense-over-attack priority remains unchanged. Blur, background transitions, modal opening and non-touch pointer cancellation continue to neutralize all input. Opening and closing inventory must not revive a stale command.

This changes input ownership only. It adds no random draws, reward coefficients, damage coefficients or save fields. The published PDF remains pinned to its earlier source. V5.19 incorporates this correction into its local354-page consolidated handbook candidate; its upload is blocked by the current file-upload limit. See V5.19_QA.md for the full runtime and publication evidence.

## Verification

- `PETAL_CHROMIUM=/tmp/chromium node tests/browser_input_continuity.mjs`: 46/46 after the correction (39 touch checks and 7 desktop keyboard checks).
- `npm test`: all static suites and 12/12 isolated Cloudflare account API tests pass.
- Existing browser suites: V5.16 245 checks, V5.17 128 checks and V5.18 130 checks pass.
- Chromium touch events are dispatched through browser DOM handlers. This does not certify physical iOS Safari or operating-system gesture behavior.

The added desktop checks exercise actual keyboard events for WASD movement, Space attack, Shift defense priority, release ordering and blur neutralization. The full test suite emitted the existing npm environment warning about `http-proxy`; no test failed.

Remote publication is blocked in this session: GitHub connector calls did not return, and a bounded `git push --dry-run` failed because no GitHub username credential is configured for Git CLI. No production release or remote merge is claimed.

## Official reference observation

On 23 October 2026 the official Florr guest entry again remained on Connecting and logged "Ran out of transport methods to try". The entry screen and drifting background were visible. No combat session was established, so this correction makes no claim of independently verified Florr combat parity.
