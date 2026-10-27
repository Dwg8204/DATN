import { ApplicationError } from '../errors/application.error';
export function assertPlacement(value: boolean | undefined, mode: string) {
  if (value && mode !== 'full')
    throw new ApplicationError(
      'PLACEMENT_FULL_REQUIRED',
      'Placement assessments must be full-skill tests.',
      400,
    );
  return value;
}
