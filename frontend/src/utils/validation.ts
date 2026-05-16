import { z } from 'zod';

export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const EDUCATION_FORMS = [
  { value: 'FULL_TIME', label: 'Денна' },
  { value: 'DISTANCE', label: 'Заочна' },
  { value: 'EXTERN', label: 'Екстернат' },
];

export const zodResolver = (schema: z.ZodSchema<any>) => (values: any) => {
  const parsed = schema.safeParse(values);
  if (parsed.success) {
    return {};
  }
  const errors: Record<string, string> = {};
  parsed.error.issues.forEach((err: any) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  return errors;
};

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email є обовʼязковим')
    .regex(EMAIL_REGEX, 'Введіть коректну електронну адресу'),
  password: z.string()
    .min(1, 'Пароль є обовʼязковим')
    .min(8, 'Пароль має містити щонайменше 8 символів')
    .regex(PASSWORD_REGEX, 'Пароль має містити принаймні одну велику літеру, одну малу літеру, одну цифру та один спеціальний символ (@$!%*?&)'),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email є обовʼязковим')
    .regex(EMAIL_REGEX, 'Введіть коректну електронну адресу'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(1, 'Пароль є обовʼязковим')
    .min(8, 'Пароль має містити щонайменше 8 символів')
    .regex(PASSWORD_REGEX, 'Пароль має містити принаймні одну велику літеру, одну малу літеру, одну цифру та один спеціальний символ (@$!%*?&)'),
  confirmPassword: z.string()
    .min(1, 'Підтвердження пароля є обовʼязковим'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Паролі не співпадають',
  path: ['confirmPassword'],
});

export const studentSchema = z.object({
  role: z.string(),
  email: z.string()
    .min(1, 'Email є обовʼязковим')
    .regex(EMAIL_REGEX, 'Введіть коректну електронну адресу'),
  fullName: z.string()
    .min(1, 'ПІБ є обовʼязковим')
    .min(2, 'ПІБ має містити принаймні 2 символи'),
  groupId: z.string()
    .min(1, 'Група є обовʼязковим'),
  educationalProgramId: z.union([z.string(), z.null()]).refine((val) => val !== null && val !== '', {
    message: 'Освітня програма є обовʼязковим',
  }),
  currentSemester: z.number()
    .min(1, 'Семестр має бути від 1 до 12')
    .max(12, 'Семестр має бути від 1 до 12'),
  educationForm: z.string(),
});

export const groupSchema = z.object({
  name: z.string()
    .min(2, 'Назва занадто коротка'),
  description: z.string().optional(),
  educationalProgramId: z.string()
    .min(1, 'Освітня програма є обовʼязковим'),
});

export const gradeManualSchema = z.object({
  studentId: z.string()
    .min(1, 'Оберіть студента'),
  courseId: z.string()
    .min(1, 'Оберіть дисципліну'),
  gradeValue: z.number()
    .min(0, 'Оцінка має бути від 0 до 100')
    .max(100, 'Оцінка має бути від 0 до 100'),
  semesterCompleted: z.number()
    .min(1)
    .max(12),
  assessmentName: z.string().optional(),
});

export const gradeEditSchema = z.object({
  id: z.string().optional(),
  gradeValue: z.number()
    .min(0, 'Оцінка має бути від 0 до 100')
    .max(100, 'Оцінка має бути від 0 до 100'),
  semesterCompleted: z.number()
    .min(1)
    .max(12),
  assessmentName: z.string().optional(),
});

export const courseSchema = z.object({
  name: z.string()
    .min(2, 'Назва занадто коротка'),
  ectsCredits: z.number()
    .min(1)
    .max(30),
  controlType: z.string(),
  semester: z.number()
    .min(1)
    .max(12)
    .optional(),
  educationalProgramIds: z.array(z.string()),
  categoryId: z.union([z.string(), z.null()]).optional(),
  isSelective: z.boolean(),
  maxStudents: z.union([z.number().min(1), z.null()]).optional(),
});

export const programSchema = z.object({
  name: z.string()
    .min(2, 'Назва занадто коротка'),
  description: z.string().optional(),
  totalCredits: z.number()
    .min(1)
    .max(500),
  maxCreditsPerSem: z.number()
    .min(1)
    .max(60),
});

export const categorySchema = z.object({
  name: z.string()
    .min(2, 'Назва занадто коротка'),
  description: z.string().optional(),
});

export const dependencySchema = z.object({
  parentCourseId: z.string()
    .min(1, 'Оберіть дисципліну-пререквізит'),
  weight: z.number()
    .min(0.1)
    .max(1.0),
});

export const adminSchema = z.object({
  email: z.string()
    .min(1, 'Email є обовʼязковим')
    .regex(EMAIL_REGEX, 'Введіть коректну електронну адресу'),
  fullName: z.string()
    .min(1, 'ПІБ є обовʼязковим')
    .min(2, 'ПІБ має містити принаймні 2 символи'),
  role: z.string(),
});
