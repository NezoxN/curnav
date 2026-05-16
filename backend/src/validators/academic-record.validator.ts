import Joi from 'joi';

export const createRecordSchema = Joi.object({
  studentId: Joi.string().uuid().required().messages({
    'any.required': 'ID студента є обовʼязковим',
    'string.guid': 'Некоректний ID студента',
  }),
  courseId: Joi.string().uuid().required().messages({
    'any.required': 'ID дисципліни є обовʼязковим',
    'string.guid': 'Некоректний ID дисципліни',
  }),
  gradeValue: Joi.number().min(0).max(100).required().messages({
    'any.required': 'Оцінка є обовʼязковою',
    'number.min': 'Оцінка має бути від 0 до 100',
    'number.max': 'Оцінка має бути від 0 до 100',
    'number.base': 'Оцінка має бути числом',
  }),
  semesterCompleted: Joi.number().integer().min(1).max(12).required().messages({
    'any.required': 'Семестр завершення є обовʼязковим',
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
  }),
  assessmentName: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Назва контрольного заходу має бути рядком',
  }),
});

export const updateRecordSchema = Joi.object({
  gradeValue: Joi.number().min(0).max(100).optional().messages({
    'number.min': 'Оцінка має бути від 0 до 100',
    'number.max': 'Оцінка має бути від 0 до 100',
    'number.base': 'Оцінка має бути числом',
  }),
  semesterCompleted: Joi.number().integer().min(1).max(12).optional().messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
  }),
  assessmentName: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Назва контрольного заходу має бути рядком',
  }),
});
