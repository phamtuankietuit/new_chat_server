import 'reflect-metadata';
import { MetadataKeys } from '../utils/enums';

const Authenticate = (permissions: string = '*'): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(MetadataKeys.AUTHENTICATE, permissions, target);
  };
};

export default Authenticate;
