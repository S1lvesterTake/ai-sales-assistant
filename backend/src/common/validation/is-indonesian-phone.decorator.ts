import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isIndonesianPhone } from '../utils/indonesian-phone';

const validator: ValidatorConstraintInterface = {
  validate: isIndonesianPhone,
  defaultMessage: () =>
    'whatsappNumber must be a valid Indonesian number in 08, 628, or +628 format',
};

export function IsIndonesianPhone(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isIndonesianPhone',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator,
    });
  };
}
