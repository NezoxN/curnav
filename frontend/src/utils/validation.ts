import Joi from 'joi';

export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const EDUCATION_FORMS = [
  { value: 'FULL_TIME', label: 'Денна' },
  { value: 'DISTANCE', label: 'Заочна' },
  { value: 'EXTERN', label: 'Екстернат' },
];

export const joiResolver = (schema: Joi.Schema) => (values: any) => {
  const { error } = schema.validate(values, { abortEarly: false });
  if (!error) {
    return {};
  }
  const errors: Record<string, string> = {};
  error.details.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  return errors;
};

export const loginSchema = Joi.object({
  email: Joi.string().required().regex(EMAIL_REGEX).messages({
    'string.empty': 'Email є обовʼязковим',
    'string.pattern.base': 'Введіть коректну електронну адресу'
  }),
  password: Joi.string().required().min(8).regex(PASSWORD_REGEX).messages({
    'string.empty': 'Пароль є обовʼязковим',
    'string.min': 'Пароль має містити щонайменше 8 символів',
    'string.pattern.base': 'Пароль має містити принаймні одну велику літеру, одну малу літеру, одну цифру та один спеціальний символ (@$!%*?&)'
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().required().regex(EMAIL_REGEX).messages({
    'string.empty': 'Email є обовʼязковим',
    'string.pattern.base': 'Введіть коректну електронну адресу'
  }),
});

export const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().required().min(8).regex(PASSWORD_REGEX).messages({
    'string.empty': 'Пароль є обовʼязковим',
    'string.min': 'Пароль має містити щонайменше 8 символів',
    'string.pattern.base': 'Пароль має містити принаймні одну велику літеру, одну малу літеру, одну цифру та один спеціальний символ (@$!%*?&)'
  }),
  confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Паролі не співпадають',
    'any.required': 'Підтвердження пароля є обовʼязковим'
  }),
});

export const studentSchema = Joi.object({
  role: Joi.string().required(),
  email: Joi.string().required().regex(EMAIL_REGEX).messages({
    'string.empty': 'Email є обовʼязковим',
    'string.pattern.base': 'Введіть коректну електронну адресу',
    'any.required': 'Email є обовʼязковим'
  }),
  fullName: Joi.string().required().min(2).messages({
    'string.empty': 'ПІБ є обовʼязковим',
    'string.min': 'ПІБ має містити принаймні 2 символи',
    'any.required': 'ПІБ є обовʼязковим'
  }),
  groupId: Joi.string().required().messages({
    'string.empty': 'Група є обовʼязковою',
    'any.required': 'Група є обовʼязковою'
  }),
  educationForm: Joi.string().required().messages({
    'string.empty': 'Форма навчання є обовʼязковою',
    'any.required': 'Форма навчання є обовʼязковою'
  }),
});

export const groupSchema = Joi.object({
  name: Joi.string().required().min(2).messages({
    'string.min': 'Назва занадто коротка',
    'string.empty': 'Назва є обовʼязковою',
    'any.required': 'Назва є обовʼязковою'
  }),
  description: Joi.string().allow('', null).optional(),
  educationalProgramId: Joi.string().required().messages({
    'string.empty': 'Освітня програма є обовʼязковою',
    'any.required': 'Освітня програма є обовʼязковою'
  }),
  currentSemester: Joi.number().required().min(1).max(12).messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
    'any.required': 'Семестр є обовʼязковим'
  }),
});

export const gradeManualSchema = Joi.object({
  studentId: Joi.string().required().messages({
    'string.empty': 'Оберіть студента',
    'any.required': 'Оберіть студента'
  }),
  courseId: Joi.string().required().messages({
    'string.empty': 'Оберіть дисципліну',
    'any.required': 'Оберіть дисципліну'
  }),
  gradeValue: Joi.number().required().min(0).max(100).messages({
    'number.min': 'Оцінка має бути від 0 до 100',
    'number.max': 'Оцінка має бути від 0 до 100',
    'number.base': 'Введіть коректну оцінку',
    'any.required': 'Оцінка є обовʼязковою'
  }),
  semesterCompleted: Joi.number().optional().min(1).max(12).messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
    'any.required': 'Семестр є обовʼязковим'
  }),
  assessmentName: Joi.string().allow('', null).optional(),
});

