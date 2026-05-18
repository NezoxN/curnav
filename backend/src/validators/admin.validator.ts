import Joi from 'joi';

export const createUserSchema = Joi.object({
  role: Joi.string().valid('STUDENT', 'ADMIN').default('STUDENT'),
  email: Joi.string().email().required().messages({
    'string.email': 'Введіть коректну електронну адресу',
    'any.required': 'Email є обовʼязковим',
  }),
  fullName: Joi.string().required().messages({
    'any.required': 'ПІБ є обовʼязковим',
  }),
  groupId: Joi.string().uuid().when('role', {
    is: 'STUDENT',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': 'Група є обовʼязковою',
    'string.guid': 'Некоректний ID групи',
  }),
  educationalProgramId: Joi.string().uuid().optional().messages({
    'string.guid': 'Некоректний ID освітньої програми',
  }),
  currentSemester: Joi.number().integer().min(1).max(12).optional().messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
  }),
  educationForm: Joi.string().valid('FULL_TIME', 'DISTANCE', 'EXTERN', 'Денна', 'Заочна', 'Екстернат').when('role', {
    is: 'STUDENT',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.only': 'Форма навчання має бути: FULL_TIME, DISTANCE або EXTERN',
    'any.required': 'Форма навчання є обовʼязковою',
  }),
});

export const updateUserSchema = Joi.object({
  fullName: Joi.string().required().messages({
    'any.required': 'ПІБ є обовʼязковим',
  }),
  groupId: Joi.string().uuid().required().messages({
    'any.required': 'Група є обовʼязковою',
    'string.guid': 'Некоректний ID групи',
  }),
  educationalProgramId: Joi.string().uuid().optional().messages({
    'string.guid': 'Некоректний ID освітньої програми',
  }),
  currentSemester: Joi.number().integer().min(1).max(12).optional().messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
  }),
  educationForm: Joi.string().valid('FULL_TIME', 'DISTANCE', 'EXTERN', 'Денна', 'Заочна', 'Екстернат').required().messages({
    'any.only': 'Форма навчання має бути: FULL_TIME, DISTANCE або EXTERN',
    'any.required': 'Форма навчання є обовʼязковою',
  }),
  role: Joi.string().optional(),
  email: Joi.string().optional(),
});

export const blockUserSchema = Joi.object({
  isBlocked: Joi.boolean().required().messages({
    'any.required': 'Статус блокування є обовʼязковим',
    'boolean.base': 'Статус блокування має бути булевим значенням',
  }),
});
