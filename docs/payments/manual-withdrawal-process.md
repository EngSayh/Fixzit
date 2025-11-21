# PayTabs Withdrawal Strategy & Manual Process

**Last Updated:** November 18, 2025  
**Owners:** Payments Engineering + Finance Operations  

---

## 1. Overview

Fixzit now supports two payout paths for Souq seller withdrawals:

1. **PayTabs payout API** (automated) – used whenever PayTabs credentials are present and the feature flag is enabled.
2. **Manual bank transfer** (fallback) – used when PayTabs payouts are disabled or if the banking partner rejects the request.

The service layer chooses the path automatically:

| Mode | How to Enable | Code Path |
|------|---------------|-----------|
| Automated PayTabs payout | Set `PAYTABS_PAYOUT_ENABLED=true` plus `PAYTABS_PROFILE_ID` & `PAYTABS_SERVER_KEY` | `WithdrawalService.processWithdrawal` → `createPayout()` |
| Manual transfer fallback | Leave `PAYTABS_PAYOUT_ENABLED` unset/false or handle PayTabs errors | `WithdrawalService.processWithdrawal` → manual completion |
| SADAD / SPAN bank integration | (Deferred) `ENABLE_SADAD_PAYOUTS=true` once banking partnership is ready | `PayoutProcessorService.executeBankTransfer` |

---

## 2. Automated PayTabs Payouts

1. Ensure the following environment variables are set in the deployment target:
   - `PAYTABS_PROFILE_ID`
   - `PAYTABS_SERVER_KEY`
   - `PAYTABS_BASE_URL` (optional – defaults to KSA endpoint)
   - `PAYTABS_PAYOUT_ENABLED=true`
2. When a seller submits a withdrawal request, `WithdrawalService` calls `createPayout` with a unique reference (`WD-{timestamp}-{seller}`).
3. PayTabs responds with a payout id and status (`PROCESSING` or `COMPLETED`). We persist the payout id on the withdrawal record so admins can track status inside Fixzit.
4. Use the PayTabs back office to verify settlement completion if the status remains `PROCESSING` longer than 24 hours.

**Monitoring**
- Logs are tagged with `[Withdrawal]` and include the withdrawal id, seller id, and PayTabs payout id.
- Any API error triggers a fallback to manual processing and is visible in Sentry/Datadog.

---

## 3. Manual Bank Transfer Process

Manual processing is still required when:
- PayTabs payouts are disabled (`PAYTABS_PAYOUT_ENABLED=false`).
- PayTabs responds with a validation or banking error (invalid IBAN, payout limitation, etc.).
- The seller requests a payout lower than PayTabs’ minimum.

**Runbook**
1. Finance downloads the approved settlement statement from Fixzit.
2. Verify the withdrawal record in Mongo (`souq_withdrawals`) is marked `processing` and contains the seller bank details.
3. Execute the transfer through the company banking portal (SARIE/SWIFT).
4. Record the transaction id in Fixzit by calling `WithdrawalService.updateWithdrawalStatus(...)` or using the admin UI (when available). The `transactionId` field should match the banking confirmation reference.
5. Notify the seller via email/SMS (the notification queue job is triggered automatically when the status changes to `completed`).

**Tip:** Keep supporting documents (bank confirmations) in the finance shared drive. Use the withdrawal id (`WD-*`) as part of the filename for easy correlation.

---

## 4. SADAD / SPAN Integration Status

The fully automated SADAD/SPAN rail is **deferred to Q1 2026** pending a banking partnership and SAMA approvals.

- Toggle: `ENABLE_SADAD_PAYOUTS`
- Current default: `false` – the `PayoutProcessorService.executeBankTransfer` method detects this flag and returns a “integration deferred” error, which routes the payout back to manual handling.
- Required secrets when enabling: `SADAD_API_KEY`, `SADAD_API_SECRET`, `SADAD_API_ENDPOINT`
- Mode flag: `SADAD_SPAN_MODE=simulation` (default). Live mode is not implemented yet; setting other values will fail fast to avoid accidental activation without a real client.
- If `ENABLE_SADAD_PAYOUTS=true` but any required secret is missing, the service returns `INTEGRATION_NOT_CONFIGURED` and logs an error, keeping payouts in manual mode.
- When the partnership is ready, flip the flag to `true`, set the secrets in the secret manager, and replace the simulator with the real client before deployment.

Refer to `services/souq/settlements/payout-processor.ts` for the status check and `docs/completion/EPIC_I_SETTLEMENT_AUTOMATION_COMPLETE.md` for the original implementation plan.

---

## 5. Admin Checklist

1. **Before enabling PayTabs payouts**
   - Verify credentials in staging.
   - Dry-run a payout with a test seller.
   - Confirm notifications reach finance + seller.
2. **Weekly**
   - Review `souq_withdrawals` for stuck statuses.
   - Cross-check PayTabs dashboard totals vs Fixzit ledger.
3. **Monthly**
   - Export completed withdrawals for reconciliation.
   - Audit at least one manual payout trail to ensure the hand-off procedure is still followed.

---

## 6. References

- `services/souq/settlements/withdrawal-service.ts` – entry point that routes between PayTabs and manual flows.
- `services/souq/settlements/balance-service.ts` – admin approval path that now calls `PayoutProcessorService`.
- `services/souq/settlements/payout-processor.ts` – SADAD/SPAN pipeline (deferred).
- `lib/paytabs.ts` – PayTabs payout helper functions.
