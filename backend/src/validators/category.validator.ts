import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Назва категорії є обовʼязковою',
    'string.empty': 'Назва категорії не може бути порожньою',
  }),
  description: Joi.string().allow('', null).optional().messages({
    'string.base': 'Опис категорії має бути текстом',
  }),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Назва категорії є обовʼязковою',
    'string.empty': 'Назва категорії не може бути порожньою',
  }),
  description: Joi.string().allow('', null).optional().messages({
    'string.base': 'Опис категорії має бути текстом',
  }),
});
