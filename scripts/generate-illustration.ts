import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { fileURLToPath } from 'url';

const COMFYUI_HOST = 'localhost';
const COMFYUI_PORT = 8188;

function buildFluxWorkflow(prompt: string): Record<string, unknown> {
  return {
    '6': {
      inputs: {
        text: prompt,
        clip: ['32', 0],
      },
      class_type: 'CLIPTextEncode',
    },
    '8': {
      inputs: {
        samples: ['31', 0],
        vae: ['33', 0],
      },
      class_type: 'VAEDecode',
    },
    '9': {
      inputs: {
        filename_prefix: 'ai-novels',
        images: ['8', 0],
      },
      class_type: 'SaveImage',
    },
    '27': {
      inputs: {
        width: 1024,
        height: 576,
        batch_size: 1,
      },
      class_type: 'EmptySD3LatentImage',
    },
    '30': {
      inputs: {
        unet_name: 'flux1-schnell-Q4_K_S.gguf',
      },
      class_type: 'UnetLoaderGGUF',
    },
    '31': {
      inputs: {
        model: ['30', 0],
        positive: ['6', 0],
        negative: ['34', 0],
        latent_image: ['27', 0],
        seed: Math.floor(Math.random() * 1000000000),
        steps: 4,
        cfg: 1,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1,
      },
      class_type: 'KSampler',
    },
    '34': {
      inputs: {
        text: '',
        clip: ['32', 0],
      },
      class_type: 'CLIPTextEncode',
    },
    '32': {
      inputs: {
        clip_name1: 'clip_l.safetensors',
        clip_name2: 't5xxl_fp8_e4m3fn.safetensors',
        type: 'flux',
      },
      class_type: 'DualCLIPLoader',
    },
    '33': {
      inputs: {
        vae_name: 'ae.safetensors',
      },
      class_type: 'VAELoader',
    },
  };
}

function httpPost(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: parseInt(urlObj.port),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: parseInt(urlObj.port),
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'GET',
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpGetBinary(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: parseInt(urlObj.port),
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'GET',
    };
    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chapterToIllustrationPrompt(chapterContent: string, genre: string): string {
  // Extract the first 500 chars of content for scene description
  const plainText = chapterContent
    .replace(/^#+\s+.+$/gm, '')
    .replace(/\* \* \*/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 500);

  const genreStyle: Record<string, string> = {
    sf: 'science fiction, space, futuristic, cinematic lighting',
    fantasy: 'fantasy art, magical, ethereal glow, detailed illustration',
    'slice-of-life': 'warm cozy atmosphere, soft lighting, japanese cafe, gentle colors',
    mystery: 'dark moody atmosphere, suspenseful, dramatic shadows',
    romance: 'romantic soft light, pastel colors, emotional',
    horror: 'dark, eerie, atmospheric horror, dim lighting',
  };

  const style = genreStyle[genre] || 'illustration, detailed, high quality';
  return `${plainText}, ${style}, anime style, beautiful composition, 16:9 aspect ratio`;
}

async function generateIllustration(
  novelSlug: string,
  chapterNumber: number,
  chapterContent: string,
  genre: string
): Promise<string> {
  const prompt = chapterToIllustrationPrompt(chapterContent, genre);
  const workflow = buildFluxWorkflow(prompt);

  console.log(`Queuing ComfyUI job for ${novelSlug} chapter ${chapterNumber}...`);

  // Queue the prompt
  const queueBody = JSON.stringify({ prompt: workflow });
  const queueResult = JSON.parse(
    await httpPost(`http://${COMFYUI_HOST}:${COMFYUI_PORT}/prompt`, queueBody)
  );

  const promptId: string = queueResult.prompt_id;
  if (!promptId) {
    throw new Error(`ComfyUI queue failed: ${JSON.stringify(queueResult)}`);
  }

  console.log(`ComfyUI prompt_id: ${promptId}, polling for result...`);

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await sleep(3000);
    attempts++;

    const historyRaw = await httpGet(
      `http://${COMFYUI_HOST}:${COMFYUI_PORT}/history/${promptId}`
    );
    const history = JSON.parse(historyRaw);

    if (history[promptId]?.status?.completed) {
      const outputs = history[promptId].outputs;
      // Find the SaveImage node output
      const imageNode = Object.values(outputs).find(
        (o: unknown) => (o as Record<string, unknown>).images
      ) as { images: { filename: string; subfolder: string; type: string }[] } | undefined;

      if (!imageNode?.images?.length) {
        throw new Error('No images in ComfyUI output');
      }

      const imageInfo = imageNode.images[0];
      const imageUrl = `http://${COMFYUI_HOST}:${COMFYUI_PORT}/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder)}&type=${imageInfo.type}`;

      // Download the image
      const imageBuffer = await httpGetBinary(imageUrl);

      // Save to public/illustrations/
      const outputDir = path.resolve(
        __dirname,
        `../frontend/public/illustrations/${novelSlug}`
      );
      fs.mkdirSync(outputDir, { recursive: true });

      const outputPath = path.join(outputDir, `ch${chapterNumber}-scene.jpg`);
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`Illustration saved: ${outputPath}`);
      return outputPath;
    }

    if (attempts % 10 === 0) {
      console.log(`Still waiting... (${attempts * 3}s elapsed)`);
    }
  }

  throw new Error('ComfyUI generation timed out after 3 minutes');
}

async function main() {
  const args = process.argv.slice(2);
  const novelSlug = args[0];
  const chapterNumber = args[1] ? parseInt(args[1], 10) : undefined;

  if (!novelSlug || !chapterNumber) {
    console.error(
      'Usage: tsx scripts/generate-illustration.ts <novel-slug> <chapter-number>'
    );
    process.exit(1);
  }

  const novelsPath = path.resolve(__dirname, '../frontend/data/novels.json');
  const novels = JSON.parse(fs.readFileSync(novelsPath, 'utf-8'));
  const novel = novels.find((n: { slug: string }) => n.slug === novelSlug);

  if (!novel) {
    console.error(`Novel not found: ${novelSlug}`);
    process.exit(1);
  }

  const chaptersPath = path.resolve(
    __dirname,
    `../frontend/data/chapters/${novelSlug}.json`
  );
  if (!fs.existsSync(chaptersPath)) {
    console.error(`Chapters file not found: ${chaptersPath}`);
    process.exit(1);
  }

  const chapters = JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'));
  const chapter = chapters.find((c: { number: number }) => c.number === chapterNumber);

  if (!chapter) {
    console.error(`Chapter ${chapterNumber} not found in ${chaptersPath}`);
    process.exit(1);
  }

  await generateIllustration(novelSlug, chapterNumber, chapter.content, novel.genre);
}

const isMain =
  typeof import.meta !== 'undefined' && import.meta.url
    ? fileURLToPath(import.meta.url) === process.argv[1]
    : require.main === module;

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { generateIllustration, chapterToIllustrationPrompt };
