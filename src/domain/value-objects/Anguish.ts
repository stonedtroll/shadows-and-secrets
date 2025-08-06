import { AbstractValueObject } from './AbstractValueObject.js';

export interface AnguishProps {
  current: number;
  max: number;
}

export class Anguish extends AbstractValueObject<AnguishProps> {
  get current(): number {
    return this.props.current;
  }

  get max(): number {
    return this.props.max;
  }

  get percentage(): number {
    return this.max > 0 ? (this.current / this.max) * 100 : 0;
  }

  static create(props: AnguishProps): Anguish {
    if (props.current < 0) props.current = 0;
    if (props.current > props.max) props.current = props.max;
    if (props.max < 0) props.max = 0;
    
    return new Anguish(props);
  }

  updateValue(newValue: number): Anguish {
    return Anguish.create({
      current: newValue,
      max: this.max
    });
  }

  updateMax(newMax: number): Anguish {
    return Anguish.create({
      current: this.current,
      max: newMax
    });
  }
}