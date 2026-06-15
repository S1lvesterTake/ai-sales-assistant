import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './flatten-validation-errors';

describe('flattenValidationErrors', () => {
  it('flattens nested validation fields', () => {
    const errors: ValidationError[] = [
      {
        property: 'profile',
        children: [
          {
            property: 'name',
            constraints: { isString: 'name must be a string' },
          },
        ],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'profile.name', message: 'name must be a string' },
    ]);
  });
});
