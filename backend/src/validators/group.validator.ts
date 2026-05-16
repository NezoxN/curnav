import Joi from 'joi';

export const createGroupSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Назва групи є обовʼязковою',
    'string.empty': 'Назва групи не може бути порожньою',
  }),
  educationalProgramId: Joi.string().uuid().required().messages({
    'any.required': 'ID освітньої програми є обовʼязковим',
    'string.guid': 'Некоректний ID освітньої програми',
  }),
  description: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Опис має бути рядком',
  }),
});

export const updateGroupSchema = Joi.object({
  name: Joi.string().optional().messages({
    'string.empty': 'Назва групи не може бути порожньою',
  }),
  educationalProgramId: Joi.string().uuid().optional().messages({
    'string.guid': 'Некоректний ID освітньої програми',
  }),
  description: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Опис має бути рядком',
  }),
});

export const importGroupsSchema = Joi.object({
  groups: Joi.array().items(
    Joi.object({
      name: Joi.string().required().messages({
        'any.required': 'Назва групи є обовʼязковою',
        'string.empty': 'Назва групи не може бути порожньою',
      }),
      educationalProgram: Joi.string().required().messages({
        'any.required': 'Назва освітньої програми є обовʼязковою',
        'string.empty': 'Назва освітньої програми не може бути порожньою',
      }),
      description: Joi.string().optional().allow(null, '').messages({
        'string.base': 'Опис має бути рядком',
      }),
    })
  ).min(1).required().messages({
    'any.required': 'Масив груп є обовʼязковим',
    'array.min': 'Масив груп не може бути порожнім',
    'array.base': 'Поле groups має бути масивом',
  }),
});

