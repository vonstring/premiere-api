import { Request, Response } from 'express';
import { FileResult } from 'tmp-promise';
const tmp = require('tmp-promise');
const express = require('express');
const multer = require('multer');
import { fs, path } from '../lib/cep/node';
import { evalTS, posix } from '../lib/utils/bolt';

const router = express.Router();

interface UploadStatus {
  status: 'pending' | 'completed';
  progress: number;
  fileName: string | null;
}

// In-memory storage for tracking upload status and progress
const uploadStatus: { [id: string]: UploadStatus } = {};

// Create a temporary directory for multer uploads
const uploadTempDir = tmp.dirSync({ unsafeCleanup: true });

const storage = multer.diskStorage({
  destination: uploadTempDir.name,
  filename: function (req: Express.Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) {
    const originalName = file.originalname;
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    callback(null, uniqueSuffix + extension);
  },
});

// Configure multer to use the temporary directory
const upload = multer({ storage });

// Route for creating an upload job
router.post('/', async (_req: Request, res: Response) => {
  try {
    // Generate a random 10-letter ID
    const id = generateId(10);

    // Store the ID and set initial status as 'pending'
    uploadStatus[id] = { status: 'pending', progress: 0, fileName: null };
    
    // Return the generated ID
    res.json({ id });
  } catch (error) {
    console.error('Error creating upload job:', error);
    res.status(500).json({ error: 'Failed to create upload job.' });
  }
});

// Route for accepting the file and storing it using the ID
router.post('/:id', upload.single('file'), async (req: Request, res: Response) => {
  const id = req.params.id;
  // @ts-ignore
  const file = req.file;
  if (!file?.path) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    // Check if the upload job exists
    if (!uploadStatus[id] || uploadStatus[id].status !== 'pending') {
      return res.status(404).json({ error: 'Upload job not found or invalid status.' });
    }

    // Update the upload status to 'completed'
    uploadStatus[id].status = 'completed';
    // Store the file name in the upload status
    uploadStatus[id].fileName = file.path;

    const sequenceID = await evalTS('importToNewSequence', file.path, path.basename(file.path));

    res.json({ message: 'File uploaded successfully.', sequenceID });
  } catch (error) {
    console.error('Error accepting file:', error);
    res.status(500).json({ error: 'Failed to accept file.' });
  }
});

// Route for checking the status of the upload
router.get('/:id/status', (req: Request, res: Response) => {
  const id = req.params.id;

  // Check if the upload job exists
  if (!uploadStatus[id]) {
    return res.status(404).json({ error: 'Upload job not found.' });
  }

  res.json(uploadStatus[id]);
});

// Helper function to generate a random ID
function generateId(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let id = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    id += characters[randomIndex];
  }
  return id;
}

export default router;
