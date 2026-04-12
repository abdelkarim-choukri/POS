// apps/backend/src/modules/business/upload.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

const UPLOAD_DIR = 'uploads/products';

// Ensure upload folder exists on startup
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller('business')
@Roles('owner', 'manager')
@UseGuards(RolesGuard)
export class UploadController {
  @Post('upload/product-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (_req, file, cb) => {
        const allowed = /image\/(jpeg|jpg|png|webp)/;
        if (!allowed.test(file.mimetype)) {
          return cb(new BadRequestException('Only JPG, PNG, and WEBP images are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    // Return the public URL — main.ts serves /uploads/* as static files
    return { url: `/uploads/products/${file.filename}` };
  }
}