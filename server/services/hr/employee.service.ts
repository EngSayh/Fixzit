import type { FilterQuery, UpdateQuery } from 'mongoose';
import {
  Employee,
  type EmployeeDoc,
  type AttendanceRecordDoc,
  AttendanceRecord,
  type TechnicianProfile,
  type EmployeeCompensation,
} from '@/server/models/hr.models';

export interface EmployeeSearchFilters {
  orgId: string;
  departmentId?: string;
  employmentStatus?: EmployeeDoc['employmentStatus'];
  skills?: string[];
  text?: string;
}

export interface EmployeeSearchOptions {
  page?: number;
  limit?: number;
}

export interface UpsertEmployeePayload {
  orgId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle: string;
  departmentId?: string;
  managerId?: string;
  employmentType: EmployeeDoc['employmentType'];
  employmentStatus?: EmployeeDoc['employmentStatus'];
  hireDate: Date;
  technicianProfile?: TechnicianProfile;
  compensation?: EmployeeCompensation;
  bankDetails?: EmployeeDoc['bankDetails'];
}

export class EmployeeService {
  static async getById(orgId: string, id: string) {
    return Employee.findOne({ orgId, _id: id, isDeleted: false }).lean<EmployeeDoc>().exec();
  }

  static async getByCode(orgId: string, employeeCode: string) {
    return Employee.findOne({ orgId, employeeCode, isDeleted: false }).lean<EmployeeDoc>().exec();
  }

  private static buildQuery(filters: EmployeeSearchFilters): FilterQuery<EmployeeDoc> {
    const query: FilterQuery<EmployeeDoc> = { orgId: filters.orgId, isDeleted: false };

    if (filters.departmentId) query.departmentId = filters.departmentId as any;
    if (filters.employmentStatus) query.employmentStatus = filters.employmentStatus;
    if (filters.skills?.length) {
      query['technicianProfile.skills'] = { $all: filters.skills } as any;
    }
    if (filters.text) {
      query.$or = [
        { firstName: new RegExp(filters.text, 'i') },
        { lastName: new RegExp(filters.text, 'i') },
        { email: new RegExp(filters.text, 'i') },
        { employeeCode: new RegExp(filters.text, 'i') },
      ];
    }
    return query;
  }

  static async search(filters: EmployeeSearchFilters) {
    return Employee.find(this.buildQuery(filters)).lean<EmployeeDoc>().exec();
  }

  static async searchWithPagination(filters: EmployeeSearchFilters, options: EmployeeSearchOptions = {}) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 50;
    const skip = (page - 1) * limit;
    const query = this.buildQuery(filters);

    const [items, total] = await Promise.all([
      Employee.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<EmployeeDoc>().exec(),
      Employee.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  }

  static async upsert(payload: UpsertEmployeePayload) {
    const update: UpdateQuery<EmployeeDoc> = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      jobTitle: payload.jobTitle,
      departmentId: payload.departmentId as any,
      managerId: payload.managerId as any,
      employmentType: payload.employmentType,
      employmentStatus: payload.employmentStatus ?? 'ACTIVE',
      hireDate: payload.hireDate,
    };

    if (payload.technicianProfile) {
      update.technicianProfile = payload.technicianProfile;
    }

    if (payload.compensation) {
      const comp = payload.compensation;
      update.compensation = comp;
      update.baseSalary = comp.baseSalary;
      const allowancesTotal =
        (comp.housingAllowance ?? 0) +
        (comp.transportAllowance ?? 0) +
        (comp.otherAllowances?.reduce((sum, item) => sum + (item.amount || 0), 0) ?? 0);
      update.allowanceTotal = allowancesTotal;
      update.currency = comp.currency ?? update.currency;
    }

    if (payload.bankDetails) {
      update.bankDetails = payload.bankDetails;
    }

    return Employee.findOneAndUpdate(
      { orgId: payload.orgId, employeeCode: payload.employeeCode },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  static async updateTechnicianProfile(orgId: string, employeeId: string, profile: TechnicianProfile) {
    return Employee.findOneAndUpdate(
      { orgId, _id: employeeId, isDeleted: false },
      { technicianProfile: profile },
      { new: true }
    ).exec();
  }

  static async recordAttendance(entry: Omit<AttendanceRecordDoc, 'createdAt' | 'updatedAt' | 'isDeleted'>) {
    return AttendanceRecord.findOneAndUpdate(
      { orgId: entry.orgId, employeeId: entry.employeeId, date: entry.date },
      entry,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }
}
