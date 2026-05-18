import Joi from 'joi';

export const createCourseSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Назва дисципліні є обовʼязковою',
    'string.empty': 'Назва дисципліни не може бути порожньою',
  }),
  description: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Опис має бути рядком',
  }),
  ectsCredits: Joi.number().positive().required().messages({
    'number.positive': 'Кількість кредитів ЄКТС має бути додатним числом',
    'any.required': 'Кількість кредитів ЄКТС є обовʼязковою',
    'number.base': 'Кількість кредитів ЄКТС має бути числом',
  }),
  categoryId: Joi.string().uuid().optional().allow(null, '').messages({
    'string.guid': 'Некоректний ID категорії',
  }),
  semester: Joi.number().integer().min(1).max(12).optional().allow(null).messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
  }),
  controlType: Joi.string().valid('Екзамен', 'Залік', 'Диф. залік').required().messages({
    'any.only': 'Тип контролю має бути: Екзамен, Залік або Диф. залік',
    'any.required': 'Тип контролю є обовʼязковим',
  }),
  isSelective: Joi.boolean().optional().messages({
    'boolean.base': 'Поле isSelective має бути булевим значенням',
  }),
  maxStudents: Joi.number().integer().min(1).optional().allow(null).messages({
    'number.min': 'Максимальна кількість студентів має бути щонайменше 1',
    'number.base': 'Максимальна кількість студентів має бути числом',
  }),
  educationalProgramIds: Joi.array().items(Joi.string().uuid()).optional().messages({
    'array.base': 'Освітні програми мають бути масивом',
    'string.guid': 'Некоректний ID освітньої програми у масиві',
  }),
});

export const updateCourseSchema = Joi.object({
  name: Joi.string().optional().messages({
    'string.empty': 'Назва дисципліни не може бути порожньою',
  }),
  description: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Опис має бути рядком',
  }),
  ectsCredits: Joi.number().positive().optional().messages({
    'number.positive': 'Кількість кредитів ЄКТС має бути додатним числом',
    'number.base': 'Кількість кредитів ЄКТС має бути числом',
  }),
  categoryId: Joi.string().uuid().optional().allow(null, '').messages({
    'string.guid': 'Некоректний ID категорії',
  }),
  semester: Joi.number().integer().min(1).max(12).optional().allow(null).messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
  }),
  controlType: Joi.string().valid('Екзамен', 'Залік', 'Диф. залік').optional().messages({
    'any.only': 'Тип контролю має бути: Екзамен, Залік або Диф. залік',
  }),
  isSelective: Joi.boolean().optional().messages({
    'boolean.base': 'Поле isSelective має бути булевим значенням',
  }),
  maxStudents: Joi.number().integer().min(1).optional().allow(null).messages({
    'number.min': 'Максимальна кількість студентів має бути щонайменше 1',
    'number.base': 'Максимальна кількість студентів має бути числом',
  }),
  educationalProgramIds: Joi.array().items(Joi.string().uuid()).optional().messages({
    'array.base': 'Освітні програми мають бути масивом',
    'string.guid': 'Некоректний ID освітньої програми у масиві',
  }),
});

export const addDependencySchema = Joi.object({
  parentCourseId: Joi.string().uuid().required().messages({
    'any.required': 'ID батьківського курсу є обовʼязковим',
    'string.guid': 'Некоректний ID батьківського курсу',
  }),
  childCourseId: Joi.string().uuid().required().messages({
    'any.required': 'ID дочірнього курсу є обовʼязковим',
    'string.guid': 'Некоректний ID дочірнього курсу',
  }),
  weight: Joi.number().positive().required().messages({
    'any.required': 'Вага звʼязку є обовʼязковою',
    'number.positive': 'Вага звʼязку має бути додатним числом',
    'number.base': 'Вага звʼязку має бути числом',
  }),
});
