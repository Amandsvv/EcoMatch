import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { authMiddleware } from '../../lib/middleware';
import { AppError, ErrorCodes } from '../../lib/errors';
import { logger } from '../../lib/logger';


const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();
router.use(authMiddleware);

router.post('/', upload.single('photo'), async (req: any, res: any, next: any) => {
  try {
    if (!req.file) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'No file uploaded');
    }

    // Configure Cloudinary lazily to ensure environment variables are fully loaded
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });


    // Fallback if Cloudinary is not configured or uses placeholder
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUDINARY_CLOUD_NAME === 'your_cloudinary_cloud_name_here' ||
      !process.env.CLOUDINARY_API_KEY ||
      process.env.CLOUDINARY_API_KEY === 'your_cloudinary_api_key_here'
    ) {
      logger.warn('Cloudinary not configured. Returning fallback mock image URL.');
      // Return a nice, high-res Unsplash recycle image as fallback
      const dummyUrl = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=600';
      res.json({
        url: dummyUrl,
        publicId: 'dummy_id_placeholder',
      });
      return;
    }

    // Upload buffer to Cloudinary
    const uploadStream = (fileBuffer: Buffer) => {
      return new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'ecomatch' },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        stream.write(fileBuffer);
        stream.end();
      });
    };

    const result = await uploadStream(req.file.buffer);
    logger.info('File uploaded to Cloudinary successfully', {
      traceId: req.traceId,
      publicId: result.public_id,
      url: result.secure_url,
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
