import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export type PaginationPresenterProps = {
  currentPage: number;
  perPage: number;
  lastPage: number;
  total: number;
};

export class PaginationPresenter {
  @ApiProperty({ example: 1 })
  @Transform(({ value }) => parseInt(value))
  currentPage: number;
  @ApiProperty({ example: 15 })
  @Transform(({ value }) => parseInt(value))
  perPage: number;
  @ApiProperty({ example: 1 })
  @Transform(({ value }) => parseInt(value))
  lastPage: number;
  @ApiProperty({ example: 1 })
  @Transform(({ value }) => parseInt(value))
  total: number;

  constructor(props: PaginationPresenterProps) {
    this.currentPage = props.currentPage;
    this.perPage = props.perPage;
    this.lastPage = props.lastPage;
    this.total = props.total;
  }
}
