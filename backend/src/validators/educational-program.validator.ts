import Joi from 'joi';

export const createProgramSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Назва освітньої програми є обовʼязковою',
    'string.empty': 'Назва освітньої програми не може бути порожньою',
  }),
  description: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Опис має бути рядком',
  }),
  totalCredits: Joi.number().positive().required().messages({
    'any.required': 'Загальна кількість кредитів є обовʼязковою',
    'number.positive': 'Загальна кількість кредитів має бути додатним числом',
    'number.base': 'Загальна кількість кредитів має бути числом',
  }),
  maxCreditsPerSem: Joi.number().positive().required().messages({
    'any.required': 'Максимальна кількість кредитів на семестр є обовʼязковою',
    'number.positive': 'Максимальна кількість кредитів на семестр має бути додатним числом',
    'number.base': 'Максимальна кількість кредитів на семестр має бути числом',
  }),
});

export const updateProgramSchema = Joi.object({
  name: Joi.string().optional().messages({
    'string.empty': 'Назва освітньої програми не може бути порожньою',
  }),
  description: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Опис має бути рядком',
  }),
  totalCredits: Joi.number().positive().optional().allow(null).messages({
    'number.positive': 'Загальна кількість кредитів має бути додатним числом',
    'number.base': 'Загальна кількість кредитів має бути числом',
  }),
  maxCreditsPerSem: Joi.number().positive().optional().allow(null).messages({
    'number.positive': 'Максимальна кількість кредитів на семестр має бути додатним числом',
    'number.base': 'Максимальна кількість кредитів на семестр має бути числом',
  }),
});

export const importProgramsSchema = Joi.object({
  educationalPrograms: Joi.array().items(
    Joi.object({
      name: Joi.string().required().messages({
        'any.required': 'Назва освітньої програми є обовʼязковою',
        'string.empty': 'Назва освітньої програми не може бути порожньою',
      }),
      totalCredits: Joi.number().positive().required().messages({
        'any.required': 'Загальна кількість кредитів є обовʼязковою',
        'number.positive': 'Загальна кількість кредитів має бути додатним числом',
        'number.base': 'Загальна кількість кредитів має бути числом',
      }),
      maxCreditsPerSem: Joi.number().positive().optional().messages({
        'number.positive': 'Максимальна кількість кредитів на семестр має бути додатним числом',
        'number.base': 'Максимальна кількість кредитів на семестр має бути числом',
      }),
      description: Joi.string().optional().allow(null, '').messages({
        'string.base': 'Опис має бути рядком',
      }),
    })
  ).min(1).required().messages({
    'any.required': 'Масив освітніх програм є обовʼязковим',
    'array.min': 'Масив освітніх програм не може бути порожнім',
    'array.base': 'Поле educationalPrograms має бути масивом',
  }),
});

