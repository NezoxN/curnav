import Joi from 'joi';

export const updateGlobalSettingsSchema = Joi.object({
  isSelectionOpen: Joi.boolean().optional().messages({
    'boolean.base': 'Поле isSelectionOpen має бути булевим значенням',
  })
});
