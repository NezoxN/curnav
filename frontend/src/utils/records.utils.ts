export interface AcademicRecord {
  id: string;
  studentId: string;
  courseId: string;
  assessmentName: string | null;
  gradeValue: number;
  semesterCompleted: number;
  dateRecorded: string;
  course: {
    name: string;
    ectsCredits: number;
    controlType: string;
  };
  isPassed?: boolean;
}

export interface GroupedCourse {
  courseId: string;
  courseName: string;
  ectsCredits: number;
  controlType: string;
  semester: number;
  records: AcademicRecord[];
  totalGrade: number;
  ectsGrade: string;
  nationalScale: string;
}

export interface StudentRecordsResponse {
  allRecords: AcademicRecord[];
  groupedBySemester: Record<number, GroupedCourse[]>;
  totalGPA: number;
  totalECTS: number;
  latestYear: number;
}

export const getECTSColor = (grade: string): string => {
  switch (grade) {
    case 'A': return 'green';
    case 'B':
    case 'C': return 'brand';
    case 'D':
    case 'E': return 'yellow';
    default: return 'red';
  }
};
