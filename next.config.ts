import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

// The project sits several levels under the user's home directory, which contains its own
// package-lock.json. Without an explicit root Turbopack walks up past the repo and warns that it
// is ignoring that lockfile. Pinning the root to this directory keeps inference inside the repo.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
