// src/config/multer.config.ts
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const multerConfig: MulterOptions = {
  // Storage in memory (for cloudinary upload)
  storage: diskStorage({
    destination: './uploads/temp',
    filename: (req, file, callback) => {
      const uniqueFileName = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueFileName);
    },
  }),
  fileFilter: (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return callback(
        new BadRequestException('Only image files are allowed!'),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max size
  },
};

// For memory storage (alternative approach)
export const multerMemoryConfig: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return callback(
        new BadRequestException('Only image files are allowed!'),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max size
  },
};

// Import this if you prefer memory storage
function memoryStorage() {
  return {
    _handleFile: (req, file, cb) => {
      // Read the file into buffer
      const chunks: Buffer[] = [];
      file.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.stream.on('end', () => {
        file.buffer = Buffer.concat(chunks);
        cb(null, { buffer: file.buffer });
      });
      file.stream.on('error', (err) => cb(err));
    },
    _removeFile: () => {
      // Nothing to do since file is in memory
    },
  };
}
