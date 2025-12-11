# Type Safety Patterns (Mongoose Statics)
**Last Updated**: 2025-12-11T23:30:00+03:00  
**Scope**: Documents closure of TODO-001..005 (type-safety debt) and captures the canonical pattern for Mongoose statics/models.

## What Was Wrong
- Legacy statics used `as unknown as` casts and missing `this` typing, which bypassed TypeScript checks.
- Model exports were cast after the fact instead of being constructed with the correct generic model type.
- File paths in trackers (`models/*.model.ts`) no longer matched the current code layout, leaving the fixes undocumented.

## Canonical Pattern (use in all new statics)

```ts
// types/mongoose-compat.ts exposes MModel<T> to pre-fill Mongoose generics
interface BookingModel extends MModel<IBooking> {
  isAvailable(params: {...}): Promise<boolean>;
  createWithAvailability(doc: Partial<IBooking>, session?: mongoose.ClientSession): Promise<IBooking>;
}

// Explicit this typing + full return type keeps statics type-safe
BookingSchema.statics.isAvailable = (async function (
  this: BookingModel,
  { orgId, listingId, checkInDate, checkOutDate }
): Promise<boolean> {
  const nights = enumerateNightsUTC(toUTCDateOnly(checkInDate), toUTCDateOnly(checkOutDate));
  return !(await this.overlaps({ orgId, listingId, nights }));
}) as BookingModel["isAvailable"];

// Export with the right model type — no casts after creation
export const Booking: BookingModel =
  (mongoose.models.AqarBooking as BookingModel) ||
  mongoose.model<IBooking, BookingModel>("AqarBooking", BookingSchema);
```

**Live reference:** `server/models/aqar/Booking.ts:642-750` implements this pattern end-to-end (statics + typed export).

## Checklist for New Statics
- Define a model interface that extends `MModel<TDoc>` (and any shared statics via `CommonModelStatics`).
- Add `this: YourModel` as the first parameter on every static.
- Annotate return types explicitly; avoid `any`/`unknown` casts.
- Reuse `getModel<TDoc, TModel>()` or the pattern above to create models without post-hoc casting.
- Keep model paths in trackers (`PENDING_MASTER.md`, `TODO_FEATURES.md`) in sync when files move.

## Mapping the Old TODOs
- **TODO-001 & TODO-002** (`models/project.model.ts` statics) — project model was migrated to `server/models/Project.ts` with no custom statics; type safety now enforced via `getModel<ProjectDoc>()`.
- **TODO-003, TODO-004, TODO-005** (`models/aqarBooking.model.ts` statics + export) — implemented with typed statics and model export in `server/models/aqar/Booking.ts` (see reference above).

No remaining `TODO(type-safety)` markers or `as unknown as BookingModel` casts exist in the statics cluster.
