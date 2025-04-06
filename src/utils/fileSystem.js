import fs from 'fs';
import path from 'path';

export const ensureDirectoriesExist = () => {
  const directories = [
    'public',
    'public/temp'
  ];
  
  directories.forEach(dir => {
    const fullPath = path.resolve(dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Created directory: ${fullPath}`);
    }
  });
};