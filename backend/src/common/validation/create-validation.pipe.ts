import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

function flattenErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap(error => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const label = error.property.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
    const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
    const ownErrors = Object.entries(error.constraints ?? {}).map(([constraint, message]) => ({
      field,
      code: constraint.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),
      message: constraint === 'whitelistValidation'
        ? `${displayLabel} is not an accepted field.`
        : constraint === 'matches' && message.includes('regular expression')
          ? `${displayLabel} has an invalid format.`
          : message.startsWith(error.property)
            ? `${displayLabel}${message.slice(error.property.length)}`
            : message,
    }));
    return [...ownErrors, ...flattenErrors(error.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
    exceptionFactory: errors => {
      const fieldErrors = flattenErrors(errors);
      return new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: fieldErrors[0]?.message ?? 'Please check the information you entered.',
        fieldErrors,
      });
    },
  });
}
