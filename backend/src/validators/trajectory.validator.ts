import Joi from 'joi';

export const generateTrajectorySchema = Joi.object({
  targetSemester: Joi.number().integer().min(1).max(12).required().messages({
    'any.required': 'Цільовий семестр є обовʼязковим',
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
  }),
});


export const submitTrajectorySchema = Joi.object({
  courseIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'any.required': 'Масив ID дисциплін є обовʼязковим',
    'array.min': 'Необхідно обрати хоча б одну дисципліну',
    'array.base': 'Поле courseIds має бути масивом',
    'string.guid': 'Некоректний ID дисципліни у масиві',
  }),
  semester: Joi.number().integer().min(1).max(12).required().messages({
    'any.required': 'Семестр є обовʼязковим',
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
  }),
});

export const rejectTrajectorySchema = Joi.object({
  reason: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Причина відхилення має бути рядком',
  }),
});


export const forceSubmitTrajectorySchema = Joi.object({
  studentId: Joi.string().uuid().required().messages({
    'any.required': 'ID студента є обовʼязковим',
    'string.guid': 'Некоректний ID студента',
  }),
  courseIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'any.required': 'Масив ID дисциплін є обовʼязковим',
    'array.min': 'Необхідно обрати хоча б одну дисципліну',
    'array.base': 'Поле courseIds має бути масивом',
    'string.guid': 'Некоректний ID дисципліни у масиві',
  }),
  semester: Joi.number().integer().min(1).max(12).required().messages({
    'any.required': 'Семестр є обовʼязковим',
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
  }),
});
