/**
 * Owner Portal Models
 * MongoDB + Mongoose implementation
 *
 * All models use:
 * - tenantIsolationPlugin for multi-tenancy (orgId scoping)
 * - auditPlugin for change tracking (createdBy, updatedBy, timestamps)
 */

export { AgentContractModel, type AgentContract } from "./AgentContract";
export { UtilityMeterModel, type UtilityMeter } from "./UtilityMeter";
export { UtilityBillModel, type UtilityBill } from "./UtilityBill";
export {
  MoveInOutInspectionModel,
  type MoveInOutInspection,
} from "./MoveInOutInspection";
export { WarrantyModel, type Warranty } from "./Warranty";
export { AdvertisementModel, type Advertisement } from "./Advertisement";
export { DelegationModel, type Delegation } from "./Delegation";
export { MailboxThreadModel, type MailboxThread } from "./MailboxThread";
