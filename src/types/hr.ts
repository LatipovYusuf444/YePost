export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";

export type Attendance = {
  id: string;
  workspaceId: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  note?: string | null;
  user?: { id: string; fullName?: string | null } | null;
};

export type AttendanceSetting = {
  id?: string;
  workspaceId: string;
  lateThreshold: string;
};

export type AttendanceFilter = {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type AttendanceSave = {
  userId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  note?: string;
};

export type HrDepartment = {
  id: string;
  name: string;
  parentId?: string | null;
  managerId?: string | null;
  description?: string | null;
};

export type HrPosition = {
  id: string;
  name: string;
  departmentId?: string | null;
};
