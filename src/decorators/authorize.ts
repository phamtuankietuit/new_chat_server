import 'reflect-metadata';
import { MetadataKeys } from '../utils/enums';

const Authorize = (permissions: string = '*'): MethodDecorator => {
  return (target, propertyKey) => {
    const controllerClass = target.constructor;
    Reflect.defineMetadata(
      MetadataKeys.AUTHORIZE,
      permissions,
      controllerClass
    );
  };
};

export default Authorize;
