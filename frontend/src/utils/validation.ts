export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const EDUCATION_FORMS = [
  { value: 'FULL_TIME', label: 'Денна' },
  { value: 'DISTANCE', label: 'Заочна' },
  { value: 'EXTERN', label: 'Екстернат' },
];

export const validators = {
  email: (value: string) => 
    !value ? 'Email є обовʼязковим' : 
    !EMAIL_REGEX.test(value) ? 'Введіть коректну електронну адресу' : null,
  
  password: (value: string) => {
    if (!value) return 'Пароль є обовʼязковим';
    if (value.length < 8) return 'Пароль має містити щонайменше 8 символів';
    if (!PASSWORD_REGEX.test(value)) {
      return 'Пароль має містити принаймні одну велику літеру, одну малу літеру, одну цифру та один спеціальний символ (@$!%*?&)';
    }
    return null;
  },

  passwordOptional: (value: string) => {
    if (!value) return null;
    if (value.length < 8) return 'Пароль має містити щонайменше 8 символів';
    if (!PASSWORD_REGEX.test(value)) {
      return 'Пароль має містити принаймні одну велику літеру, одну малу літеру, одну цифру та один спеціальний символ (@$!%*?&)';
    }
    return null;
  },

  fullName: (value: string) => 
    !value ? 'ПІБ є обовʼязковим' : 
    value.length < 2 ? 'ПІБ має містити принаймні 2 символи' : null,

  required: (label: string) => (value: any) => !value ? `${label} є обовʼязковим` : null,
};
