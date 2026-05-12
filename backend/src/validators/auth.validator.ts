import Joi from 'joi';

export const loginSchema = Joi.object({
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
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Введіть коректну електронну адресу',
    'any.required': 'Email є обовʼязковим',
  }),
});

export const confirmResetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.min': 'Пароль має містити щонайменше 8 символів',
      'string.pattern.base': 'Пароль має містити принаймні одну велику літеру, одну малу літеру, одну цифру та один спеціальний символ (@$!%*?&)',
      'any.required': 'Пароль є обовʼязковим',
    }),
});
