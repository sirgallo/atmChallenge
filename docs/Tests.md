# Tests


## Test Suite
  
  - jest
  - ts-jest


## To run the tests

In the `root` of the folder (once an `npm install` or `npm ci` is performed):

`1.) build the project`
```bash
npm run build:all
```

`2.) run the tests`
```bash
npm run test
```

The scripts are defined in the `package.json` at the root of the folder.


tests can be run individually as well, again, from the root of the project:
```bash
npm run test tests/<test-to-run>.spec.ts
```

## Mock Data

The tests don't use a full mongo instance for db connections, but instead mock mongo using

```ts
import { MongoMemoryServer } from 'mongodb-memory-server';
```

The in-mem db can then be seeded and used with mock data, which is supplied under:
`@db/testUtils/LocalDbUtils.ts`


## Issues

1.) needed a work around for path aliases
2.) needed a work around for es modules (jest normally is using commonJs)

Fix: update the `jest.config.cjs` with following:

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/'}),
};
```