import { ValidationError } from 'class-validator';
import { ApiFieldErrorDto } from '../dto/api-field-error.dto';

export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): ApiFieldErrorDto[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [
      ...ownErrors,
      ...flattenValidationErrors(error.children ?? [], field),
    ];
  });
}
