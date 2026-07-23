import apiClient from "./axios";
import { apiData, apiList, type ApiEnvelope, type ApiListEnvelope } from "./response";
import type {
  Attendance,
  AttendanceFilter,
  AttendanceSave,
  AttendanceSetting,
  HrDepartment,
  HrPosition,
} from "@/types/hr";

export const davomatApi = {
  royxat: async (params: AttendanceFilter = {}) =>
    apiList((await apiClient.get<Attendance[] | ApiListEnvelope<Attendance>>("/hr/attendance", { params })).data),
  clockIn: async () =>
    apiData((await apiClient.post<Attendance | ApiEnvelope<Attendance>>("/hr/attendance/clock-in")).data),
  clockOut: async () =>
    apiData((await apiClient.post<Attendance | ApiEnvelope<Attendance>>("/hr/attendance/clock-out")).data),
  yaratish: async (data: AttendanceSave) =>
    apiData((await apiClient.post<Attendance | ApiEnvelope<Attendance>>("/hr/attendance", data)).data),
  yangilash: async (id: string, data: Partial<AttendanceSave>) =>
    apiData((await apiClient.patch<Attendance | ApiEnvelope<Attendance>>(`/hr/attendance/${id}`, data)).data),
  ochirish: async (id: string) => apiClient.delete(`/hr/attendance/${id}`),
  sozlama: async () =>
    apiData((await apiClient.get<AttendanceSetting | ApiEnvelope<AttendanceSetting>>("/hr/attendance/settings")).data),
  sozlamaYangilash: async (lateThreshold: string) =>
    apiData((await apiClient.patch<AttendanceSetting | ApiEnvelope<AttendanceSetting>>(
      "/hr/attendance/settings",
      { lateThreshold }
    )).data),
};

function crud<T extends { id: string }, TCreate extends object>(path: string) {
  return {
    royxat: async (params: Record<string, string | undefined> = {}) =>
      apiList((await apiClient.get<T[] | ApiListEnvelope<T>>(path, { params })).data),
    yaratish: async (data: TCreate) =>
      apiData((await apiClient.post<T | ApiEnvelope<T>>(path, data)).data),
    yangilash: async (id: string, data: Partial<TCreate>) =>
      apiData((await apiClient.patch<T | ApiEnvelope<T>>(`${path}/${id}`, data)).data),
    ochirish: async (id: string) => apiClient.delete(`${path}/${id}`),
  };
}

export const bolimlarApi = crud<HrDepartment, Omit<HrDepartment, "id">>("/hr/departments");
export const lavozimlarApi = crud<HrPosition, Omit<HrPosition, "id">>("/hr/positions");
