import {
  InvalidIndonesianPhoneError,
  isIndonesianPhone,
  normalizeIndonesianPhone,
} from './indonesian-phone';

describe('Indonesian phone normalization', () => {
  it.each([
    ['0812 3456 7890', '6281234567890'],
    ['0812-3456-7890', '6281234567890'],
    ['(0812) 3456.7890', '6281234567890'],
    ['6281234567890', '6281234567890'],
    ['+6281234567890', '6281234567890'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeIndonesianPhone(input)).toBe(expected);
  });

  it.each([
    '',
    '81234567890',
    '+081234567890',
    '628123',
    '62812345678901234',
    '62abc12345678',
    '++6281234567890',
    '62812/345/67890',
  ])('rejects %s', (input) => {
    expect(() => normalizeIndonesianPhone(input)).toThrow(
      InvalidIndonesianPhoneError,
    );
    expect(isIndonesianPhone(input)).toBe(false);
  });
});
