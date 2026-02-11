/**
 * Global setup for Jest: guards against running tests on a production database.
 * Referenced in jest.config.js as `globalSetup`.
 *
 * FINDING-016: Prevents accidental data loss by requiring DATABASE_URL to contain "test".
 */
export default async function globalSetup(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? '';

  if (!dbUrl.includes('test')) {
    console.error(
      'FATAL: Tests must use a test database. DATABASE_URL must contain "test".',
    );
    console.error(
      `Current DATABASE_URL: ${dbUrl ? dbUrl.replace(/\/\/.*@/, '//<credentials>@') : '(not set)'}`,
    );
    console.error('Aborting to prevent data loss.');
    process.exit(1);
  }
}
