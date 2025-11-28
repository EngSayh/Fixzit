import mongoose from "mongoose";
import Organization from "./schema";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  QueryOrganizationsInput,
} from "./validator";

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class OrganizationService {
  static async list(filters: QueryOrganizationsInput) {
    const { page, limit, subscriptionPlan, status, search, sortBy, sortOrder } =
      filters;
    const query: Record<string, unknown> = {};

    if (subscriptionPlan) query.subscriptionPlan = subscriptionPlan;
    if (status) query.status = status;
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { nameAr: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const [organizations, total] = await Promise.all([
      Organization.find(query).sort(sort).skip(skip).limit(limit).lean().exec(),
      Organization.countDocuments(query).exec(),
    ]);

    return {
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  static async getById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid organization ID format");
    }
    const organization = await Organization.findById(id).lean().exec();
    if (!organization) throw new Error("Organization not found");
    return organization;
  }

  static async create(data: CreateOrganizationInput, userId?: string) {
    const escapedName = escapeRegex(data.name);
    const existing = await Organization.findOne({
      name: new RegExp(`^${escapedName}$`, "i"),
    }).exec();
    if (existing) throw new Error("Organization with this name already exists");

    const organization = new Organization({
      ...data,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });
    await organization.save();
    return organization.toObject();
  }

  static async update(
    id: string,
    data: UpdateOrganizationInput,
    userId?: string,
  ) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid organization ID format");
    }
    const organization = await Organization.findById(id).exec();
    if (!organization) throw new Error("Organization not found");

    if (data.name && data.name !== organization.name) {
      const escapedName = escapeRegex(data.name);
      const existing = await Organization.findOne({
        name: new RegExp(`^${escapedName}$`, "i"),
        _id: { $ne: id },
      }).exec();
      if (existing)
        throw new Error("Organization with this name already exists");
    }

    Object.assign(organization, data);
    if (userId) organization.updatedBy = new mongoose.Types.ObjectId(userId);
    await organization.save();
    return organization.toObject();
  }

  static async delete(id: string, userId?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid organization ID format");
    }
    const organization = await Organization.findById(id).exec();
    if (!organization) throw new Error("Organization not found");

    organization.isActive = false;
    organization.status = "inactive";
    if (userId) organization.updatedBy = new mongoose.Types.ObjectId(userId);
    await organization.save();
    return organization.toObject();
  }
}
