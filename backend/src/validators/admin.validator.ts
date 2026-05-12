import Joi from 'joi';

export const createUserSchema = Joi.object({
  role: Joi.string().valid('STUDENT', 'ADMIN').default('STUDENT'),
  email: Joi.string().email().required().messages({
    'string.email': 'Введіть коректну електронну адресу',
    'any.required': 'Email є обовʼязковим',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.min': 'Пароль має містити щонайменше 8 символів',
      'string.pattern.base': 'Пароль має містити принаймні одну велику літеру, одну малу літеру, одну цифру та один спеціальний символ (@$!%*?&)',
      'any.required': 'Пароль є обовʼязковим',
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
  educationalProgramId: Joi.string().uuid().when('role', {
    is: 'STUDENT',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': 'Освітня програма є обовʼязковою',
    'string.guid': 'Некоректний ID освітньої програми',
  }),
  currentSemester: Joi.number().integer().min(1).max(12).when('role', {
    is: 'STUDENT',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'any.required': 'Семестр є обовʼязковим',
  }),
  educationForm: Joi.string().valid('FULL_TIME', 'DISTANCE', 'EXTERN').when('role', {
    is: 'STUDENT',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.only': 'Форма навчання має бути: FULL_TIME, DISTANCE або EXTERN',
    'any.required': 'Форма навчання є обовʼязковою',
  }),
});
