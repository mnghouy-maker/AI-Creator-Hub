/**
 * A Nest pipe that validates request bodies against a Zod schema.
 *
 * Why Zod (not class-validator): our DTO shapes are shared with the frontend via
 * @hub/shared-style schemas, and Zod gives us one validation language across the
 * stack. Invalid input becomes a clean 400 with field-level messages
 * (Architecture §6: validate every request body).
 */
import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    return result.data;
  }
}
