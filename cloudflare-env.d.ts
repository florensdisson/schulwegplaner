declare namespace Cloudflare {
  interface Env {
    COORDINATOR_EMAIL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