export const gradeEditSchema = Joi.object({
  id: Joi.string().optional(),
  gradeValue: Joi.number().required().min(0).max(100).messages({
    'number.min': 'Оцінка має бути від 0 до 100',
    'number.max': 'Оцінка має бути від 0 до 100',
    'number.base': 'Введіть коректну оцінку',
    'any.required': 'Оцінка є обовʼязковою'
  }),
  semesterCompleted: Joi.number().required().min(1).max(12).messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
    'any.required': 'Семестр є обовʼязковим'
  }),
  assessmentName: Joi.string().allow('', null).optional(),
});

export const courseSchema = Joi.object({
  name: Joi.string().required().min(2).messages({
    'string.min': 'Назва занадто коротка',
    'string.empty': 'Назва є обовʼязковою',
    'any.required': 'Назва є обовʼязковою'
  }),
  ectsCredits: Joi.number().required().min(1).max(30).messages({
    'number.min': 'Кількість кредитів має бути не менше 1',
    'number.max': 'Кількість кредитів має бути не більше 30',
    'number.base': 'Кредити мають бути числом',
    'any.required': 'Кредити є обовʼязковими'
  }),
  controlType: Joi.string().required().messages({
    'string.empty': 'Тип контролю є обовʼязковим',
    'any.required': 'Тип контролю є обовʼязковим'
  }),
  semester: Joi.number().min(1).max(12).allow(null).optional().messages({
    'number.min': 'Рекомендований семестр має бути від 1 до 12',
    'number.max': 'Рекомендований семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом'
  }),
  educationalProgramIds: Joi.array().items(Joi.string()).required().messages({
    'array.base': 'Оберіть принаймні одну освітню програму',
    'any.required': 'Освітні програми є обовʼязковими'
  }),
  categoryId: Joi.string().allow('', null).optional(),
  isSelective: Joi.boolean().required(),
  maxStudents: Joi.number().min(1).allow(null).optional().messages({
    'number.min': 'Кількість місць має бути більше 0',
    'number.base': 'Кількість місць має бути числом'
  }),
});

export const programSchema = Joi.object({
  name: Joi.string().required().min(2).messages({
    'string.min': 'Назва занадто коротка',
    'string.empty': 'Назва є обовʼязковою',
    'any.required': 'Назва є обовʼязковою'
  }),
  description: Joi.string().allow('', null).optional(),
  totalCredits: Joi.number().required().min(1).max(500).messages({
    'number.min': 'Загальна кількість кредитів має бути від 1 до 500',
    'number.max': 'Загальна кількість кредитів має бути від 1 до 500',
    'number.base': 'Кредити мають бути числом',
    'any.required': 'Кредити є обовʼязковими'
  }),
  maxCreditsPerSem: Joi.number().required().min(1).max(60).messages({
    'number.min': 'Кредитів на семестр має бути від 1 до 60',
    'number.max': 'Кредитів на семестр має бути від 1 до 60',
    'number.base': 'Кредити мають бути числом',
    'any.required': 'Кредити є обовʼязковими'
  }),
});

export const categorySchema = Joi.object({
  name: Joi.string().required().min(2).messages({
    'string.min': 'Назва занадто коротка',
    'string.empty': 'Назва є обовʼязковою',
    'any.required': 'Назва є обовʼязковою'
  }),
  description: Joi.string().allow('', null).optional(),
});

export const dependencySchema = Joi.object({
  parentCourseId: Joi.string().required().messages({
    'string.empty': 'Оберіть дисципліну-пререквізит',
    'any.required': 'Оберіть дисципліну-пререквізит'
  }),
  weight: Joi.number().required().min(0.1).max(1.0).messages({
    'number.min': 'Вага впливу має бути від 0.1 до 1.0',
    'number.max': 'Вага впливу має бути від 0.1 до 1.0',
    'number.base': 'Вага має бути числом',
    'any.required': 'Вага є обовʼязковою'
  }),
});

export const adminSchema = Joi.object({
  email: Joi.string().required().regex(EMAIL_REGEX).messages({
    'string.empty': 'Email є обовʼязковим',
    'string.pattern.base': 'Введіть коректну електронну адресу',
    'any.required': 'Email є обовʼязковим'
  }),
  fullName: Joi.string().required().min(2).messages({
    'string.empty': 'ПІБ є обовʼязковим',
    'string.min': 'ПІБ має містити принаймні 2 символи',
    'any.required': 'ПІБ є обовʼязковим'
  }),
  role: Joi.string().required(),
});
