process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/returnsense_test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-value";
process.env.COOKIE_SECRET ??= "test-cookie-secret-value";
// base64 of a 32-byte key ("01234567890123456789012345678901")
process.env.ENCRYPTION_KEY ??= "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=";
process.env.SHOPIFY_API_SECRET ??= "test-shopify-secret";
