import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';

export const validate = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      errors: {
        label: 'key',
      },
    });

    if (error) {
      const errorMessage = error.details
        .map((details) => details.message.replace(/"/g, ''))
        .join(', ');
      
      return res.status(400).json({
        status: 'error',
        message: errorMessage,
      });
    }

    next();
  };
};
