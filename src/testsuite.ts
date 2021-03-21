export type Test<FinalFixture> = {
  title: string;
  subTests?: Test<FinalFixture>[];
  test?: (fixture: FinalFixture) => Promise<void>;
};

export type TestToRun = {
  title: string;
  subTests?: TestToRun[];
  test?: () => Promise<void>;
};

export type TestSuiteFunc<T, U> = (config: {
  describe(
    title: string,
    func: (
      func: (title: string, test: (obj: T) => Promise<void>) => Promise<void>
    ) => void
  ): void;
  it(title: string, test: (obj: T) => Promise<void>): void;
  options: U;
}) => void;

function recurse(test: TestToRun) {
  if (test.subTests) {
    describe(test.title, function () {
      if (test.subTests) {
        for (const subTest of test.subTests) {
          recurse(subTest);
        }
      }
    });
  } else {
    it(test.title, test.test);
  }
}

export class TestSuite<
  Fixture,
  Options extends Record<string, unknown>,
  FinalFixture
> {
  private func: TestSuiteFunc<FinalFixture, Options>;
  private transform: (fixture: Fixture) => Promise<FinalFixture>;
  constructor(func: TestSuiteFunc<FinalFixture, Options>);
  constructor(
    transform: (fixture: Fixture) => Promise<FinalFixture>,
    func: TestSuiteFunc<FinalFixture, Options>
  );
  constructor(
    transform:
      | ((fixture: Fixture) => Promise<FinalFixture>)
      | TestSuiteFunc<FinalFixture, Options>,
    func?: TestSuiteFunc<FinalFixture, Options>
  ) {
    if (func) {
      this.func = func;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.transform = transform as any;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.func = transform as any;
      this.transform = async (f: Fixture) => (f as unknown) as FinalFixture;
    }
  }

  generateTests(fixture: () => Promise<Fixture>): TestToRun[];
  generateTests(options: Options, fixture: () => Promise<Fixture>): TestToRun[];
  generateTests(
    options: Options | (() => Promise<Fixture>),
    fixture?: () => Promise<Fixture>
  ): TestToRun[] {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    let actualFixture: () => Promise<Fixture>;
    let actualOptions: Options = {} as Options;
    if (typeof options === 'object') {
      actualOptions = {...options};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actualFixture = fixture as any;
    } else {
      actualFixture = options;
    }

    const tests: TestToRun[] = [];

    function describe(
      title: string,
      func: (
        func: (
          title: string,
          test: (fixture: FinalFixture) => Promise<void>
        ) => Promise<void>
      ) => void
    ): void {
      const subTests: TestToRun[] = [];
      func(
        async (
          title: string,
          test: (fixture: FinalFixture) => Promise<void>
        ) => {
          subTests.push({
            title,
            test: async () => {
              const obj = await actualFixture();
              const finalObj = await self.transform(obj);
              return test(finalObj);
            },
          });
        }
      );
      tests.push({title, subTests});
    }

    function it(
      title: string,
      test: (fixture: FinalFixture) => Promise<void>
    ): void {
      tests.push({
        title,
        test: async () => {
          const obj = await actualFixture();
          const finalObj = await self.transform(obj);
          return test(finalObj);
        },
      });
    }

    this.func({describe, it, options: actualOptions});

    return tests;
  }

  runMochaTests(
    title: string,
    options: Options,
    fixture: () => Promise<Fixture>
  ): void;
  runMochaTests(
    title: string,
    options: Options | (() => Promise<Fixture>),
    fixture?: () => Promise<Fixture>
  ): void {
    let actualFixture: () => Promise<Fixture>;
    let actualOptions: Options = {} as Options;
    if (typeof options === 'object') {
      actualOptions = {...options};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actualFixture = fixture as any;
    } else {
      actualFixture = options;
    }
    const tests = this.generateTests(actualOptions, actualFixture);
    describe(title, function () {
      for (const test of tests) {
        recurse(test);
      }
    });
  }
}
