import express, { Request, Response } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors()); // Adicionar middleware CORS
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/parse-pdf', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  console.log('Received request to /api/parse-pdf');
  const filePath = req.file?.path;

  if (!filePath) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const dataBuffer = fs.readFileSync(filePath);

  try {
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Parse the text to extract relevant information
    const orderNumberMatch = text.match(/Order Number: (\d+)/);
    const visitDateMatch = text.match(/Visit Date: (\d{2}\/\d{2}\/\d{4})/);
    const visitTimeMatch = text.match(/Visit Time: (\d{2}:\d{2})/);
    const schoolMatch = text.match(/School: ([\w\s]+)/);

    const extractedData = {
      orderNumber: orderNumberMatch ? orderNumberMatch[1] : '',
      visitDate: visitDateMatch ? visitDateMatch[1] : '',
      visitTime: visitTimeMatch ? visitTimeMatch[1] : '',
      school: schoolMatch ? schoolMatch[1] : '',
    };

    res.json(extractedData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse PDF' });
  } finally {
    fs.unlinkSync(filePath); // Remove the uploaded file
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});