import { Column, ColumnOptions } from 'typeorm';

/**
 * Stores a float array as text so TypeORM can create the column with synchronize.
 * An OnModuleInit hook then ALTERs the column to vector(dims) for pgvector queries.
 */
export function VectorColumn(dims: number, options: ColumnOptions = {}): PropertyDecorator {
  void dims; // stored in column name convention; actual ALTER done in DocumentsService
  return Column({
    ...options,
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: number[] | null) =>
        value != null ? `[${value.join(',')}]` : null,
      from: (value: string | null) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as number[];
        } catch {
          return null;
        }
      },
    },
  });
}
